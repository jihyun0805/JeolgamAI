import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { postBackendJson } from "@/lib/backend-client";
import { addAuditEvent, getProjectById } from "@/lib/store";

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
        workspaceId: auth.session.workspaceId,
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

  const project = getProjectById(auth.session.workspaceId);
  let bundle: { analysis: { id: string; triggeredBy: string } };
  try {
    bundle = await postBackendJson("/api/optimization/analysis/run", {
      workspaceId: auth.session.workspaceId,
      projectName: project?.name,
      awsRegion: project?.awsRegion,
      lookbackDays,
      triggeredBy: body.triggeredBy ?? "manual",
    });
  } catch (error) {
    return fail(
      "BACKEND_ANALYSIS_FAILED",
      error instanceof Error ? error.message : "backend 분석 실행에 실패했습니다.",
      502,
    );
  }

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    workspaceId: auth.session.workspaceId,
    action: "analysis.run",
    targetType: "analysis",
    targetId: bundle.analysis.id,
    result: "success",
    metadata: {
      lookbackDays: String(lookbackDays),
      triggeredBy: bundle.analysis.triggeredBy,
    },
  });

  return ok(bundle.analysis, 201);
}
