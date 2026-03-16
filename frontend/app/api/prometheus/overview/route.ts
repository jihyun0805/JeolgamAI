import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";
import {
  getIntegrations,
  getProjectById,
} from "@/lib/store";

interface BackendPrometheusOverview {
  mode: "live";
  workspaceId: string;
  baseUrl: string;
  authMode: "basic" | "bearer";
  summary: {
    cpuUsagePercent: number;
    memoryUsagePercent: number;
    p95LatencyMs: number;
    errorRatePercent: number;
    scrapeHealthPercent: number;
  };
  series: {
    cpuUsage: Array<{ label: string; value: number }>;
    memoryUsage: Array<{ label: string; value: number }>;
    latencyMs: Array<{ label: string; value: number }>;
    errorRatePercent: Array<{ label: string; value: number }>;
  };
  timeRange: {
    from: string;
    to: string;
    stepSeconds: number;
  };
  warnings: string[];
}

interface BackendAnalysisLatest {
  analysis: {
    id: string;
  } | null;
}

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  const requestUrl = new URL(request.url);
  const from = requestUrl.searchParams.get("from");
  const to = requestUrl.searchParams.get("to");

  const project = getProjectById(auth.session.workspaceId);
  if (!project) {
    return fail("NOT_FOUND", "활성 프로젝트를 찾을 수 없습니다.", 404);
  }

  const integration = getIntegrations(auth.session.workspaceId).find(
    (item) => item.type === "prometheus" && item.status !== "failed",
  );

  if (!integration) {
    return fail(
      "PROMETHEUS_NOT_CONNECTED",
      "현재 프로젝트에 Prometheus 연동이 없습니다.",
      412,
    );
  }

  let overview: BackendPrometheusOverview;
  let latestAnalysisId: string | null = null;
  try {
    const backendParams = new URLSearchParams({
      workspaceId: auth.session.workspaceId,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
    overview = await getBackendJson<BackendPrometheusOverview>(
      `/api/integrations/prometheus/overview?${backendParams.toString()}`,
    );
    const latest = await getBackendJson<BackendAnalysisLatest>(
      `/api/optimization/analysis/latest?workspaceId=${encodeURIComponent(
        auth.session.workspaceId,
      )}&projectName=${encodeURIComponent(project.name)}&awsRegion=${encodeURIComponent(
        project.awsRegion,
      )}`,
    );
    latestAnalysisId = latest.analysis?.id ?? null;
  } catch (error) {
    return fail(
      "BACKEND_FETCH_FAILED",
      error instanceof Error
        ? error.message
        : "Prometheus overview를 backend에서 불러오지 못했습니다.",
      502,
    );
  }

  return ok({
    workspaceId: auth.session.workspaceId,
    project,
    integration,
    analysisId: latestAnalysisId,
    overview: {
      summary: overview.summary,
      series: overview.series,
      timeRange: overview.timeRange,
      warnings: overview.warnings,
      authMode: overview.authMode,
      baseUrl: overview.baseUrl,
    },
  });
}
