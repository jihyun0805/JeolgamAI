import { ok } from "@/lib/api-response";
import { requireBackendSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";
import { getIntegrations, getProjectById } from "@/lib/store";

interface BackendConnectorStatus {
  workspaceId: string;
  aws: boolean;
  k8s: boolean;
  prometheus: boolean;
}

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

  return ok({
    workspaceId: auth.session.workspaceId,
    project: getProjectById(auth.session.workspaceId),
    integrations: integrations.map((integration) => ({
      ...integration,
      backendRegistered: backendCoverage[integration.type],
    })),
    localCoverage,
    backendCoverage,
    coverage: {
      aws: localCoverage.aws && backendCoverage.aws,
      k8s: localCoverage.k8s && backendCoverage.k8s,
      prometheus: localCoverage.prometheus && backendCoverage.prometheus,
    },
    warnings,
  });
}
