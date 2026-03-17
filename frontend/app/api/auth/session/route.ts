import { fail, ok } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth";
import { getProjectById, getProjectsForUser } from "@/lib/store";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return fail("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  const projects = getProjectsForUser(session.userId);
  const activeProject = getProjectById(session.workspaceId) ?? projects[0] ?? null;

  return ok({
    userId: session.userId,
    name: session.name,
    role: session.role,
    workspaceId: session.workspaceId,
    activeProject,
    projects,
    backendLinked: Boolean(session.backendAccessToken),
    expiresAt: session.expiresAt,
  });
}
