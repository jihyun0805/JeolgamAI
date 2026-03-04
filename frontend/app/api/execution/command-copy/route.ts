import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { addAuditEvent } from "@/lib/store";

interface CommandCopyBody {
  recommendationId?: string;
  commandType?: "execute" | "rollback";
}

export async function POST(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as CommandCopyBody;

  if (!body.recommendationId) {
    return fail("VALIDATION_ERROR", "recommendationId는 필수입니다.", 400);
  }

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    action: "command.copy",
    targetType: "execution",
    targetId: body.recommendationId,
    result: "success",
    metadata: {
      commandType: body.commandType ?? "execute",
    },
  });

  return ok({
    copied: true,
    recommendationId: body.recommendationId,
    commandType: body.commandType ?? "execute",
  });
}
