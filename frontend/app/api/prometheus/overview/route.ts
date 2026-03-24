import { fail, ok } from "@/lib/api-response";
import { requireBackendSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";
import {
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
    cpuUsage: Array<{ timestamp: string; label: string; value: number }>;
    memoryUsage: Array<{ timestamp: string; label: string; value: number }>;
    latencyMs: Array<{ timestamp: string; label: string; value: number }>;
    errorRatePercent: Array<{ timestamp: string; label: string; value: number }>;
  };
  forecast?: {
    methodology?: string;
    metrics: Array<{
      key: string;
      label: string;
      unit: string;
      currentValue: number;
      forecast1h: number;
      forecast6h: number;
      forecast24h: number;
      statusLabel: string;
      detail: string;
    }>;
    chartSeries?: Array<{
      key: string;
      points: Array<{ label: string; value: number }>;
    }>;
  };
  aiForecast?: {
    methodology?: string;
    provider?: string;
    metrics: Array<{
      key: string;
      label: string;
      unit: string;
      strategy: string;
      currentValue: number;
      forecast1h: { lower: number; base: number; upper: number };
      forecast6h: { lower: number; base: number; upper: number };
      forecast24h: { lower: number; base: number; upper: number };
    }>;
    chartSeries?: Array<{
      key: string;
      points: Array<{ label: string; lower: number; base: number; upper: number }>;
    }>;
  };
  timeRange: {
    from: string;
    to: string;
    stepSeconds: number;
  };
  warnings: string[];
}

type ProjectSummary = {
  id: string;
  name: string;
  awsRegion: string;
};

interface BackendAnalysisLatest {
  project?: ProjectSummary | null;
  analysis: {
    id: string;
  } | null;
}

export async function GET(request: Request) {
  const auth = requireBackendSession(request);
  if (!auth.ok) return auth.response;
  const requestUrl = new URL(request.url);
  const from = requestUrl.searchParams.get("from");
  const to = requestUrl.searchParams.get("to");

  const project = getProjectById(auth.session.workspaceId);
  const projectSummary: ProjectSummary | null = project
    ? {
        id: project.id,
        name: project.name,
        awsRegion: project.awsRegion,
      }
    : null;

  let overview: BackendPrometheusOverview;
  let resolvedProject: ProjectSummary | null = projectSummary;
  let latestAnalysisId: string | null = null;
  try {
    const backendParams = new URLSearchParams({
      workspaceId: auth.session.workspaceId,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
    overview = await getBackendJson<BackendPrometheusOverview>(
      `/api/integrations/prometheus/overview?${backendParams.toString()}`,
      { accessToken: auth.session.backendAccessToken },
    );
    const latest = await getBackendJson<BackendAnalysisLatest>(
      `/api/optimization/analysis/latest?workspaceId=${encodeURIComponent(
        auth.session.workspaceId,
      )}&projectName=${encodeURIComponent(project?.name ?? "")}&awsRegion=${encodeURIComponent(
        project?.awsRegion ?? "",
      )}`,
      { accessToken: auth.session.backendAccessToken },
    );
    latestAnalysisId = latest.analysis?.id ?? null;
    resolvedProject = latest.project ?? resolvedProject;
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
    project: resolvedProject,
    analysisId: latestAnalysisId,
    overview: {
      summary: overview.summary,
      series: overview.series,
      forecast: overview.forecast,
      aiForecast: overview.aiForecast,
      timeRange: overview.timeRange,
      warnings: overview.warnings,
      authMode: overview.authMode,
      baseUrl: overview.baseUrl,
    },
  });
}
