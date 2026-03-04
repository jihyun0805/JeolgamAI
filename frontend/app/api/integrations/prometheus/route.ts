import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { validatePrometheusLive } from "@/lib/integration-validators";
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
  token?: string;
  enabledQueries?: string[];
}

const REQUIRED_QUERIES = [
  "cpu_usage",
  "memory_usage",
  "error_rate",
  "latency",
];

export async function POST(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) {
    if (auth.session) {
      addAuditEvent({
        actor: auth.session.userId,
        actorRole: auth.session.role,
        action: "integration.create",
        targetType: "integration",
        targetId: "prometheus",
        result: "forbidden",
      });
    }
    return auth.response;
  }

  const body = (await request.json()) as PrometheusIntegrationBody;

  if (!body.baseUrl || !body.token) {
    return fail("VALIDATION_ERROR", "baseUrl과 token은 필수입니다.", 400);
  }

  const enabled = new Set(body.enabledQueries ?? REQUIRED_QUERIES);
  const unsupported = REQUIRED_QUERIES.filter((query) => !enabled.has(query));
  const liveValidation = await validatePrometheusLive({
    baseUrl: body.baseUrl,
    token: body.token,
    requiredQueries: REQUIRED_QUERIES,
  });

  const liveUnsupported =
    liveValidation?.checks.filter((item) => !item.passed).map((item) => item.key) ??
    [];
  const unsupportedEffective =
    liveUnsupported.length > 0 ? liveUnsupported : unsupported;
  const partial =
    liveValidation?.status === "partial" ||
    (!liveValidation && unsupportedEffective.length > 0);

  const now = nowIso();
  const integration: IntegrationConfig = {
    id: createId("int_prom"),
    type: "prometheus",
    name: body.name || "Prometheus",
    status: liveValidation?.status ?? (partial ? "partial" : "active"),
    workspaceId: auth.session.workspaceId,
    connectedAt: now,
    validatedAt: now,
    meta: {
      baseUrl: body.baseUrl,
      token: maskSecret(body.token),
      validationMode: liveValidation?.mode ?? "mock",
      validation:
        liveValidation?.checks
          .map((item) => `${item.key}:${item.passed ? "ok" : "fail"}`)
          .join(", ") ??
        (partial
          ? `Partial support: ${unsupportedEffective.join(", ")}`
          : "All required metric queries available"),
    },
  };

  upsertIntegration(integration);

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    action: "integration.create",
    targetType: "integration",
    targetId: integration.id,
    result: "success",
    metadata: {
      provider: "prometheus",
      status: integration.status,
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
      ? `${integration.name} metric queries passed`
      : `미지원 쿼리: ${unsupportedEffective.join(", ")}`,
  });

  return ok({
    integration,
    unsupportedQueries: unsupportedEffective,
    checks: liveValidation?.checks ?? [],
  });
}
