import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { runAnalysis } from "@/lib/analysis-engine";
import { addAuditEvent } from "@/lib/store";

interface RunAnalysisBody {
  lookbackDays?: number;
  triggeredBy?: "manual" | "scheduled";
}

export async function POST(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) {
    if (auth.session) {
      addAuditEvent({
        actor: auth.session.userId,
        actorRole: auth.session.role,
        action: "analysis.run",
        targetType: "analysis",
        targetId: "manual",
        result: "forbidden",
      });
    }
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as RunAnalysisBody;
  const lookbackDays = body.lookbackDays ?? 30;

  if (lookbackDays < 1 || lookbackDays > 365) {
    return fail("VALIDATION_ERROR", "lookbackDays는 1~365 범위여야 합니다.", 400);
  }

  const snapshot = runAnalysis({
    lookbackDays,
    triggeredBy: body.triggeredBy ?? "manual",
  });

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    action: "analysis.run",
    targetType: "analysis",
    targetId: snapshot.id,
    result: "success",
    metadata: {
      lookbackDays: String(lookbackDays),
      triggeredBy: snapshot.triggeredBy,
    },
  });

  return ok(snapshot, 201);
}
