import { ok } from "@/lib/api-response";
import { requireBackendSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";
import { getIntegrations, getProjectById } from "@/lib/store";
import { IntegrationType } from "@/lib/types";

interface BackendConnectorStatus {
  workspaceId: string;
  aws: boolean;
  k8s: boolean;
  prometheus: boolean;
}

const INTEGRATION_TYPES: IntegrationType[] = ["aws", "k8s", "prometheus"];

const FALLBACK_INTEGRATION_NAMES: Record<IntegrationType, string> = {
  aws: "AWS",
  k8s: "Kubernetes",
  prometheus: "Prometheus",
};

export async function GET(request: Request) {
  const auth = requireBackendSession(request);
  if (!auth.ok) return auth.response;

  const integrations = getIntegrations(auth.session.workspaceId);
  const localCoverage = {
    aws: integrations.some((item) => item.type === "aws" && item.status !== "failed"),
    k8s: integrations.some((item) => item.type === "k8s" && item.status !== "failed"),
    prometheus: integrations.some((item) => item.type === "prometheus" && item.status !== "failed"),
  };
  let backendCoverage = {
    aws: false,
    k8s: false,
    prometheus: false,
  };
  const warnings: string[] = [];

  try {
    const status = await getBackendJson<BackendConnectorStatus>(
      `/api/integrations/connectors/status?workspaceId=${encodeURIComponent(auth.session.workspaceId)}`,
      { accessToken: auth.session.backendAccessToken },
    );
    backendCoverage = {
      aws: Boolean(status.aws),
      k8s: Boolean(status.k8s),
      prometheus: Boolean(status.prometheus),
    };
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `backend connector 상태를 확인하지 못했습니다: ${error.message}`
        : "backend connector 상태를 확인하지 못했습니다.",
    );
  }

  const integrationsByType = new Map(
    integrations.map((integration) => [integration.type, integration] as const),
  );

  const mergedIntegrations = INTEGRATION_TYPES.flatMap((type) => {
    const existing = integrationsByType.get(type);
    if (existing) {
      return [
        {
          ...existing,
          backendRegistered: backendCoverage[type],
        },
      ];
    }

    if (!backendCoverage[type]) {
      return [];
    }

    return [
      {
        id: `backend_${type}_${auth.session.workspaceId}`,
        type,
        name: FALLBACK_INTEGRATION_NAMES[type],
        status: "active" as const,
        workspaceId: auth.session.workspaceId,
        connectedAt: new Date(0).toISOString(),
        validatedAt: new Date(0).toISOString(),
        meta: {},
        backendRegistered: true,
      },
    ];
  });

  return ok({
    workspaceId: auth.session.workspaceId,
    project: getProjectById(auth.session.workspaceId),
    integrations: mergedIntegrations,
    localCoverage,
    backendCoverage,
    coverage: backendCoverage,
    warnings,
  });
}
