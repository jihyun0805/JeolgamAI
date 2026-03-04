import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import {
  getAnalysisById,
  getRecommendationsByAnalysis,
  getStore,
} from "@/lib/store";

export async function GET(
  request: Request,
  context: { params: Promise<{ analysisId: string }> },
) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { analysisId } = await context.params;
  const store = getStore();
  const analysis = getAnalysisById(analysisId);

  if (!analysis) {
    return fail("NOT_FOUND", `analysisId=${analysisId}를 찾을 수 없습니다.`, 404);
  }

  return ok({
    workspaceId: store.workspaceId,
    analysis,
    recommendations: getRecommendationsByAnalysis(analysisId),
  });
}
