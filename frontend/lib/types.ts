export type IntegrationType = "aws" | "k8s" | "prometheus";

export type IntegrationStatus = "active" | "partial" | "failed";

export type UserRole =
  | "system_admin"
  | "company_admin"
  | "company_operator";

export type RecommendationDomain =
  | "compute"
  | "storage"
  | "database"
  | "network"
  | "eks"
  | "finops";

export type RecommendationStatus =
  | "draft"
  | "reviewed"
  | "approved"
  | "rejected";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ReportTemplateType = "executive" | "execution";

export type AlertSeverity = "info" | "warning" | "critical";

export interface SourceCoverage {
  aws: boolean;
  k8s: boolean;
  prometheus: boolean;
}

export interface Project {
  id: string;
  name: string;
  ownerUserId: string;
  awsRegion: string;
  createdAt: string;
}

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  role: UserRole;
  createdAt: string;
}

export interface IntegrationConfig {
  id: string;
  type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  workspaceId: string;
  connectedAt: string;
  validatedAt: string;
  meta: Record<string, string>;
}

export interface RuleTrace {
  ruleId: string;
  principleName: string;
  awsDocUrl: string;
  ruleVersion: string;
}

export interface RecommendationEvidence {
  summary: string;
  lookbackDays: number;
  metrics: Array<{
    key: string;
    value: number;
    unit: string;
  }>;
}

export interface Recommendation {
  id: string;
  analysisId: string;
  workspaceId: string;
  domain: RecommendationDomain;
  title: string;
  description: string;
  targetResource: string;
  status: RecommendationStatus;
  confidenceScore: number;
  riskLevel: RiskLevel;
  estMonthlySaving: number;
  estAnnualSaving: number;
  commandSnippet: string;
  rollbackSnippet: string;
  evidence: RecommendationEvidence;
  ruleTrace: RuleTrace;
  createdAt: string;
  updatedAt: string;
}

export interface InfrastructureResource {
  id: string;
  name: string;
  type: string;
  region?: string;
  status: string;
  cpuUsagePercent: number | null;
  memoryUsagePercent: number | null;
  monthlyCost: number;
  riskLevel: RiskLevel;
}

export interface CostBreakdownItem {
  service: string;
  usageType: string;
  monthlyCost: number;
  region: string;
  resourceCount: number;
}

export interface PillarScore {
  pillarKey:
    | "operational_excellence"
    | "security"
    | "reliability"
    | "performance_efficiency"
    | "cost_optimization"
    | "sustainability"
    | "finops";
  pillarName: string;
  maxScore: number;
  score: number;
  deduction: number;
}

export interface ScoreBreakdown {
  totalScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  confidencePercent: number;
  pillars: PillarScore[];
}

export interface AnalysisSnapshot {
  id: string;
  workspaceId: string;
  triggeredBy: "manual" | "scheduled";
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt: string;
  completedAt: string;
  lookbackDays: number;
  periodStart: string;
  periodEnd: string;
  awsRegion: string;
  sourceCoverage: SourceCoverage;
  totalMonthlyCost: number;
  wasteCost: number;
  potentialMonthlySaving: number;
  potentialAnnualSaving: number;
  score: ScoreBreakdown;
  recommendationIds: string[];
  resources: InfrastructureResource[];
  costBreakdown: CostBreakdownItem[];
  warnings: string[];
}

export interface ApprovalLog {
  id: string;
  workspaceId: string;
  recommendationId: string;
  actor: string;
  action: "approved" | "rejected";
  note: string;
  createdAt: string;
}

export interface ReportArtifact {
  id: string;
  workspaceId: string;
  analysisId: string;
  templateType: ReportTemplateType;
  createdBy: string;
  createdAt: string;
  previewUrl: string;
  exportUrl: string;
  payload: {
    totalScore: number;
    grade: string;
    monthlySaving: number;
    annualSaving: number;
    topRecommendationTitles: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  workspaceId: string;
  analysisId: string;
  pinnedRecommendationId?: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  workspaceId: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface UserSession {
  token: string;
  userId: string;
  name: string;
  role: UserRole;
  workspaceId: string;
  backendUserId?: string;
  backendLoginId?: string;
  backendEmail?: string;
  backendAccessToken?: string;
  backendTokenType?: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthUser {
  userId: string;
  loginId: string;
  backendUserId?: string;
  email?: string;
  passwordHash: string;
  passwordSalt: string;
  defaultProjectId?: string;
  password?: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  workspaceId?: string;
  actor: string;
  actorRole: UserRole;
  action:
    | "integration.create"
    | "analysis.run"
    | "recommendation.approve"
    | "recommendation.reject"
    | "report.generate"
    | "command.copy"
    | "auth.login"
    | "auth.logout"
    | "project.select"
    | "project.create";
  targetType:
    | "integration"
    | "analysis"
    | "recommendation"
    | "report"
    | "execution"
    | "auth"
    | "project";
  targetId: string;
  result: "success" | "forbidden" | "failed";
  metadata?: Record<string, string>;
  createdAt: string;
}
