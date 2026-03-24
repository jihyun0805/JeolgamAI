import { fail, ok } from "@/lib/api-response";
import { requireBackendSession } from "@/lib/auth";
import { getBackendJson, postBackendJson } from "@/lib/backend-client";

interface MarkReadBody {
  notificationIds?: string[];
}

export async function GET(request: Request) {
  const auth = requireBackendSession(request);
  if (!auth.ok) return auth.response;

  try {
    const data = await getBackendJson(
      `/api/optimization/notifications?workspaceId=${encodeURIComponent(auth.session.workspaceId)}`,
      { accessToken: auth.session.backendAccessToken },
    );
    return ok(data);
  } catch (error) {
    return fail(
      "BACKEND_NOTIFICATIONS_FAILED",
      error instanceof Error ? error.message : "backend 알림 조회에 실패했습니다.",
      404,
    );
  }
}

export async function POST(request: Request) {
  const auth = requireBackendSession(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as MarkReadBody;

  try {
    const data = await postBackendJson("/api/optimization/notifications/read", {
      workspaceId: auth.session.workspaceId,
      notificationIds: body.notificationIds ?? [],
    }, { accessToken: auth.session.backendAccessToken });
    return ok(data);
  } catch (error) {
    return fail(
      "BACKEND_NOTIFICATIONS_FAILED",
      error instanceof Error ? error.message : "backend 알림 읽음 처리에 실패했습니다.",
      404,
    );
  }
}
