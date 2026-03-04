import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import {
  getLatestAnalysis,
  getRecommendationsByAnalysis,
  getStore,
} from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const store = getStore();
  const latest = getLatestAnalysis();

  if (!latest) {
    return ok({
      workspaceId: store.workspaceId,
      analysis: null,
      recommendations: [],
    });
  }

  const recommendations = getRecommendationsByAnalysis(latest.id);

  return ok({
    workspaceId: store.workspaceId,
    analysis: latest,
    recommendations,
    notifications: store.notifications.slice(0, 10),
  });
}
