import {
  AnalysisSnapshot,
  AppNotification,
  ApprovalLog,
  AuditEvent,
  AuthUser,
  ChatSession,
  IntegrationConfig,
  Project,
  ProjectMembership,
  Recommendation,
  ReportArtifact,
  UserRole,
  UserSession,
} from "@/lib/types";
import { loadPersistedState, persistState } from "@/lib/state-persistence";
import { hashPassword } from "@/lib/security";
import { TEST_ACCOUNT } from "@/lib/test-users";

export interface AppState {
  workspaceId: string;
  projects: Project[];
  projectMemberships: ProjectMembership[];
  integrations: IntegrationConfig[];
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
const DEFAULT_REGION = "ap-northeast-2";

function createLegacyWorkspaceId() {
  return "ws-jeolgam-default";
}

function createInitialState(): AppState {
  return {
    workspaceId: createLegacyWorkspaceId(),
    projects: [],
    projectMemberships: [],
    integrations: [],
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

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

function createProjectName(name: string) {
  return `${name} 서울 비용 프로젝트`;
}

function maskLoginId(loginId: string) {
  return loginId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "user";
}

export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 6) return "*".repeat(secret.length);
  return `${secret.slice(0, 3)}${"*".repeat(Math.max(4, secret.length - 6))}${secret.slice(-3)}`;
}

function createDefaultAuthUsers(): AuthUser[] {
  const password = hashPassword(TEST_ACCOUNT.password);
  return [
    {
      userId: "user_test_account",
      loginId: TEST_ACCOUNT.loginId,
      backendUserId: "1",
      email: "testuser@jeolgamai.local",
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt,
      name: TEST_ACCOUNT.name,
      role: TEST_ACCOUNT.role,
      createdAt: nowIso(),
    },
  ];
}

function createProjectRecord(params: {
  name: string;
  ownerUserId: string;
  awsRegion?: string;
  id?: string;
}): Project {
  return {
    id: params.id ?? createId(`proj_${maskLoginId(params.ownerUserId)}`),
    name: params.name,
    ownerUserId: params.ownerUserId,
    awsRegion: params.awsRegion ?? DEFAULT_REGION,
    createdAt: nowIso(),
  };
}

function createMembershipRecord(params: {
  userId: string;
  projectId: string;
  role: UserRole;
}): ProjectMembership {
  return {
    id: createId("membership"),
    userId: params.userId,
    projectId: params.projectId,
    role: params.role,
    createdAt: nowIso(),
  };
}

function normalizeUsers(rawUsers: unknown): AuthUser[] {
  const incoming = Array.isArray(rawUsers) ? (rawUsers as Partial<AuthUser>[]) : [];
  const users = incoming
    .filter((user): user is Partial<AuthUser> => Boolean(user?.loginId && user?.name))
    .map((user) => {
      if (user.passwordHash && user.passwordSalt) {
        return {
          userId: user.userId ?? createId("user"),
          loginId: user.loginId!,
          backendUserId: user.backendUserId,
          email: user.email,
          passwordHash: user.passwordHash,
          passwordSalt: user.passwordSalt,
          defaultProjectId: user.defaultProjectId,
          name: user.name!,
          role: user.role ?? "company_admin",
          createdAt: user.createdAt ?? nowIso(),
        };
      }

      const migrated = hashPassword(user.password ?? TEST_ACCOUNT.password);
      return {
        userId: user.userId ?? createId("user"),
        loginId: user.loginId!,
        backendUserId: user.backendUserId,
        email: user.email,
        passwordHash: migrated.passwordHash,
        passwordSalt: migrated.passwordSalt,
        defaultProjectId: user.defaultProjectId,
        name: user.name!,
        role: user.role ?? "company_admin",
        createdAt: user.createdAt ?? nowIso(),
      };
    });

  return users.length > 0 ? users : createDefaultAuthUsers();
}

function normalizeProjects(params: {
  raw: Partial<AppState> | null | undefined;
  users: AuthUser[];
  legacyWorkspaceId: string;
}) {
  const rawProjects = Array.isArray(params.raw?.projects)
    ? params.raw.projects
    : [];
  const rawMemberships = Array.isArray(params.raw?.projectMemberships)
    ? params.raw.projectMemberships
    : [];

  const projects: Project[] = rawProjects.map((project) => ({
    id: project.id,
    name: project.name,
    ownerUserId: project.ownerUserId,
    awsRegion: project.awsRegion ?? DEFAULT_REGION,
    createdAt: project.createdAt ?? nowIso(),
  }));

  const memberships: ProjectMembership[] = rawMemberships.map((membership) => ({
    id: membership.id,
    projectId: membership.projectId,
    userId: membership.userId,
    role: membership.role,
    createdAt: membership.createdAt ?? nowIso(),
  }));

  if (projects.length === 0) {
    for (const [index, user] of params.users.entries()) {
      const project = createProjectRecord({
        id: index === 0 ? params.legacyWorkspaceId : undefined,
        name: createProjectName(user.name),
        ownerUserId: user.userId,
      });
      projects.push(project);
      memberships.push(
        createMembershipRecord({
          projectId: project.id,
          userId: user.userId,
          role: user.role,
        }),
      );
      user.defaultProjectId = project.id;
    }
    return { projects, memberships };
  }

  const projectIds = new Set(projects.map((project) => project.id));
  for (const user of params.users) {
    const accessible = memberships.find((membership) => membership.userId === user.userId);
    if (!user.defaultProjectId || !projectIds.has(user.defaultProjectId)) {
      user.defaultProjectId = accessible?.projectId ?? projects[0]?.id;
    }

    if (!accessible && user.defaultProjectId) {
      memberships.push(
        createMembershipRecord({
          projectId: user.defaultProjectId,
          userId: user.userId,
          role: user.role,
        }),
      );
    }
  }

  return { projects, memberships };
}

function normalizeIntegrations(rawIntegrations: unknown): IntegrationConfig[] {
  if (Array.isArray(rawIntegrations)) {
    return rawIntegrations.filter(Boolean) as IntegrationConfig[];
  }

  if (rawIntegrations && typeof rawIntegrations === "object") {
    return Object.values(rawIntegrations as Record<string, IntegrationConfig>).filter(Boolean);
  }

  return [];
}

function normalizeState(raw: Partial<AppState> | null | undefined): AppState {
  const base = createInitialState();
  const legacyWorkspaceId = raw?.workspaceId ?? base.workspaceId;
  const authUsers = normalizeUsers(raw?.authUsers);
  const normalizedProjects = normalizeProjects({
    raw,
    users: authUsers,
    legacyWorkspaceId,
  });

  const analyses = (raw?.analyses ?? []).map((analysis) => ({
    ...analysis,
    workspaceId: analysis.workspaceId ?? legacyWorkspaceId,
    awsRegion: analysis.awsRegion ?? DEFAULT_REGION,
    costBreakdown: analysis.costBreakdown ?? [],
  }));

  const analysisWorkspaceById = new Map(
    analyses.map((analysis) => [analysis.id, analysis.workspaceId]),
  );

  const recommendations = (raw?.recommendations ?? []).map((recommendation) => ({
    ...recommendation,
    workspaceId:
      recommendation.workspaceId ??
      analysisWorkspaceById.get(recommendation.analysisId) ??
      legacyWorkspaceId,
  }));

  return {
    workspaceId:
      normalizedProjects.projects.find((project) => project.id === legacyWorkspaceId)?.id ??
      authUsers[0]?.defaultProjectId ??
      normalizedProjects.projects[0]?.id ??
      base.workspaceId,
    projects: normalizedProjects.projects,
    projectMemberships: normalizedProjects.memberships,
    integrations: normalizeIntegrations(raw?.integrations),
    analyses,
    recommendations,
    approvals: (raw?.approvals ?? []).map((approval) => ({
      ...approval,
      workspaceId: approval.workspaceId ?? legacyWorkspaceId,
    })),
    reports: (raw?.reports ?? []).map((report) => ({
      ...report,
      workspaceId:
        report.workspaceId ??
        analysisWorkspaceById.get(report.analysisId) ??
        legacyWorkspaceId,
    })),
    chatSessions: raw?.chatSessions ?? [],
    notifications: raw?.notifications ?? [],
    authUsers,
    sessions: (raw?.sessions ?? []).map((session) => ({
      ...session,
      workspaceId:
        normalizedProjects.projects.find((project) => project.id === session.workspaceId)?.id ??
        authUsers.find((user) => user.userId === session.userId)?.defaultProjectId ??
        normalizedProjects.projects[0]?.id ??
        legacyWorkspaceId,
    })),
    audits: (raw?.audits ?? []).map((audit) => ({
      ...audit,
      workspaceId: audit.workspaceId ?? legacyWorkspaceId,
    })),
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

export function getProjectById(projectId: string): Project | null {
  const store = getStore();
  return store.projects.find((project) => project.id === projectId) ?? null;
}

export function getProjectsForUser(userId: string): Project[] {
  const store = getStore();
  const membershipIds = new Set(
    store.projectMemberships
      .filter((membership) => membership.userId === userId)
      .map((membership) => membership.projectId),
  );

  return store.projects.filter((project) => membershipIds.has(project.id));
}

export function getProjectForUser(userId: string, projectId: string): Project | null {
  return getProjectsForUser(userId).find((project) => project.id === projectId) ?? null;
}

export function createProject(params: {
  userId: string;
  name: string;
  role: UserRole;
  awsRegion?: string;
}): Project {
  const store = getStore();
  const project = createProjectRecord({
    name: params.name,
    ownerUserId: params.userId,
    awsRegion: params.awsRegion ?? DEFAULT_REGION,
  });

  store.projects.unshift(project);
  store.projectMemberships.unshift(
    createMembershipRecord({
      projectId: project.id,
      userId: params.userId,
      role: params.role,
    }),
  );
  persistStore();
  return project;
}

export function upsertIntegration(config: IntegrationConfig): IntegrationConfig {
  const store = getStore();
  store.integrations = [
    config,
    ...store.integrations.filter(
      (item) => !(item.workspaceId === config.workspaceId && item.type === config.type),
    ),
  ];
  persistStore();
  return config;
}

export function getIntegrations(workspaceId?: string): IntegrationConfig[] {
  const store = getStore();
  return store.integrations.filter((integration) =>
    workspaceId ? integration.workspaceId === workspaceId : true,
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

export function getNotificationsByWorkspace(workspaceId: string) {
  const store = getStore();
  return store.notifications.filter((notification) => notification.workspaceId === workspaceId);
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

export function getAudits(workspaceId?: string) {
  const store = getStore();
  return store.audits.filter((audit) => (workspaceId ? audit.workspaceId === workspaceId : true));
}

export function getLatestAnalysis(workspaceId?: string): AnalysisSnapshot | null {
  const store = getStore();
  return (
    store.analyses.find((analysis) =>
      workspaceId ? analysis.workspaceId === workspaceId : true,
    ) ?? null
  );
}

export function getAnalysisById(
  analysisId: string,
  workspaceId?: string,
): AnalysisSnapshot | null {
  const store = getStore();
  return (
    store.analyses.find(
      (analysis) =>
        analysis.id === analysisId &&
        (workspaceId ? analysis.workspaceId === workspaceId : true),
    ) ?? null
  );
}

export function getRecommendationsByAnalysis(
  analysisId: string,
  workspaceId?: string,
): Recommendation[] {
  const store = getStore();
  return store.recommendations.filter(
    (recommendation) =>
      recommendation.analysisId === analysisId &&
      (workspaceId ? recommendation.workspaceId === workspaceId : true),
  );
}

export function getRecommendationById(
  recommendationId: string,
  workspaceId?: string,
): Recommendation | null {
  const store = getStore();
  return (
    store.recommendations.find(
      (recommendation) =>
        recommendation.id === recommendationId &&
        (workspaceId ? recommendation.workspaceId === workspaceId : true),
    ) ?? null
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
  backendUserId?: string;
  backendLoginId?: string;
  backendEmail?: string;
  backendAccessToken?: string;
  backendTokenType?: string;
}): UserSession {
  const store = getStore();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt);
  expiresAt.setHours(expiresAt.getHours() + (params.ttlHours ?? 8));

  const user = store.authUsers.find((item) => item.userId === params.userId) ?? null;
  const accessibleProjects = getProjectsForUser(params.userId);
  const workspaceId =
    (params.workspaceId &&
    accessibleProjects.some((project) => project.id === params.workspaceId)
      ? params.workspaceId
      : undefined) ??
    user?.defaultProjectId ??
    accessibleProjects[0]?.id ??
    store.workspaceId;

  const session: UserSession = {
    token: createId("sess"),
    userId: params.userId,
    name: params.name,
    role: params.role,
    workspaceId,
    backendUserId: params.backendUserId,
    backendLoginId: params.backendLoginId,
    backendEmail: params.backendEmail,
    backendAccessToken: params.backendAccessToken,
    backendTokenType: params.backendTokenType,
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

export function setSessionWorkspace(token: string, workspaceId: string): UserSession | null {
  const store = getStore();
  const session = store.sessions.find((item) => item.token === token) ?? null;
  if (!session) return null;

  if (!getProjectForUser(session.userId, workspaceId)) {
    return null;
  }

  session.workspaceId = workspaceId;
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

export function getAuthUserById(userId: string): AuthUser | null {
  const store = getStore();
  return store.authUsers.find((user) => user.userId === userId) ?? null;
}

export function createAuthUser(params: {
  userId?: string;
  loginId: string;
  password: string;
  name: string;
  role: UserRole;
  backendUserId?: string;
  email?: string;
}): AuthUser {
  const store = getStore();
  const existing = getAuthUserByLoginId(params.loginId);
  if (existing) {
    existing.name = params.name;
    existing.role = params.role;
    existing.email = params.email ?? existing.email;
    existing.backendUserId = params.backendUserId ?? existing.backendUserId;
    if (!existing.defaultProjectId || !getProjectById(existing.defaultProjectId)) {
      const project = createProjectRecord({
        name: createProjectName(params.name),
        ownerUserId: existing.userId,
      });
      existing.defaultProjectId = project.id;
      store.projects.unshift(project);
      store.projectMemberships.unshift(
        createMembershipRecord({
          projectId: project.id,
          userId: existing.userId,
          role: existing.role,
        }),
      );
    }
    persistStore();
    return existing;
  }

  const password = hashPassword(params.password);
  const user: AuthUser = {
    userId: params.userId ?? createId("user"),
    loginId: params.loginId,
    backendUserId: params.backendUserId,
    email: params.email,
    passwordHash: password.passwordHash,
    passwordSalt: password.passwordSalt,
    name: params.name,
    role: params.role,
    createdAt: nowIso(),
  };

  const project = createProjectRecord({
    name: createProjectName(params.name),
    ownerUserId: user.userId,
  });
  user.defaultProjectId = project.id;

  store.authUsers.unshift(user);
  store.projects.unshift(project);
  store.projectMemberships.unshift(
    createMembershipRecord({
      projectId: project.id,
      userId: user.userId,
      role: params.role,
    }),
  );
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
