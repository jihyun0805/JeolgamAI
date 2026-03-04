import { fail, ok } from "@/lib/api-response";
import { requireRole, requireSession } from "@/lib/auth";
import {
  addAuditEvent,
  createId,
  getAnalysisById,
  getRecommendationsByAnalysis,
  getStore,
  nowIso,
  saveReport,
} from "@/lib/store";
import { ReportArtifact, ReportTemplateType } from "@/lib/types";

interface GenerateReportBody {
  analysisId?: string;
  templateType?: ReportTemplateType;
  createdBy?: string;
}

export async function POST(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) {
    if (auth.session) {
      addAuditEvent({
        actor: auth.session.userId,
        actorRole: auth.session.role,
        action: "report.generate",
        targetType: "report",
        targetId: "new",
        result: "forbidden",
      });
    }
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as GenerateReportBody;

  if (!body.analysisId) {
    return fail("VALIDATION_ERROR", "analysisId는 필수입니다.", 400);
  }

  const analysis = getAnalysisById(body.analysisId);
  if (!analysis) {
    return fail("NOT_FOUND", `analysisId=${body.analysisId}를 찾을 수 없습니다.`, 404);
  }

  const recommendations = getRecommendationsByAnalysis(analysis.id);
  const templateType = body.templateType ?? "executive";

  const report: ReportArtifact = {
    id: createId("report"),
    analysisId: analysis.id,
    templateType,
    createdBy: body.createdBy ?? "company_admin",
    createdAt: nowIso(),
    previewUrl: `/reports/new?analysisId=${analysis.id}&reportId=preview-${analysis.id}`,
    exportUrl: `/api/reports/generate?analysisId=${analysis.id}&format=pdf`,
    payload: {
      totalScore: analysis.score.totalScore,
      grade: analysis.score.grade,
      monthlySaving: analysis.potentialMonthlySaving,
      annualSaving: analysis.potentialAnnualSaving,
      topRecommendationTitles: recommendations.slice(0, 3).map((item) => item.title),
    },
  };

  saveReport(report);
  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    action: "report.generate",
    targetType: "report",
    targetId: report.id,
    result: "success",
    metadata: {
      analysisId: report.analysisId,
      templateType: report.templateType,
    },
  });

  return ok(report, 201);
}

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("analysisId");
  const format = searchParams.get("format");

  const reports = getStore().reports;
  const filtered = analysisId
    ? reports.filter((report) => report.analysisId === analysisId)
    : reports;

  if (format === "pdf") {
    if (!analysisId) {
      return fail("VALIDATION_ERROR", "format=pdf 요청에는 analysisId가 필요합니다.", 400);
    }

    const latest = filtered[0];
    if (!latest) {
      return fail("NOT_FOUND", `analysisId=${analysisId} 리포트를 찾을 수 없습니다.`, 404);
    }

    return ok({
      reportId: latest.id,
      mimeType: "application/pdf",
      downloadReady: true,
      placeholderMessage:
        "데모 환경에서는 PDF 바이너리 대신 리포트 메타데이터를 반환합니다.",
      payload: latest.payload,
    });
  }

  return ok({
    reports: filtered,
    count: filtered.length,
  });
}
