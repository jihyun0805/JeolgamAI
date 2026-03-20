// 클라이언트 전용 - localStorage 세션 헤더를 자동으로 붙여주는 fetch 래퍼

import { getStoredSession } from "./jwt-store";

export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const session = getStoredSession();

  const authHeaders: Record<string, string> = {};
  if (session) {
    authHeaders["Authorization"] = `Bearer ${session.token}`;
    authHeaders["X-User-Id"] = session.userId;
    authHeaders["X-User-Name"] = encodeURIComponent(session.name);
    authHeaders["X-User-Role"] = session.role;
    authHeaders["X-Workspace-Id"] = session.workspaceId;
    authHeaders["X-Expires-At"] = session.expiresAt;
  }

  return fetch(input, {
    ...init,
    headers: {
      ...authHeaders,
      ...init?.headers,
    },
  });
}
