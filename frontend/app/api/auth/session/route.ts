import { fail, ok } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return fail("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  return ok({
    userId: session.userId,
    name: session.name,
    role: session.role,
    workspaceId: session.workspaceId,
    expiresAt: session.expiresAt,
  });
}
