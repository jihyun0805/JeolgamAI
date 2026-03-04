import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { approveRecommendation } from "@/lib/analysis-engine";
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

  const result = approveRecommendation({
    recommendationId: id,
    actor: body.actor || "company_admin",
    action: body.action,
    note: body.note,
  });

  if (!result) {
    return fail("NOT_FOUND", `recommendationId=${id}를 찾을 수 없습니다.`, 404);
  }

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
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
