import { fail, ok } from "@/lib/api-response";
import { requireBackendSession } from "@/lib/auth";
import { getBackendJson, postBackendJson } from "@/lib/backend-client";

interface ChatRequestBody {
  analysisId?: string;
  content?: string;
  pinnedRecommendationId?: string;
}

export async function GET(request: Request) {
  const auth = requireBackendSession(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("analysisId");

  if (!analysisId) {
    return fail("VALIDATION_ERROR", "analysisId 쿼리 파라미터가 필요합니다.", 400);
  }

  const pinnedRecommendationId = searchParams.get("pinnedRecommendationId") ?? undefined;
  try {
    const session = await getBackendJson(
      `/api/optimization/chat?workspaceId=${encodeURIComponent(
        auth.session.workspaceId,
      )}&analysisId=${encodeURIComponent(
        analysisId,
      )}&pinnedRecommendationId=${encodeURIComponent(pinnedRecommendationId ?? "")}`,
      { accessToken: auth.session.backendAccessToken },
    );
    return ok({ session });
  } catch (error) {
    return fail(
      "BACKEND_CHAT_FAILED",
      error instanceof Error ? error.message : "대화 세션을 backend에서 불러오지 못했습니다.",
      404,
    );
  }
}

export async function POST(request: Request) {
  const auth = requireBackendSession(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as ChatRequestBody;

  if (!body.analysisId || !body.content) {
    return fail("VALIDATION_ERROR", "analysisId와 content는 필수입니다.", 400);
  }
  try {
    const data = await postBackendJson("/api/optimization/chat", {
      workspaceId: auth.session.workspaceId,
      analysisId: body.analysisId,
      content: body.content,
      pinnedRecommendationId: body.pinnedRecommendationId,
    }, { accessToken: auth.session.backendAccessToken });
    return ok(data);
  } catch (error) {
    return fail(
      "BACKEND_CHAT_FAILED",
      error instanceof Error ? error.message : "대화 메시지 처리에 실패했습니다.",
      404,
    );
  }
}
