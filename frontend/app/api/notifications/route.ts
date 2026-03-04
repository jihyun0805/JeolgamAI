import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const store = getStore();
  return ok({
    notifications: store.notifications.filter(
      (item) => item.workspaceId === auth.session.workspaceId,
    ),
  });
}
