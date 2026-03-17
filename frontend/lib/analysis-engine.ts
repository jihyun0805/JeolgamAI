import {
  AnalysisSnapshot,
  ApprovalLog,
  IntegrationConfig,
  PillarScore,
  Recommendation,
  RecommendationDomain,
  RecommendationStatus,
  RiskLevel,
  ScoreBreakdown,
} from "@/lib/types";
import { AWS_SEOUL_REGION, buildCostBreakdown, buildProjectResources } from "@/lib/project-data";
import {
  addNotification,
  createId,
  getIntegrations,
  getProjectById,
  getStore,
  nowIso,
  persistStore,
} from "@/lib/store";

const PILLAR_TEMPLATE: Array<{
  key: PillarScore["pillarKey"];
  name: string;
  max: number;
}> = [
  { key: "operational_excellence", name: "Operational Excellence", max: 12 },
  { key: "security", name: "Security", max: 12 },
  { key: "reliability", name: "Reliability", max: 12 },
  { key: "performance_efficiency", name: "Performance Efficiency", max: 12 },
  { key: "cost_optimization", name: "Cost Optimization", max: 16 },
  { key: "sustainability", name: "Sustainability", max: 16 },
  { key: "finops", name: "FinOps", max: 20 },
];

function getDomainToPillar(domain: RecommendationDomain): PillarScore["pillarKey"] {
  switch (domain) {
    case "compute":
      return "performance_efficiency";
    case "storage":
      return "sustainability";
    case "database":
      return "reliability";
    case "network":
      return "security";
    case "eks":
      return "operational_excellence";
    case "finops":
      return "finops";
    default:
      return "cost_optimization";
  }
}

function getCoverage(workspaceId: string) {
  const integrations = getIntegrations(workspaceId);
  const byType = new Map(integrations.map((item) => [item.type, item]));

  const isConnected = (config: IntegrationConfig | undefined) =>
    Boolean(config && (config.status === "active" || config.status === "partial"));

  return {
    aws: isConnected(byType.get("aws")),
    k8s: isConnected(byType.get("k8s")),
    prometheus: isConnected(byType.get("prometheus")),
  };
}

