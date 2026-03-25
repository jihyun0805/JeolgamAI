import { fail, ok } from "@/lib/api-response";
import { requireBackendSession, requireBackendRole, requireRole, requireSession } from "@/lib/auth";
import {
  addAuditEvent,
  createProject,
  getProjectById,
  getProjectsForUser,
  syncProjectsForUser,
} from "@/lib/store";
import { getBackendJson, postBackendJson } from "@/lib/backend-client";
import { Project } from "@/lib/types";

interface CreateProjectBody {
  name?: string;
  awsRegion?: string;
}

export async function GET(request: Request) {
  const backendAuth = requireBackendSession(request);
  if (backendAuth.ok) {
    const projects = await getBackendJson<Project[]>("/api/projects", {
      accessToken: backendAuth.session.backendAccessToken,
    });
    syncProjectsForUser({
      userId: backendAuth.session.userId,
      role: backendAuth.session.role,
      projects,
      defaultProjectId: backendAuth.session.workspaceId,
    });
    return ok({
      activeProject:
        projects.find((project) => project.id === backendAuth.session.workspaceId) ??
        projects[0] ??
        null,
      projects,
    });
  }

  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const projects = getProjectsForUser(auth.session.userId);
  return ok({
    activeProject: getProjectById(auth.session.workspaceId),
    projects,
  });
}

export async function POST(request: Request) {
  const backendAuth = requireBackendRole(request, ["system_admin", "company_admin"]);
  if (backendAuth.ok) {
    const body = (await request.json().catch(() => ({}))) as CreateProjectBody;
    const name = body.name?.trim();
    const awsRegion = body.awsRegion?.trim() || "ap-northeast-2";

    if (!name || name.length < 2) {
      return fail("VALIDATION_ERROR", "프로젝트 이름은 2자 이상이어야 합니다.", 400);
    }

    if (awsRegion.length > 50) {
      return fail("VALIDATION_ERROR", "AWS 리전 형식이 올바르지 않습니다.", 400);
    }

    const project = await postBackendJson<Project>(
      "/api/projects",
      { name, awsRegion },
      { accessToken: backendAuth.session.backendAccessToken },
    );

    syncProjectsForUser({
      userId: backendAuth.session.userId,
      role: backendAuth.session.role,
      projects: [project, ...getProjectsForUser(backendAuth.session.userId).filter((item) => item.id !== project.id)],
      defaultProjectId: backendAuth.session.workspaceId,
    });

    addAuditEvent({
      actor: backendAuth.session.userId,
      actorRole: backendAuth.session.role,
      workspaceId: project.id,
      action: "project.create",
      targetType: "project",
      targetId: project.id,
      result: "success",
      metadata: {
        name: project.name,
        awsRegion: project.awsRegion,
      },
    });

    return ok({ project }, 201);
  }

  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as CreateProjectBody;
  const name = body.name?.trim();
  const awsRegion = body.awsRegion?.trim() || "ap-northeast-2";

  if (!name || name.length < 2) {
    return fail("VALIDATION_ERROR", "프로젝트 이름은 2자 이상이어야 합니다.", 400);
  }

  if (awsRegion.length > 50) {
    return fail("VALIDATION_ERROR", "AWS 리전 형식이 올바르지 않습니다.", 400);
  }

  const project = createProject({
    userId: auth.session.userId,
    name,
    role: auth.session.role,
    awsRegion,
  });

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    workspaceId: project.id,
    action: "project.create",
    targetType: "project",
    targetId: project.id,
    result: "success",
    metadata: {
      name: project.name,
      awsRegion: project.awsRegion,
    },
  });

  return ok({ project }, 201);
}
