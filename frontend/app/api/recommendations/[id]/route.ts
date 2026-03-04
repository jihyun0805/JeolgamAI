import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getRecommendationById } from "@/lib/store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const recommendation = getRecommendationById(id);

  if (!recommendation) {
    return fail("NOT_FOUND", `recommendationId=${id}를 찾을 수 없습니다.`, 404);
  }

  return ok(recommendation);
}
