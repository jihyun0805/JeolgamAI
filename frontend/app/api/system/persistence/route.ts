import { ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { isMockDataMode } from "@/lib/runtime-mode";
import { getPersistenceInfo } from "@/lib/state-persistence";

export async function GET(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) return auth.response;

  return ok({
    ...getPersistenceInfo(),
    mockDataMode: isMockDataMode(),
  });
}
