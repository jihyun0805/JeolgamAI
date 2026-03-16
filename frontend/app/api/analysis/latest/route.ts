import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getBackendJson } from "@/lib/backend-client";
import { getProjectById } from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const project = getProjectById(auth.session.workspaceId);
  const data = await getBackendJson<{
    workspaceId: string;
    project: unknown;
    analysis: unknown;
    recommendations: unknown[];
  }>(
    `/api/optimization/analysis/latest?workspaceId=${encodeURIComponent(
      auth.session.workspaceId,
    )}&projectName=${encodeURIComponent(project?.name ?? "")}&awsRegion=${encodeURIComponent(
      project?.awsRegion ?? "",
    )}`,
  );
  return ok(data);
}
