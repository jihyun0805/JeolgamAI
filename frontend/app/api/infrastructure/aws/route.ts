import { fail, ok } from "@/lib/api-response";
import { requireBackendSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";

export async function GET(request: Request) {
  const auth = requireBackendSession(request);
  if (!auth.ok) return auth.response;

  try {
    const data = await getBackendJson(
      `/api/integrations/aws/infrastructure?workspaceId=${encodeURIComponent(
        auth.session.workspaceId,
      )}`,
      { accessToken: auth.session.backendAccessToken },
    );
    return ok(data);
  } catch (error) {
    return fail(
      "BACKEND_FETCH_FAILED",
      error instanceof Error ? error.message : "AWS 인프라 데이터를 불러오지 못했습니다.",
      502,
    );
  }
}
