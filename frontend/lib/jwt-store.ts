// 클라이언트 전용 - 브라우저 localStorage에 JWT 세션 저장

const TOKEN_KEY = "jeolgamai_token";
const SESSION_KEY = "jeolgamai_session";

export interface StoredSession {
  token: string;
  userId: string;
  name: string;
  role: string;
  workspaceId: string;
  expiresAt: string;
}

export function storeSession(data: StoredSession): void {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function updateStoredWorkspace(workspaceId: string): void {
  const session = getStoredSession();
  if (!session) return;
  storeSession({ ...session, workspaceId });
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}
