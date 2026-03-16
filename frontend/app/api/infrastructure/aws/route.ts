import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";
import { getIntegrations } from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const hasAwsIntegration = getIntegrations(auth.session.workspaceId).some(
    (item) => item.type === "aws" && item.status !== "failed",
  );

  if (!hasAwsIntegration) {
    return fail("CONNECTOR_REQUIRED", "AWS 연동이 완료된 프로젝트만 조회할 수 있습니다.", 400);
  }

  try {
    const data = await getBackendJson(
      `/api/integrations/aws/infrastructure?workspaceId=${encodeURIComponent(
        auth.session.workspaceId,
      )}`,
    );
    return ok(data);
  } catch (error) {
    return fail(
      "BACKEND_FETCH_FAILED",
      error instanceof Error ? error.message : "AWS 인프라 데이터를 불러오지 못했습니다.",
      502,
    );
  }
}
