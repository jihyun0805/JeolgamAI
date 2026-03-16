import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { postBackendJson } from "@/lib/backend-client";
import { addAuditEvent } from "@/lib/store";

interface ApproveBody {
  actor?: string;
  action?: "approved" | "rejected";
  note?: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  const { id } = await context.params;

  if (!auth.ok) {
    if (auth.session) {
      addAuditEvent({
        actor: auth.session.userId,
        actorRole: auth.session.role,
        workspaceId: auth.session.workspaceId,
        action: "recommendation.approve",
        targetType: "recommendation",
        targetId: id,
        result: "forbidden",
      });
    }
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as ApproveBody;

  if (!body.action || !["approved", "rejected"].includes(body.action)) {
    return fail("VALIDATION_ERROR", "action은 approved/rejected 이어야 합니다.", 400);
  }

  let result: unknown;
  try {
    result = await postBackendJson(
      `/api/optimization/recommendations/${encodeURIComponent(
        id,
      )}/approve?workspaceId=${encodeURIComponent(auth.session.workspaceId)}`,
      {
        actor: body.actor || auth.session.userId,
        action: body.action,
        note: body.note,
      },
    );
  } catch (error) {
    return fail(
      "BACKEND_APPROVE_FAILED",
      error instanceof Error ? error.message : "권고 상태 변경에 실패했습니다.",
      404,
    );
  }

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    workspaceId: auth.session.workspaceId,
    action:
      body.action === "approved"
        ? "recommendation.approve"
        : "recommendation.reject",
    targetType: "recommendation",
    targetId: id,
    result: "success",
    metadata: {
      note: body.note ?? "",
    },
  });

  return ok(result);
}
