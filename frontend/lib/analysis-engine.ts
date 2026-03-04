import {
  AnalysisSnapshot,
  ApprovalLog,
  IntegrationConfig,
  InfrastructureResource,
  PillarScore,
  Recommendation,
  RecommendationDomain,
  RecommendationStatus,
  RiskLevel,
  ScoreBreakdown,
} from "@/lib/types";
import {
  addNotification,
  createId,
  getIntegrations,
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

function getCoverage() {
  const integrations = getIntegrations();
  const byType = new Map(integrations.map((item) => [item.type, item]));

  const isConnected = (config: IntegrationConfig | undefined) =>
    Boolean(config && (config.status === "active" || config.status === "partial"));

  return {
    aws: isConnected(byType.get("aws")),
    k8s: isConnected(byType.get("k8s")),
    prometheus: isConnected(byType.get("prometheus")),
  };
}

function buildResources(): InfrastructureResource[] {
  return [
    {
      id: "i-0a1b2c3d4e5f6g",
      name: "PROD-WEB-01",
      type: "ec2.t3.large",
      status: "running",
      cpuUsagePercent: 78.2,
      memoryUsagePercent: 64.5,
      monthlyCost: 112400,
      riskLevel: "low",
    },
    {
      id: "i-07823ab45c67",
      name: "PROD-API-EXT",
      type: "ec2.m5.xlarge",
      status: "warning",
      cpuUsagePercent: 0.8,
      memoryUsagePercent: 12.2,
      monthlyCost: 320800,
      riskLevel: "high",
    },
    {
      id: "i-0ff9123aac9d0a1f",
      name: "BATCH-WORKER-01",
      type: "ec2.c6i.2xlarge",
      status: "running",
      cpuUsagePercent: 22.4,
      memoryUsagePercent: 34.8,
      monthlyCost: 418000,
      riskLevel: "medium",
    },
    {
      id: "db-prod-main",
      name: "Aurora PostgreSQL",
      type: "rds.db.r6g.large",
      status: "available",
      cpuUsagePercent: 42.1,
      memoryUsagePercent: 82.8,
      monthlyCost: 542000,
      riskLevel: "medium",
    },
    {
      id: "s3-prod-logs",
      name: "S3 PROD Logs Bucket",
      type: "s3.standard",
      status: "available",
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      monthlyCost: 186000,
      riskLevel: "medium",
    },
    {
      id: "nat-gw-apne2a-01",
      name: "NAT Gateway APNE2A",
      type: "network.nat-gateway",
      status: "warning",
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      monthlyCost: 264000,
      riskLevel: "high",
    },
    {
      id: "alb-prod-edge-01",
      name: "ALB PROD EDGE",
      type: "network.alb",
      status: "running",
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      monthlyCost: 138000,
      riskLevel: "medium",
    },
    {
      id: "vol-02948bc12e",
      name: "DISK-LOGS",
      type: "ebs.gp3.500gb",
      status: "unused",
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      monthlyCost: 45500,
      riskLevel: "critical",
    },
    {
      id: "eks-nodegroup-prod-general",
      name: "EKS NodeGroup Prod General",
      type: "eks.mng.m5.large",
      status: "running",
      cpuUsagePercent: 31.4,
      memoryUsagePercent: 45.3,
      monthlyCost: 512000,
      riskLevel: "medium",
    },
    {
      id: "cloudfront-prod-main",
      name: "CloudFront Prod Main",
      type: "network.cloudfront",
      status: "available",
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      monthlyCost: 119000,
      riskLevel: "low",
    },
  ];
}

function buildRecommendationInput(coverage: {
  aws: boolean;
  k8s: boolean;
  prometheus: boolean;
}) {
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

  if (coverage.aws) {
    items.push(
      {
        domain: "compute",
        title: "EC2 인스턴스 라이트사이징",
        description:
          "7일 이상 저사용 인스턴스를 t3.medium 클래스 중심으로 다운사이징하여 비용과 낭비율을 동시 절감합니다.",
        resource: "i-07823ab45c67",
        saving: 3200000,
        confidence: 0.98,
        risk: "medium",
        command:
          "aws ec2 modify-instance-attribute --instance-id i-07823ab45c67 --instance-type '{\"Value\":\"t3.medium\"}'",
        rollback:
          "aws ec2 modify-instance-attribute --instance-id i-07823ab45c67 --instance-type '{\"Value\":\"m5.xlarge\"}'",
        ruleId: "WA-COST-EC2-RIGHTSIZE-001",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html",
        metrics: [
          { key: "cpu_p95", value: 1.1, unit: "%" },
          { key: "mem_p95", value: 14.2, unit: "%" },
        ],
      },
      {
        domain: "compute",
        title: "배치 워커 스케줄링 최적화",
        description:
          "비업무 시간대에 배치 워커 노드를 자동 축소하도록 스케줄 정책을 적용해 컴퓨트 낭비를 줄입니다.",
        resource: "i-0ff9123aac9d0a1f",
        saving: 980000,
        confidence: 0.91,
        risk: "low",
        command:
          "aws autoscaling put-scheduled-update-group-action --auto-scaling-group-name batch-workers --scheduled-action-name scale-down-night --recurrence '0 20 * * 1-5' --desired-capacity 0",
        rollback:
          "aws autoscaling delete-scheduled-action --auto-scaling-group-name batch-workers --scheduled-action-name scale-down-night",
        ruleId: "WA-COST-EC2-SCHEDULE-006",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html",
        metrics: [
          { key: "offhour_cpu_avg", value: 3.7, unit: "%" },
          { key: "offhour_running_hours", value: 224, unit: "h/month" },
        ],
      },
      {
        domain: "storage",
        title: "EBS gp2 -> gp3 전환",
        description:
          "미사용 또는 저성능 요구 워크로드의 gp2 볼륨을 gp3로 전환해 저장소 단가를 개선합니다.",
        resource: "vol-02948bc12e",
        saving: 45000,
        confidence: 0.93,
        risk: "low",
        command:
          "aws ec2 modify-volume --volume-id vol-02948bc12e --volume-type gp3",
        rollback:
          "aws ec2 modify-volume --volume-id vol-02948bc12e --volume-type gp2",
        ruleId: "WA-COST-EBS-TIER-004",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/general-purpose.html",
        metrics: [{ key: "volume_utilization", value: 3.2, unit: "%" }],
      },
      {
        domain: "storage",
        title: "S3 Lifecycle 정책 적용 (Standard -> IA/Glacier)",
        description:
          "30일 이상 미접근 객체를 S3 Standard-IA, 90일 이상 객체를 Glacier Instant Retrieval로 자동 전환합니다.",
        resource: "s3-prod-logs",
        saving: 640000,
        confidence: 0.89,
        risk: "low",
        command:
          "aws s3api put-bucket-lifecycle-configuration --bucket s3-prod-logs --lifecycle-configuration file://s3-lifecycle.json",
        rollback:
          "aws s3api delete-bucket-lifecycle --bucket s3-prod-logs",
        ruleId: "WA-COST-S3-LIFECYCLE-003",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html",
        metrics: [
          { key: "cold_object_ratio", value: 72, unit: "%" },
          { key: "avg_object_age", value: 118, unit: "days" },
        ],
      },
      {
        domain: "database",
        title: "RDS 예약 인스턴스 전환",
        description:
          "지속적으로 사용 중인 RDS 워크로드를 1년 RI로 전환해 장기 단가를 낮춥니다.",
        resource: "db-prod-main",
        saving: 1450000,
        confidence: 0.9,
        risk: "low",
        command:
          "aws rds purchase-reserved-db-instances-offering --reserved-db-instances-offering-id <offering-id>",
        rollback:
          "# RI 구매는 취소 불가. 만기 전까지 온디맨드 대비 절감 추적 필요",
        ruleId: "WA-COST-RDS-RI-002",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html",
        metrics: [{ key: "rds_ondemand_ratio", value: 100, unit: "%" }],
      },
      {
        domain: "network",
        title: "NAT Gateway 데이터 전송 최적화",
        description:
          "대역폭이 큰 ECR/S3 트래픽을 VPC Endpoint로 전환해 NAT Gateway data processing 비용을 절감합니다.",
        resource: "nat-gw-apne2a-01",
        saving: 870000,
        confidence: 0.92,
        risk: "medium",
        command:
          "aws ec2 create-vpc-endpoint --vpc-id <vpc-id> --service-name com.amazonaws.ap-northeast-2.s3 --vpc-endpoint-type Gateway",
        rollback:
          "aws ec2 delete-vpc-endpoint --vpc-endpoint-id <vpce-id>",
        ruleId: "WA-COST-NETWORK-ENDPOINT-008",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html",
        metrics: [
          { key: "nat_data_processed", value: 4.2, unit: "TB/month" },
          { key: "cross_az_traffic_ratio", value: 37, unit: "%" },
        ],
      },
      {
        domain: "network",
        title: "CloudFront 캐시 오프로드 확대",
        description:
          "정적 자산 캐시 정책을 강화해 ALB/EC2 원본 요청을 줄이고 전송비와 컴퓨트 부하를 동시에 낮춥니다.",
        resource: "cloudfront-prod-main",
        saving: 390000,
        confidence: 0.87,
        risk: "low",
        command:
          "aws cloudfront update-distribution --id <distribution-id> --if-match <etag> --distribution-config file://cf-cache-policy.json",
        rollback:
          "aws cloudfront update-distribution --id <distribution-id> --if-match <etag> --distribution-config file://cf-cache-policy-prev.json",
        ruleId: "WA-PERF-CDN-CACHE-012",
        principle: "Well-Architected: Performance Efficiency",
        docUrl:
          "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html",
        metrics: [
          { key: "cache_hit_ratio", value: 63, unit: "%" },
          { key: "origin_req_reduction", value: 41, unit: "%" },
        ],
      },
    );
  }

  if (coverage.k8s) {
    items.push(
      {
        domain: "eks",
        title: "K8s Requests/Limits 재조정",
        description:
          "실사용 대비 과도한 request/limit 설정을 다운사이징해 노드 과프로비저닝을 완화합니다.",
        resource: "namespace/prod",
        saving: 780000,
        confidence: 0.88,
        risk: "medium",
        command:
          "kubectl set resources deployment api -n prod --requests=cpu=200m,memory=256Mi --limits=cpu=500m,memory=512Mi",
        rollback:
          "kubectl rollout undo deployment/api -n prod",
        ruleId: "WA-PERF-K8S-RIGHTSIZE-011",
        principle: "Well-Architected: Performance Efficiency",
        docUrl:
          "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/",
        metrics: [
          { key: "cpu_request_utilization", value: 22, unit: "%" },
          { key: "memory_request_utilization", value: 39, unit: "%" },
        ],
      },
      {
        domain: "eks",
        title: "EKS 노드그룹 Spot 혼합 전략 적용",
        description:
          "온디맨드 위주의 노드그룹을 Spot 혼합으로 전환해 워크로드 안정성을 유지하면서 컴퓨트 비용을 낮춥니다.",
        resource: "eks-nodegroup-prod-general",
        saving: 1260000,
        confidence: 0.84,
        risk: "medium",
        command:
          "eksctl create nodegroup --cluster prod --name prod-spot-mix --spot --instance-types m5.large,m5a.large,m4.large --nodes 3",
        rollback:
          "eksctl delete nodegroup --cluster prod --name prod-spot-mix",
        ruleId: "WA-COST-EKS-SPOT-014",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html",
        metrics: [
          { key: "spot_eligible_workload_ratio", value: 58, unit: "%" },
          { key: "on_demand_node_ratio", value: 100, unit: "%" },
        ],
      },
    );
  }

  if (coverage.prometheus) {
    items.push(
      {
        domain: "finops",
        title: "Prometheus 기반 유휴 리소스 자동 태깅",
        description:
          "장기간 유휴 지표가 관측된 리소스를 자동 태깅해 정리 후보군과 승인 워크플로를 연결합니다.",
        resource: "prometheus/ruleset/idle-resource",
        saving: 520000,
        confidence: 0.86,
        risk: "low",
        command:
          "kubectl apply -f finops-idle-rule.yaml",
        rollback:
          "kubectl delete -f finops-idle-rule.yaml",
        ruleId: "WA-OPS-OBSERVABILITY-017",
        principle: "Well-Architected: Operational Excellence",
        docUrl:
          "https://aws.amazon.com/architecture/well-architected/",
        metrics: [{ key: "idle_candidates", value: 14, unit: "count" }],
      },
      {
        domain: "finops",
        title: "에러율 기반 과다 프로비저닝 자동 스케일백",
        description:
          "에러율/지연시간이 안정 범위일 때 과도한 replica를 자동으로 축소해 비용을 줄입니다.",
        resource: "prometheus/alert/scaleback",
        saving: 430000,
        confidence: 0.82,
        risk: "medium",
        command:
          "kubectl apply -f hpa-cost-optimized.yaml",
        rollback:
          "kubectl apply -f hpa-default.yaml",
        ruleId: "WA-FINOPS-AUTOSCALE-021",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/",
        metrics: [
          { key: "error_rate_p95", value: 0.07, unit: "%" },
          { key: "latency_p95", value: 213, unit: "ms" },
        ],
      },
    );
  }

  if (!coverage.aws && !coverage.k8s && !coverage.prometheus) {
    items.push(
      {
        domain: "finops",
        title: "데이터 소스 연동 우선",
        description:
          "분석 정확도를 위해 AWS/K8s/Prometheus 연동을 먼저 완료해야 합니다.",
        resource: "integration",
        saving: 0,
        confidence: 0.35,
        risk: "low",
        command: "# /integrations 페이지에서 데이터 소스를 연결하세요",
        rollback: "# 해당 없음",
        ruleId: "WA-DATA-COVERAGE-000",
        principle: "Data Coverage Baseline",
        docUrl: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
        metrics: [{ key: "coverage", value: 0, unit: "%" }],
      },
      {
        domain: "storage",
        title: "S3 수명주기 템플릿 적용 (예시)",
        description:
          "샘플 템플릿 기준으로 오래된 객체를 IA/Glacier로 전환하는 정책입니다. 실제 데이터 분석 전 가이드 전용 권고입니다.",
        resource: "s3-template",
        saving: 380000,
        confidence: 0.46,
        risk: "low",
        command: "# 샘플 정책: s3-lifecycle-template.json 적용",
        rollback: "# 샘플 정책 제거",
        ruleId: "DEMO-WA-S3-LIFECYCLE-001",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html",
        metrics: [{ key: "template_coverage", value: 100, unit: "%" }],
      },
      {
        domain: "compute",
        title: "EC2 라이트사이징 템플릿 (예시)",
        description:
          "CPU/메모리 저사용 패턴 인스턴스를 기준 크기로 자동 추천하는 템플릿입니다. 실제 연동 후 수치가 보정됩니다.",
        resource: "ec2-template",
        saving: 1120000,
        confidence: 0.44,
        risk: "medium",
        command: "# 샘플 명령: aws ec2 modify-instance-attribute ...",
        rollback: "# 샘플 롤백: 원본 타입 복원",
        ruleId: "DEMO-WA-EC2-RIGHTSIZE-002",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html",
        metrics: [{ key: "template_candidates", value: 24, unit: "count" }],
      },
      {
        domain: "network",
        title: "NAT 비용 절감 템플릿 (예시)",
        description:
          "S3/ECR VPC Endpoint 전환으로 NAT Data Processing을 줄이는 모범사례 템플릿입니다.",
        resource: "network-template",
        saving: 760000,
        confidence: 0.43,
        risk: "medium",
        command: "# 샘플 명령: aws ec2 create-vpc-endpoint ...",
        rollback: "# 샘플 롤백: 생성한 endpoint 삭제",
        ruleId: "DEMO-WA-NETWORK-ENDPOINT-003",
        principle: "Well-Architected: Cost Optimization",
        docUrl:
          "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html",
        metrics: [{ key: "template_nat_monthly_gb", value: 3200, unit: "GB" }],
      },
    );
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
    const rawDeduction = riskWeight + confidencePenalty;
    const deduction = Math.min(8, rawDeduction);

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
    Math.min(
      100,
      Math.round(pillars.reduce((acc, pillar) => acc + pillar.score, 0)),
    ),
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
}): AnalysisSnapshot {
  const store = getStore();
  const now = nowIso();
  const lookbackDays = params?.lookbackDays ?? 30;
  const periodEndDate = new Date();
  const periodStartDate = new Date(periodEndDate);
  periodStartDate.setDate(periodEndDate.getDate() - lookbackDays);

  const coverage = getCoverage();
  const resources = buildResources();

  const recommendationInput = buildRecommendationInput(coverage);
  const analysisId = createId("analysis");

  const recommendations: Recommendation[] = recommendationInput.map((item) => {
    const status: RecommendationStatus = "reviewed";
    return {
      id: createId("rec"),
      analysisId,
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
        summary: `${lookbackDays}일 관측 구간에서 수집된 메트릭을 기반으로 계산되었습니다.`,
        lookbackDays,
        metrics: item.metrics,
      },
      ruleTrace: {
        ruleId: item.ruleId,
        principleName: item.principle,
        awsDocUrl: item.docUrl,
        ruleVersion: "2026.02",
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

  const wasteCost = Math.round(totalMonthlyCost * 0.372);
  const score = calculateScoreBreakdown(recommendations, coverage, lookbackDays);

  const snapshot: AnalysisSnapshot = {
    id: analysisId,
    workspaceId: store.workspaceId,
    triggeredBy: params?.triggeredBy ?? "manual",
    status: "completed",
    createdAt: now,
    startedAt: now,
    completedAt: now,
    lookbackDays,
    periodStart: periodStartDate.toISOString(),
    periodEnd: periodEndDate.toISOString(),
    sourceCoverage: coverage,
    totalMonthlyCost,
    wasteCost,
    potentialMonthlySaving,
    potentialAnnualSaving: potentialMonthlySaving * 12,
    score,
    recommendationIds: recommendations.map((recommendation) => recommendation.id),
    resources,
    warnings: [
      ...(!coverage.aws
        ? ["AWS 연동이 없어 비용 데이터 신뢰도가 낮습니다."]
        : []),
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
    workspaceId: store.workspaceId,
    severity: "info",
    title: "분석이 완료되었습니다",
    body: `${score.totalScore}점 (${score.grade}) · 월 절감 예상 ${potentialMonthlySaving.toLocaleString("ko-KR")}원`,
  });

  const criticalCount = recommendations.filter(
    (recommendation) => recommendation.riskLevel === "critical",
  ).length;

  if (criticalCount > 0) {
    addNotification({
      workspaceId: store.workspaceId,
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
}): { recommendation: Recommendation; log: ApprovalLog } | null {
  const store = getStore();
  const recommendation = store.recommendations.find(
    (item) => item.id === params.recommendationId,
  );

  if (!recommendation) return null;

  recommendation.status = params.action === "approved" ? "approved" : "rejected";
  recommendation.updatedAt = nowIso();

  const log: ApprovalLog = {
    id: createId("approval"),
    recommendationId: recommendation.id,
    actor: params.actor,
    action: params.action,
    note: params.note ?? "",
    createdAt: nowIso(),
  };

  store.approvals.unshift(log);

  addNotification({
    workspaceId: store.workspaceId,
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
