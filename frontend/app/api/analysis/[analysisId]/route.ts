import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";
import { getProjectById } from "@/lib/store";

export async function GET(
  request: Request,
  context: { params: Promise<{ analysisId: string }> },
) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { analysisId } = await context.params;
  const project = getProjectById(auth.session.workspaceId);
  try {
    const data = await getBackendJson<{
      workspaceId: string;
      project: unknown;
      analysis: unknown;
      recommendations: unknown[];
    }>(
      `/api/optimization/analysis/${encodeURIComponent(
        analysisId,
      )}?workspaceId=${encodeURIComponent(
        auth.session.workspaceId,
      )}&projectName=${encodeURIComponent(project?.name ?? "")}&awsRegion=${encodeURIComponent(
        project?.awsRegion ?? "",
      )}`,
    );
    return ok(data);
  } catch (error) {
    return fail(
      "BACKEND_FETCH_FAILED",
      error instanceof Error ? error.message : "분석 상세를 backend에서 불러오지 못했습니다.",
      404,
    );
  }
}