function buildRecommendationInput(params: {
  workspaceId: string;
  coverage: { aws: boolean; k8s: boolean; prometheus: boolean };
  lookbackDays: number;
}) {
  const project = getProjectById(params.workspaceId);
  const resources = buildProjectResources({
    id: params.workspaceId,
    name: project?.name ?? "Project",
    awsRegion: project?.awsRegion ?? AWS_SEOUL_REGION,
  });

  const byType = {
    ec2Api: resources.find((resource) => resource.id.endsWith("-ec2-api")) ?? resources[0],
    ebs: resources.find((resource) => resource.id.endsWith("-ebs")) ?? resources[0],
    s3: resources.find((resource) => resource.id.endsWith("-s3")) ?? resources[0],
    rds: resources.find((resource) => resource.id.endsWith("-rds")) ?? resources[0],
    nat: resources.find((resource) => resource.id.endsWith("-nat")) ?? resources[0],
    eks: resources.find((resource) => resource.id.endsWith("-eks")) ?? resources[0],
  };

  const region = project?.awsRegion ?? AWS_SEOUL_REGION;
  const items: Array<{
    domain: RecommendationDomain;
    title: string;
    description: string;
    resource: string;
    saving: number;
    confidence: number;
    risk: RiskLevel;
    command: string;
    rollback: string;
    ruleId: string;
    principle: string;
    docUrl: string;
    metrics: Array<{ key: string; value: number; unit: string }>;
  }> = [];

  if (params.coverage.aws) {
    items.push(
      {
        domain: "compute",
        title: "서울 리전 EC2 API 워크로드 라이트사이징",
        description:
          "서울 리전에서 저사용 API 인스턴스를 한 단계 다운사이징해 월 비용과 낭비율을 함께 줄입니다.",
        resource: byType.ec2Api.id,
        saving: Math.round(byType.ec2Api.monthlyCost * 0.34),
        confidence: 0.96,
        risk: "medium",
        command: `aws ec2 modify-instance-attribute --region ${region} --instance-id ${byType.ec2Api.id} --instance-type '{"Value":"m7i.large"}'`,
        rollback: `aws ec2 modify-instance-attribute --region ${region} --instance-id ${byType.ec2Api.id} --instance-type '{"Value":"m7i.xlarge"}'`,
        ruleId: "WA-COST-EC2-RIGHTSIZE-SEOUL-001",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html",
        metrics: [
          { key: "cpu_p95", value: byType.ec2Api.cpuUsagePercent ?? 0, unit: "%" },
          { key: "memory_p95", value: byType.ec2Api.memoryUsagePercent ?? 0, unit: "%" },
        ],
      },
      {
        domain: "storage",
        title: "서울 리전 미연결 EBS 정리 및 gp3 표준화",
        description:
          "서울 리전의 유휴 볼륨을 정리하고 gp3로 표준화해 즉시 절감 가능한 저장소 비용을 회수합니다.",
        resource: byType.ebs.id,
        saving: Math.round(byType.ebs.monthlyCost * 0.82),
        confidence: 0.94,
        risk: "low",
        command: `aws ec2 modify-volume --region ${region} --volume-id ${byType.ebs.id} --volume-type gp3`,
        rollback: `aws ec2 modify-volume --region ${region} --volume-id ${byType.ebs.id} --volume-type gp2`,
        ruleId: "WA-COST-EBS-SEOUL-002",
        principle: "Well-Architected: Cost Optimization",
        docUrl: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/general-purpose.html",
        metrics: [{ key: "volume_utilization", value: 4.1, unit: "%" }],
      },
      {
        domain: "database",
        title: "서울 리전 Aurora 용량 계획 재조정",
        description:
          "지속 사용 DB는 RI 또는 한 단계 낮은 클래스 검토가 가능하며, 메모리 headroom을 감안해 비용을 절감합니다.",
        resource: byType.rds.id,
        saving: Math.round(byType.rds.monthlyCost * 0.22),
        confidence: 0.9,
        risk: "low",
        command:
          "aws rds modify-db-instance --apply-immediately --db-instance-identifier <db-id> --db-instance-class db.r6g.large",
        rollback:
          "aws rds modify-db-instance --apply-immediately --db-instance-identifier <db-id> --db-instance-class db.r6g.xlarge",
        ruleId: "WA-COST-RDS-SEOUL-003",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html",
        metrics: [
          { key: "cpu_avg", value: byType.rds.cpuUsagePercent ?? 0, unit: "%" },
          { key: "memory_avg", value: byType.rds.memoryUsagePercent ?? 0, unit: "%" },
        ],
      },
      {
        domain: "network",
        title: "서울 리전 NAT Gateway 트래픽 오프로드",
        description:
          "S3/ECR 트래픽을 Gateway Endpoint로 전환해 서울 리전 NAT Data Processing 비용을 절감합니다.",
        resource: byType.nat.id,
        saving: Math.round(byType.nat.monthlyCost * 0.41),
        confidence: 0.91,
        risk: "medium",
        command:
          `aws ec2 create-vpc-endpoint --region ${region} --vpc-id <vpc-id> --service-name com.amazonaws.${region}.s3 --vpc-endpoint-type Gateway`,
        rollback: `aws ec2 delete-vpc-endpoint --region ${region} --vpc-endpoint-id <vpce-id>`,
        ruleId: "WA-COST-NETWORK-SEOUL-004",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html",
        metrics: [
          { key: "nat_data_processed", value: 3.8, unit: "TB/month" },
          { key: "cross_az_ratio", value: 31, unit: "%" },
        ],
      },
      {
        domain: "storage",
        title: "S3 로그 버킷 Lifecycle 최적화",
        description:
          "서울 리전 로그 버킷에 Lifecycle 정책을 적용해 Standard-IA 및 Glacier로 자동 이관합니다.",
        resource: byType.s3.id,
        saving: Math.round(byType.s3.monthlyCost * 0.36),
        confidence: 0.88,
        risk: "low",
        command: `aws s3api put-bucket-lifecycle-configuration --region ${region} --bucket ${byType.s3.name.toLowerCase()} --lifecycle-configuration file://s3-lifecycle.json`,
        rollback: `aws s3api delete-bucket-lifecycle --region ${region} --bucket ${byType.s3.name.toLowerCase()}`,
        ruleId: "WA-COST-S3-SEOUL-005",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html",
        metrics: [
          { key: "cold_object_ratio", value: 69, unit: "%" },
          { key: "avg_object_age", value: params.lookbackDays + 42, unit: "days" },
        ],
      },
    );
  }

  if (params.coverage.k8s) {
    items.push({
      domain: "eks",
      title: "EKS 노드그룹 요청/제한 재조정",
      description:
        "서울 리전 EKS 워크로드의 requests/limits를 실제 사용량 기준으로 조정해 노드 과할당을 완화합니다.",
      resource: byType.eks.id,
      saving: Math.round(byType.eks.monthlyCost * 0.19),
      confidence: 0.86,
      risk: "medium",
      command:
        "kubectl set resources deployment api -n prod --requests=cpu=250m,memory=384Mi --limits=cpu=700m,memory=768Mi",
      rollback: "kubectl rollout undo deployment/api -n prod",
      ruleId: "WA-EKS-SEOUL-006",
      principle: "Well-Architected: Performance Efficiency",
      docUrl:
        "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/",
      metrics: [
        { key: "cpu_request_utilization", value: 29, unit: "%" },
        { key: "memory_request_utilization", value: 44, unit: "%" },
      ],
    });
  }

  if (params.coverage.prometheus) {
    items.push({
      domain: "finops",
      title: "Prometheus 기반 유휴 리소스 자동 태깅",
      description:
        "Prometheus 지표 기반으로 장기간 유휴 리소스를 태깅해 승인 전용 절감 후보군을 자동 분류합니다.",
      resource: "prometheus/idleness-policy",
      saving: Math.round((byType.ec2Api.monthlyCost + byType.eks.monthlyCost) * 0.09),
      confidence: 0.84,
      risk: "low",
      command: "kubectl apply -f finops-idle-rule.yaml",
      rollback: "kubectl delete -f finops-idle-rule.yaml",
      ruleId: "WA-PROM-SEOUL-007",
      principle: "Well-Architected: Operational Excellence",
      docUrl: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/",
      metrics: [
        { key: "idle_candidates", value: 7, unit: "count" },
        { key: "latency_p95", value: 173, unit: "ms" },
      ],
    });
  }

  if (!params.coverage.aws && !params.coverage.k8s && !params.coverage.prometheus) {
    items.push({
      domain: "finops",
      title: "AWS/Prometheus/K8s 연동 우선",
      description:
        "실제 프로젝트별 비용과 인프라 분석을 위해 서울 리전 AWS, Prometheus, Kubernetes 연동을 먼저 완료해야 합니다.",
      resource: "integration",
      saving: 0,
      confidence: 0.35,
      risk: "low",
      command: "# 설정에서 AWS 서울 리전 및 Prometheus/Kubernetes 연동을 먼저 등록하세요",
      rollback: "# 해당 없음",
      ruleId: "WA-DATA-COVERAGE-000",
      principle: "Data Coverage Baseline",
      docUrl: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
      metrics: [{ key: "coverage", value: 0, unit: "%" }],
    });
  }

  return items;
}

