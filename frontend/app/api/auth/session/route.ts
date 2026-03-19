import { fail, ok } from "@/lib/api-response";
import { getSessionFromRequest, setSessionCookieFromSealed } from "@/lib/auth";
import { getProjectById, getProjectsForUser } from "@/lib/store";

export async function GET(request: Request) {
  const { session, sealedCookie } = getSessionFromRequest(request);
  if (!session) {
    return fail("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  const projects = getProjectsForUser(session.userId);
  const activeProject = getProjectById(session.workspaceId) ?? projects[0] ?? null;

  const data = {
    userId: session.userId,
    name: session.name,
    role: session.role,
    workspaceId: session.workspaceId,
    activeProject,
    projects,
    backendLinked: Boolean(session.backendAccessToken),
    expiresAt: session.expiresAt,
  };
  const response = ok(data);
  if (sealedCookie) {
    setSessionCookieFromSealed(
      response,
      sealedCookie,
      new URL(request.url).protocol === "https:",
    );
  }
  return response;
}
