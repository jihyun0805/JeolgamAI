import {
  AnalysisSnapshot,
  AuthUser,
  AppNotification,
  ApprovalLog,
  AuditEvent,
  ChatSession,
  IntegrationConfig,
  IntegrationType,
  Recommendation,
  ReportArtifact,
  UserRole,
  UserSession,
} from "@/lib/types";
import { loadPersistedState, persistState } from "@/lib/state-persistence";
import { TEST_ACCOUNT } from "@/lib/test-users";

export interface AppState {
  workspaceId: string;
  integrations: Partial<Record<IntegrationType, IntegrationConfig>>;
  analyses: AnalysisSnapshot[];
  recommendations: Recommendation[];
  approvals: ApprovalLog[];
  reports: ReportArtifact[];
  chatSessions: ChatSession[];
  notifications: AppNotification[];
  authUsers: AuthUser[];
  sessions: UserSession[];
  audits: AuditEvent[];
}

const STORE_KEY = "__JEOLGAMAI_APP_STATE__";

function createInitialState(): AppState {
  return {
    workspaceId: "ws-jeolgam-default",
    integrations: {},
    analyses: [],
    recommendations: [],
    approvals: [],
    reports: [],
    chatSessions: [],
    notifications: [],
    authUsers: [],
    sessions: [],
    audits: [],
  };
}

function createDefaultAuthUsers(): AuthUser[] {
  return [
    {
      userId: "user_test_account",
      loginId: TEST_ACCOUNT.loginId,
      password: TEST_ACCOUNT.password,
      name: TEST_ACCOUNT.name,
      role: TEST_ACCOUNT.role,
      createdAt: nowIso(),
    },
  ];
}

function normalizeState(raw: Partial<AppState> | null | undefined): AppState {
  const base = createInitialState();
  if (!raw) return base;

  return {
    workspaceId: raw.workspaceId ?? base.workspaceId,
    integrations: raw.integrations ?? base.integrations,
    analyses: raw.analyses ?? base.analyses,
    recommendations: raw.recommendations ?? base.recommendations,
    approvals: raw.approvals ?? base.approvals,
    reports: raw.reports ?? base.reports,
    chatSessions: raw.chatSessions ?? base.chatSessions,
    notifications: raw.notifications ?? base.notifications,
    authUsers:
      raw.authUsers && raw.authUsers.length > 0
        ? raw.authUsers
        : createDefaultAuthUsers(),
    sessions: raw.sessions ?? base.sessions,
    audits: raw.audits ?? base.audits,
  };
}

const initialState = normalizeState(
  await loadPersistedState<Partial<AppState>>(createInitialState()),
);

function getGlobalStore(): AppState {
  const globalScope = globalThis as typeof globalThis & {
    [STORE_KEY]?: AppState;
  };

  if (!globalScope[STORE_KEY]) {
    globalScope[STORE_KEY] = initialState;
  }

  return globalScope[STORE_KEY];
}

export function getStore(): AppState {
  return getGlobalStore();
}

export function persistStore(): void {
  void persistState(getStore());
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 6) return "*".repeat(secret.length);
  return `${secret.slice(0, 3)}${"*".repeat(Math.max(4, secret.length - 6))}${secret.slice(-3)}`;
}

export function upsertIntegration(config: IntegrationConfig): IntegrationConfig {
  const store = getStore();
  store.integrations[config.type] = config;
  persistStore();
  return config;
}

export function getIntegrations(): IntegrationConfig[] {
  const store = getStore();
  return Object.values(store.integrations).filter(
    (value): value is IntegrationConfig => Boolean(value),
  );
}

export function addNotification(
  notification: Omit<AppNotification, "id" | "createdAt" | "read">,
): AppNotification {
  const store = getStore();
  const created: AppNotification = {
    id: createId("notif"),
    createdAt: nowIso(),
    read: false,
    ...notification,
  };

  store.notifications.unshift(created);
  persistStore();
  return created;
}

export function addAuditEvent(
  event: Omit<AuditEvent, "id" | "createdAt">,
): AuditEvent {
  const store = getStore();
  const created: AuditEvent = {
    id: createId("audit"),
    createdAt: nowIso(),
    ...event,
  };

  store.audits.unshift(created);
  persistStore();
  return created;
}

export function getLatestAnalysis(): AnalysisSnapshot | null {
  const store = getStore();
  return store.analyses[0] ?? null;
}

export function getAnalysisById(analysisId: string): AnalysisSnapshot | null {
  const store = getStore();
  return store.analyses.find((analysis) => analysis.id === analysisId) ?? null;
}

export function getRecommendationsByAnalysis(analysisId: string): Recommendation[] {
  const store = getStore();
  return store.recommendations.filter(
    (recommendation) => recommendation.analysisId === analysisId,
  );
}

export function getRecommendationById(recommendationId: string): Recommendation | null {
  const store = getStore();
  return (
    store.recommendations.find((recommendation) => recommendation.id === recommendationId) ??
    null
  );
}

export function saveApproval(log: ApprovalLog): void {
  const store = getStore();
  store.approvals.unshift(log);
  persistStore();
}

export function saveReport(report: ReportArtifact): void {
  const store = getStore();
  store.reports.unshift(report);
  persistStore();
}

export function createSession(params: {
  userId: string;
  name: string;
  role: UserRole;
  workspaceId?: string;
  ttlHours?: number;
}): UserSession {
  const store = getStore();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt);
  expiresAt.setHours(expiresAt.getHours() + (params.ttlHours ?? 8));

  const session: UserSession = {
    token: createId("sess"),
    userId: params.userId,
    name: params.name,
    role: params.role,
    workspaceId: params.workspaceId ?? store.workspaceId,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  store.sessions = [
    session,
    ...store.sessions.filter((item) => item.userId !== session.userId),
  ];
  persistStore();

  return session;
}

export function getSessionByToken(token: string): UserSession | null {
  const store = getStore();
  const session = store.sessions.find((item) => item.token === token) ?? null;
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    store.sessions = store.sessions.filter((item) => item.token !== token);
    persistStore();
    return null;
  }

  return session;
}

export function removeSessionByToken(token: string): void {
  const store = getStore();
  store.sessions = store.sessions.filter((item) => item.token !== token);
  persistStore();
}

export function getAuthUserByLoginId(loginId: string): AuthUser | null {
  const store = getStore();
  return (
    store.authUsers.find(
      (user) => user.loginId.toLowerCase() === loginId.toLowerCase(),
    ) ?? null
  );
}

export function createAuthUser(params: {
  loginId: string;
  password: string;
  name: string;
  role: UserRole;
}): AuthUser {
  const store = getStore();
  const existing = getAuthUserByLoginId(params.loginId);
  if (existing) return existing;

  const user: AuthUser = {
    userId: createId("user"),
    loginId: params.loginId,
    password: params.password,
    name: params.name,
    role: params.role,
    createdAt: nowIso(),
  };

  store.authUsers.unshift(user);
  persistStore();
  return user;
}

export function getChatSession(
  workspaceId: string,
  analysisId: string,
  pinnedRecommendationId?: string,
): ChatSession {
  const store = getStore();

  const existing = store.chatSessions.find(
    (session) =>
      session.workspaceId === workspaceId &&
      session.analysisId === analysisId &&
      session.pinnedRecommendationId === pinnedRecommendationId,
  );

  if (existing) return existing;

  const created: ChatSession = {
    id: createId("chat"),
    workspaceId,
    analysisId,
    pinnedRecommendationId,
    messages: [],
    updatedAt: nowIso(),
  };

  store.chatSessions.unshift(created);
  persistStore();
  return created;
}
