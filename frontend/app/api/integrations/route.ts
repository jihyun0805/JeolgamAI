import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getIntegrations, getStore } from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const store = getStore();
  const integrations = getIntegrations();

  return ok({
    workspaceId: store.workspaceId,
    integrations,
    coverage: {
      aws: integrations.some((item) => item.type === "aws" && item.status !== "failed"),
      k8s: integrations.some((item) => item.type === "k8s" && item.status !== "failed"),
      prometheus: integrations.some(
        (item) => item.type === "prometheus" && item.status !== "failed",
      ),
    },
  });
}