function calculateScoreBreakdown(
  recommendations: Recommendation[],
  coverage: { aws: boolean; k8s: boolean; prometheus: boolean },
  lookbackDays: number,
): ScoreBreakdown {
  const pillarMap = new Map(
    PILLAR_TEMPLATE.map((pillar) => [
      pillar.key,
      {
        pillarKey: pillar.key,
        pillarName: pillar.name,
        maxScore: pillar.max,
        score: pillar.max,
        deduction: 0,
      } satisfies PillarScore,
    ]),
  );

  if (!coverage.aws) {
    const cost = pillarMap.get("cost_optimization");
    const finops = pillarMap.get("finops");
    if (cost) {
      cost.deduction += 4;
      cost.score = Math.max(0, cost.score - 4);
    }
    if (finops) {
      finops.deduction += 6;
      finops.score = Math.max(0, finops.score - 6);
    }
  }

  if (!coverage.k8s) {
    const operational = pillarMap.get("operational_excellence");
    const perf = pillarMap.get("performance_efficiency");
    if (operational) {
      operational.deduction += 3;
      operational.score = Math.max(0, operational.score - 3);
    }
    if (perf) {
      perf.deduction += 2;
      perf.score = Math.max(0, perf.score - 2);
    }
  }

  if (!coverage.prometheus) {
    const operational = pillarMap.get("operational_excellence");
    const reliability = pillarMap.get("reliability");
    if (operational) {
      operational.deduction += 2;
      operational.score = Math.max(0, operational.score - 2);
    }
    if (reliability) {
      reliability.deduction += 3;
      reliability.score = Math.max(0, reliability.score - 3);
    }
  }

  recommendations.forEach((recommendation) => {
    const pillar = pillarMap.get(getDomainToPillar(recommendation.domain));
    if (!pillar) return;

    const riskWeight =
      recommendation.riskLevel === "critical"
        ? 8
        : recommendation.riskLevel === "high"
          ? 6
          : recommendation.riskLevel === "medium"
            ? 4
            : 2;

    const confidencePenalty = Math.round((1 - recommendation.confidenceScore) * 4);
    const deduction = Math.min(8, riskWeight + confidencePenalty);

    pillar.deduction += deduction;
    pillar.score = Math.max(0, pillar.score - deduction);
  });

  const pillars = Array.from(pillarMap.values()).map((pillar) => ({
    ...pillar,
    score: Math.round(pillar.score * 10) / 10,
    deduction: Math.round(pillar.deduction * 10) / 10,
  }));

  const totalScore = Math.max(
    0,
    Math.min(100, Math.round(pillars.reduce((acc, pillar) => acc + pillar.score, 0))),
  );

  let grade: ScoreBreakdown["grade"] = "F";
  if (totalScore >= 90) grade = "A";
  else if (totalScore >= 80) grade = "B";
  else if (totalScore >= 70) grade = "C";
  else if (totalScore >= 60) grade = "D";

  let confidencePercent = 100;
  if (!coverage.aws) confidencePercent -= 25;
  if (!coverage.k8s) confidencePercent -= 15;
  if (!coverage.prometheus) confidencePercent -= 20;
  if (lookbackDays < 14) confidencePercent -= 10;
  confidencePercent = Math.max(45, confidencePercent);

  return {
    totalScore,
    grade,
    confidencePercent,
    pillars,
  };
}

