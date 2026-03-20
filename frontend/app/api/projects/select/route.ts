import { fail } from "@/lib/api-response";
import { requireSession, selectSessionWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";
import { addAuditEvent, getProjectForUser } from "@/lib/store";

interface SelectProjectBody {
  projectId?: string;
}

export async function POST(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as SelectProjectBody;
  const projectId = body.projectId?.trim();

  if (!projectId) {
    return fail("VALIDATION_ERROR", "projectId는 필수입니다.", 400);
  }

  const project = getProjectForUser(auth.session.userId, projectId);
  if (!project) {
    return fail("FORBIDDEN", "해당 프로젝트에 접근할 수 없습니다.", 403);
  }

  const updatedSession = selectSessionWorkspace(auth.session, projectId);
  if (!updatedSession) {
    return fail("FORBIDDEN", "프로젝트 전환에 실패했습니다.", 403);
  }

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    workspaceId: projectId,
    action: "project.select",
    targetType: "project",
    targetId: projectId,
    result: "success",
    metadata: {
      projectName: project.name,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      workspaceId: updatedSession.workspaceId,
      project,
    },
  });
}
