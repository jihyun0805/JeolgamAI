import { ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { getAudits } from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) return auth.response;

  const requestUrl = new URL(request.url);
  const page = Math.max(1, Number.parseInt(requestUrl.searchParams.get("page") ?? "1", 10) || 1);
  const size = Math.min(
    100,
    Math.max(5, Number.parseInt(requestUrl.searchParams.get("size") ?? "20", 10) || 20),
  );
  const audits = getAudits(auth.session.workspaceId);
  const totalPages = Math.max(1, Math.ceil(audits.length / size));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * size;

  return ok({
    count: audits.length,
    page: safePage,
    size,
    totalPages,
    events: audits.slice(startIndex, startIndex + size),
  });
}
