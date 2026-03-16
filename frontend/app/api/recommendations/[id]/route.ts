import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const recommendation = await getBackendJson(
      `/api/optimization/recommendations/${encodeURIComponent(
        id,
      )}?workspaceId=${encodeURIComponent(auth.session.workspaceId)}`,
    );
    return ok(recommendation);
  } catch (error) {
    return fail(
      "BACKEND_FETCH_FAILED",
      error instanceof Error ? error.message : "권고 상세를 backend에서 불러오지 못했습니다.",
      404,
    );
  }
}
