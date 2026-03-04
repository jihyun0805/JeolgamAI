import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getLatestAnalysis, getRecommendationsByAnalysis } from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const latest = getLatestAnalysis();

  if (!latest) {
    return ok({
      analysisId: null,
      recommendations: [],
    });
  }

  return ok({
    analysisId: latest.id,
    recommendations: getRecommendationsByAnalysis(latest.id),
  });
}
