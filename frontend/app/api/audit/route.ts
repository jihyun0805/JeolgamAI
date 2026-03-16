import { ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { getAudits } from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) return auth.response;

  const audits = getAudits(auth.session.workspaceId);
  return ok({
    count: audits.length,
    events: audits.slice(0, 200),
  });
}
