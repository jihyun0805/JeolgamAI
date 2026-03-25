import { fail, ok } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth";
import { getProjectById, getProjectsForUser, syncProjectsForUser } from "@/lib/store";
import { getBackendJson } from "@/lib/backend-client";
import { Project } from "@/lib/types";

export async function GET(request: Request) {
  const { session } = getSessionFromRequest(request);
  if (!session) {
    return fail("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  let projects = getProjectsForUser(session.userId);
  if (session.backendAccessToken) {
    try {
      const backendProjects = await getBackendJson<Project[]>("/api/projects", {
        accessToken: session.backendAccessToken,
      });
      projects = syncProjectsForUser({
        userId: session.userId,
        role: session.role,
        projects: backendProjects,
        defaultProjectId: session.workspaceId,
      });
    } catch {
      projects = getProjectsForUser(session.userId);
    }
  }
  const activeProject = projects.find((project) => project.id === session.workspaceId) ?? getProjectById(session.workspaceId) ?? projects[0] ?? null;

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
