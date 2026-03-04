import { ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) return auth.response;

  const store = getStore();
  return ok({
    count: store.audits.length,
    events: store.audits.slice(0, 200),
  });
}