export function runAnalysis(params?: {
  lookbackDays?: number;
  triggeredBy?: AnalysisSnapshot["triggeredBy"];
  workspaceId?: string;
}): AnalysisSnapshot {
  const store = getStore();
  const workspaceId = params?.workspaceId ?? store.workspaceId;
  const project = getProjectById(workspaceId);
  const now = nowIso();
  const lookbackDays = params?.lookbackDays ?? 30;
  const periodEndDate = new Date();
  const periodStartDate = new Date(periodEndDate);
  periodStartDate.setDate(periodEndDate.getDate() - lookbackDays);

  const coverage = getCoverage(workspaceId);
  const resources = buildProjectResources({
    id: workspaceId,
    name: project?.name ?? "Project",
    awsRegion: project?.awsRegion ?? AWS_SEOUL_REGION,
  });
  const recommendationInput = buildRecommendationInput({
    workspaceId,
    coverage,
    lookbackDays,
  });
  const analysisId = createId("analysis");

  const recommendations: Recommendation[] = recommendationInput.map((item) => {
    const status: RecommendationStatus = "reviewed";
    return {
      id: createId("rec"),
      analysisId,
      workspaceId,
      domain: item.domain,
      title: item.title,
      description: item.description,
      targetResource: item.resource,
      status,
      confidenceScore: item.confidence,
      riskLevel: item.risk,
      estMonthlySaving: item.saving,
      estAnnualSaving: item.saving * 12,
      commandSnippet: item.command,
      rollbackSnippet: item.rollback,
      evidence: {
        summary: `${lookbackDays}일 관측 구간에서 수집된 서울 리전 메트릭을 기반으로 계산되었습니다.`,
        lookbackDays,
        metrics: item.metrics,
      },
      ruleTrace: {
        ruleId: item.ruleId,
        principleName: item.principle,
        awsDocUrl: item.docUrl,
        ruleVersion: "2026.03",
      },
      createdAt: now,
      updatedAt: now,
    };
  });

  const totalMonthlyCost = resources.reduce((acc, resource) => acc + resource.monthlyCost, 0);
  const potentialMonthlySaving = recommendations.reduce(
    (acc, recommendation) => acc + recommendation.estMonthlySaving,
    0,
  );
  const wasteCost = Math.round(totalMonthlyCost * 0.294);
  const score = calculateScoreBreakdown(recommendations, coverage, lookbackDays);

  const snapshot: AnalysisSnapshot = {
    id: analysisId,
    workspaceId,
    triggeredBy: params?.triggeredBy ?? "manual",
    status: "completed",
    createdAt: now,
    startedAt: now,
    completedAt: now,
    lookbackDays,
    periodStart: periodStartDate.toISOString(),
    periodEnd: periodEndDate.toISOString(),
    awsRegion: project?.awsRegion ?? AWS_SEOUL_REGION,
    sourceCoverage: coverage,
    totalMonthlyCost,
    wasteCost,
    potentialMonthlySaving,
    potentialAnnualSaving: potentialMonthlySaving * 12,
    score,
    recommendationIds: recommendations.map((recommendation) => recommendation.id),
    resources,
    costBreakdown: buildCostBreakdown(resources),
    warnings: [
      `비용 분석은 AWS 서울 리전(${project?.awsRegion ?? AWS_SEOUL_REGION}) 기준입니다.`,
      ...(!coverage.aws ? ["AWS 연동이 없어 비용 데이터 신뢰도가 낮습니다."] : []),
      ...(!coverage.k8s
        ? ["Kubernetes 연동이 없어 컨테이너 레벨 최적화 분석이 제한됩니다."]
        : []),
      ...(!coverage.prometheus
        ? ["Prometheus 연동이 없어 지표 기반 이상 탐지가 제한됩니다."]
        : []),
    ],
  };

  store.recommendations = [
    ...recommendations,
    ...store.recommendations.filter(
      (recommendation) => recommendation.analysisId !== analysisId,
    ),
  ];
  store.analyses.unshift(snapshot);

  addNotification({
    workspaceId,
    severity: "info",
    title: "프로젝트 비용 분석이 완료되었습니다",
    body: `${project?.name ?? "프로젝트"} · ${score.totalScore}점 (${score.grade}) · 월 절감 예상 ${potentialMonthlySaving.toLocaleString("ko-KR")}원`,
  });

  const criticalCount = recommendations.filter(
    (recommendation) => recommendation.riskLevel === "critical",
  ).length;
  if (criticalCount > 0) {
    addNotification({
      workspaceId,
      severity: "critical",
      title: "Critical 권고가 감지되었습니다",
      body: `즉시 검토가 필요한 권고 ${criticalCount}건`,
    });
  }

  persistStore();
  return snapshot;
}

export function approveRecommendation(params: {
  recommendationId: string;
  actor: string;
  action: "approved" | "rejected";
  note?: string;
  workspaceId?: string;
}): { recommendation: Recommendation; log: ApprovalLog } | null {
  const store = getStore();
  const recommendation = store.recommendations.find(
    (item) =>
      item.id === params.recommendationId &&
      (params.workspaceId ? item.workspaceId === params.workspaceId : true),
  );

  if (!recommendation) return null;

  recommendation.status = params.action === "approved" ? "approved" : "rejected";
  recommendation.updatedAt = nowIso();

  const log: ApprovalLog = {
    id: createId("approval"),
    workspaceId: recommendation.workspaceId,
    recommendationId: recommendation.id,
    actor: params.actor,
    action: params.action,
    note: params.note ?? "",
    createdAt: nowIso(),
  };

  store.approvals.unshift(log);

  addNotification({
    workspaceId: recommendation.workspaceId,
    severity: params.action === "approved" ? "info" : "warning",
    title:
      params.action === "approved"
        ? "권고가 승인되었습니다"
        : "권고가 반려되었습니다",
    body: `${recommendation.title} (${recommendation.id})`,
  });

  persistStore();
  return { recommendation, log };
}
