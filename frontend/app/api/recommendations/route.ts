import { ok } from "@/lib/api-response";
import { requireBackendSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";

export async function GET(request: Request) {
  const auth = requireBackendSession(request);
  if (!auth.ok) return auth.response;

  const data = await getBackendJson<{ analysisId: string | null; recommendations: unknown[] }>(
    `/api/optimization/recommendations?workspaceId=${encodeURIComponent(
      auth.session.workspaceId,
    )}`,
    { accessToken: auth.session.backendAccessToken },
  );
  return ok(data);
}
