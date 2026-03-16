import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const data = await getBackendJson<{ analysisId: string | null; recommendations: unknown[] }>(
    `/api/optimization/recommendations?workspaceId=${encodeURIComponent(
      auth.session.workspaceId,
    )}`,
  );
  return ok(data);
}
