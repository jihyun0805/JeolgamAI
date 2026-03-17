import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getNotificationsByWorkspace } from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  return ok({
    notifications: getNotificationsByWorkspace(auth.session.workspaceId),
  });
}
