import { fail, ok } from "@/lib/api-response";
import { requireBackendRole, requireBackendSession } from "@/lib/auth";
import { getBackendBaseUrl, getBackendJson, postBackendJson } from "@/lib/backend-client";
import { addAuditEvent, getProjectById } from "@/lib/store";
import { ReportTemplateType } from "@/lib/types";

interface GenerateReportBody {
  analysisId?: string;
  templateType?: ReportTemplateType;
  createdBy?: string;
}

export async function POST(request: Request) {
  const auth = requireBackendRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) {
    if (auth.session) {
      addAuditEvent({
        actor: auth.session.userId,
        actorRole: auth.session.role,
        workspaceId: auth.session.workspaceId,
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

  const project = getProjectById(auth.session.workspaceId);
  const templateType = body.templateType ?? "combined";
  let report: unknown;
  try {
    report = await postBackendJson("/api/optimization/reports", {
      workspaceId: auth.session.workspaceId,
      analysisId: body.analysisId,
      templateType,
      createdBy: body.createdBy ?? auth.session.userId,
      projectName: project?.name,
      awsRegion: project?.awsRegion,
    }, { accessToken: auth.session.backendAccessToken });
  } catch (error) {
    return fail(
      "BACKEND_REPORT_FAILED",
      error instanceof Error ? error.message : "backend 리포트 생성에 실패했습니다.",
      404,
    );
  }

  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    workspaceId: auth.session.workspaceId,
    action: "report.generate",
    targetType: "report",
    targetId: typeof report === "object" && report && "id" in report ? String(report.id) : "report",
    result: "success",
    metadata: {
      analysisId: body.analysisId,
      templateType,
    },
  });

  return ok(report, 201);
}

export async function GET(request: Request) {
  const auth = requireBackendSession(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("analysisId");
  const reportId = searchParams.get("reportId");
  const format = searchParams.get("format");
  const project = getProjectById(auth.session.workspaceId);

  try {
    const query = new URLSearchParams({
      workspaceId: auth.session.workspaceId,
      ...(analysisId ? { analysisId } : {}),
      ...(reportId ? { reportId } : {}),
      ...(format ? { format } : {}),
      ...(project?.name ? { projectName: project.name } : {}),
      ...(project?.awsRegion ? { awsRegion: project.awsRegion } : {}),
    });
    if (format?.toLowerCase() === "pdf") {
      const response = await fetch(`${getBackendBaseUrl()}/api/optimization/reports?${query.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/pdf",
          Authorization: `Bearer ${auth.session.backendAccessToken}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        return fail(
          "BACKEND_REPORT_FAILED",
          payload?.message ?? `backend 리포트 PDF 조회에 실패했습니다. status=${response.status}`,
          response.status,
        );
      }

      const body = await response.arrayBuffer();
      const headers = new Headers();
      headers.set("Content-Type", response.headers.get("content-type") ?? "application/pdf");
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        headers.set("Content-Disposition", contentDisposition);
      }
      return new Response(body, {
        status: 200,
        headers,
      });
    }

    const data = await getBackendJson(`/api/optimization/reports?${query.toString()}`, {
      accessToken: auth.session.backendAccessToken,
    });
    return ok(data);
  } catch (error) {
    return fail(
      "BACKEND_REPORT_FAILED",
      error instanceof Error ? error.message : "backend 리포트 조회에 실패했습니다.",
      404,
    );
  }
}
