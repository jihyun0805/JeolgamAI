import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { validateK8sLive } from "@/lib/integration-validators";
import { IntegrationConfig } from "@/lib/types";
import {
  addAuditEvent,
  addNotification,
  createId,
  maskSecret,
  nowIso,
  upsertIntegration,
} from "@/lib/store";

interface K8sIntegrationBody {
  name?: string;
  apiServerUrl?: string;
  token?: string;
  clusterName?: string;
}

export async function POST(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) {
    if (auth.session) {
      addAuditEvent({
        actor: auth.session.userId,
        actorRole: auth.session.role,
        action: "integration.create",
        targetType: "integration",
        targetId: "k8s",
        result: "forbidden",
      });
    }
    return auth.response;
  }

  const body = (await request.json()) as K8sIntegrationBody;

  if (!body.apiServerUrl || !body.token) {
    return fail(
      "VALIDATION_ERROR",
      "apiServerUrl과 token은 필수입니다.",
      400,
    );
  }

  const liveValidation = await validateK8sLive({
    apiServerUrl: body.apiServerUrl,
    token: body.token,
  });

  const readonly =
    body.token.toLowerCase().includes("readonly") || body.token.length >= 24;

  const missingPermissions =
    liveValidation?.checks
      .filter((item) => !item.passed)
      .map((item) => item.key) ??
    (readonly
      ? []
      : ["pods:list", "nodes:list", "namespaces:list", "resourcequotas:list"]);

  const now = nowIso();
  const integration: IntegrationConfig = {
    id: createId("int_k8s"),
    type: "k8s",
    name: body.name || body.clusterName || "Kubernetes Cluster",
    status: liveValidation?.status ?? (readonly ? "active" : "partial"),
    workspaceId: auth.session.workspaceId,
    connectedAt: now,
    validatedAt: now,
    meta: {
      apiServerUrl: body.apiServerUrl,
      clusterName: body.clusterName ?? "",
      token: maskSecret(body.token),
      validationMode: liveValidation?.mode ?? "mock",
      validation:
        liveValidation?.checks
          .map((item) => `${item.key}:${item.passed ? "ok" : "fail"}`)
          .join(", ") ??
        (readonly
          ? "Read-only RBAC validation passed"
          : "Partial: missing recommended RBAC permissions"),
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
      provider: "k8s",
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
      ? "Kubernetes 연동이 완료되었습니다"
      : integration.status === "partial"
        ? "Kubernetes 연동이 부분 완료되었습니다"
        : "Kubernetes 연동 검증에 실패했습니다",
    body: integration.status === "active"
      ? `${integration.name} 연동 성공`
      : `누락 권한: ${missingPermissions.join(", ")}`,
  });

  return ok({
    integration,
    missingPermissions,
    checks: liveValidation?.checks ?? [],
  });
}
