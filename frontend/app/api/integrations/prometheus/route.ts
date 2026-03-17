import { fail, ok } from "@/lib/api-response";
import { requireBackendRole } from "@/lib/auth";
import { postBackendJson } from "@/lib/backend-client";
import { IntegrationConfig } from "@/lib/types";
import {
  addAuditEvent,
  addNotification,
  createId,
  maskSecret,
  nowIso,
  upsertIntegration,
} from "@/lib/store";

interface PrometheusIntegrationBody {
  name?: string;
  baseUrl?: string;
  authMode?: "basic" | "bearer";
  username?: string;
  password?: string;
  token?: string;
}

interface ValidationCheck {
  key: string;
  passed: boolean;
  message: string;
}

interface BackendPrometheusValidationResponse {
  mode: "live";
  status: "active" | "partial" | "failed";
  checks: ValidationCheck[];
}

export async function POST(request: Request) {
  const auth = requireBackendRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) {
    if (auth.session) {
      addAuditEvent({
        actor: auth.session.userId,
        actorRole: auth.session.role,
        workspaceId: auth.session.workspaceId,
        action: "integration.create",
        targetType: "integration",
        targetId: "prometheus",
        result: "forbidden",
      });
    }
    return auth.response;
  }

  const body = (await request.json()) as PrometheusIntegrationBody;
  const authMode = body.authMode ?? "basic";

  if (!body.baseUrl) {
    return fail("VALIDATION_ERROR", "baseUrl은 필수입니다.", 400);
  }

  if (authMode === "basic" && (!body.username || !body.password)) {
    return fail("VALIDATION_ERROR", "basic 인증은 username과 password가 필요합니다.", 400);
  }

  if (authMode === "bearer" && !body.token) {
    return fail("VALIDATION_ERROR", "bearer 인증은 token이 필요합니다.", 400);
  }

  let validation: BackendPrometheusValidationResponse;
  try {
    validation = await postBackendJson<BackendPrometheusValidationResponse>(
      "/api/integrations/prometheus/validate",
      {
        workspaceId: auth.session.workspaceId,
        baseUrl: body.baseUrl,
        authMode,
        username: body.username,
        password: body.password,
        token: body.token,
      },
      { accessToken: auth.session.backendAccessToken },
    );
  } catch (error) {
    return fail(
      "BACKEND_VALIDATION_FAILED",
      error instanceof Error
        ? error.message
        : "Prometheus backend 검증에 실패했습니다.",
      400,
    );
  }

  const unsupportedQueries = validation.checks
    .filter((item) => !item.passed)
    .map((item) => item.key);

  const now = nowIso();
  const integration: IntegrationConfig = {
    id: createId("int_prom"),
    type: "prometheus",
    name: body.name || "Prometheus",
    status: validation.status,
    workspaceId: auth.session.workspaceId,
    connectedAt: now,
    validatedAt: now,
    meta: {
      baseUrl: body.baseUrl,
      authMode,
      username: body.username ? maskSecret(body.username) : "",
      password: body.password ? maskSecret(body.password) : "",
      token: body.token ? maskSecret(body.token) : "",
      validationMode: validation.mode,
      validation:
        validation.checks
          .map((item) => `${item.key}:${item.passed ? "ok" : "fail"}`)
          .join(", "),
    },
  };

  upsertIntegration(integration);

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    workspaceId: auth.session.workspaceId,
    action: "integration.create",
    targetType: "integration",
    targetId: integration.id,
    result: "success",
    metadata: {
      provider: "prometheus",
      status: integration.status,
      authMode,
    },
  });

  addNotification({
    workspaceId: integration.workspaceId,
    severity:
      integration.status === "active"
        ? "info"
        : integration.status === "partial"
          ? "warning"
          : "critical",
    title: integration.status === "active"
      ? "Prometheus 연동이 완료되었습니다"
      : integration.status === "partial"
      ? "Prometheus 연동이 부분 완료되었습니다"
      : "Prometheus 연동 검증에 실패했습니다",
    body: integration.status === "active"
      ? `${integration.name} (${authMode}) metric queries passed`
      : `실패한 쿼리: ${unsupportedQueries.join(", ")}`,
  });

  return ok({
    integration,
    unsupportedQueries,
    checks: validation.checks,
  });
}
