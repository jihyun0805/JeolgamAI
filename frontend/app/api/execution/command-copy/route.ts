import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";
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

  try {
    await getBackendJson(
      `/api/optimization/recommendations/${encodeURIComponent(
        body.recommendationId,
      )}?workspaceId=${encodeURIComponent(auth.session.workspaceId)}`,
    );
  } catch (error) {
    return fail(
      "BACKEND_FETCH_FAILED",
      error instanceof Error ? error.message : "권고를 찾을 수 없습니다.",
      404,
    );
  }

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    workspaceId: auth.session.workspaceId,
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
