"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  workspaceId: string;
  analysisId: string;
  pinnedRecommendationId?: string;
  messages: ChatMessage[];
  updatedAt: string;
}

interface RecommendationMetric {
  key: string;
  value: number;
  unit: string;
}

interface Recommendation {
  id: string;
  domain?: string;
  title: string;
  description?: string;
  status: string;
  confidenceScore?: number;
  estMonthlySaving: number;
  riskLevel: string;
  commandSnippet?: string;
  rollbackSnippet?: string;
  evidence?: {
    summary: string;
    metrics: RecommendationMetric[];
  };
  ruleTrace?: {
    ruleId: string;
    principleName: string;
  };
}

function getRiskBadgeClass(riskLevel: string): string {
  if (riskLevel === "critical") {
    return "bg-rose-500/10 text-rose-500 border-rose-500/30";
  }
  if (riskLevel === "high") {
    return "bg-amber-500/10 text-amber-500 border-amber-500/30";
  }
  if (riskLevel === "medium") {
    return "bg-sky-500/10 text-sky-500 border-sky-500/30";
  }
  return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
}

function formatCurrency(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

const MOCK_ANALYSIS = {
  id: "analysis_mock_20260225",
  score: { totalScore: 88, grade: "B" },
};

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec_mock_compute_01",
    domain: "compute",
    title: "EC2 인스턴스 라이트사이징",
    description:
      "7일 이상 저사용 인스턴스를 t3.medium 기준으로 재배치해 비용을 절감합니다.",
    status: "reviewed",
    confidenceScore: 0.98,
    estMonthlySaving: 3200000,
    riskLevel: "medium",
    commandSnippet:
      "aws ec2 modify-instance-attribute --instance-id i-07823ab45c67 --instance-type '{\"Value\":\"t3.medium\"}'",
    rollbackSnippet:
      "aws ec2 modify-instance-attribute --instance-id i-07823ab45c67 --instance-type '{\"Value\":\"m5.xlarge\"}'",
    evidence: {
      summary: "최근 30일 구간에서 p95 CPU 1.1%, p95 Memory 14.2%로 과할당이 확인되었습니다.",
      metrics: [
        { key: "cpu_p95", value: 1.1, unit: "%" },
        { key: "mem_p95", value: 14.2, unit: "%" },
      ],
    },
    ruleTrace: {
      ruleId: "WA-COST-EC2-RIGHTSIZE-001",
      principleName: "Well-Architected: Cost Optimization",
    },
  },
  {
    id: "rec_mock_storage_01",
    domain: "storage",
    title: "S3 Lifecycle 정책 적용 (Standard -> IA/Glacier)",
    description:
      "30일 이상 미접근 객체를 IA로, 90일 이상 객체를 Glacier로 자동 전환합니다.",
    status: "reviewed",
    confidenceScore: 0.89,
    estMonthlySaving: 640000,
    riskLevel: "low",
    commandSnippet:
      "aws s3api put-bucket-lifecycle-configuration --bucket s3-prod-logs --lifecycle-configuration file://s3-lifecycle.json",
    rollbackSnippet: "aws s3api delete-bucket-lifecycle --bucket s3-prod-logs",
    evidence: {
      summary: "콜드 데이터 비율이 72%이며 평균 객체 나이가 118일입니다.",
      metrics: [
        { key: "cold_object_ratio", value: 72, unit: "%" },
        { key: "avg_object_age", value: 118, unit: "days" },
      ],
    },
    ruleTrace: {
      ruleId: "WA-COST-S3-LIFECYCLE-003",
      principleName: "Well-Architected: Cost Optimization",
    },
  },
  {
    id: "rec_mock_database_01",
    domain: "database",
    title: "RDS 예약 인스턴스 전환",
    description:
      "상시 사용 중인 RDS를 1년 RI로 전환해 장기 단가를 낮춥니다.",
    status: "reviewed",
    confidenceScore: 0.9,
    estMonthlySaving: 1450000,
    riskLevel: "low",
    commandSnippet:
      "aws rds purchase-reserved-db-instances-offering --reserved-db-instances-offering-id <offering-id>",
    rollbackSnippet: "# RI 구매는 취소 불가. 적용 범위/기간을 사전 검토 필요",
    evidence: {
      summary: "RDS On-Demand 비중 100%로 RI 전환 여지가 큽니다.",
      metrics: [{ key: "rds_ondemand_ratio", value: 100, unit: "%" }],
    },
    ruleTrace: {
      ruleId: "WA-COST-RDS-RI-002",
      principleName: "Well-Architected: Cost Optimization",
    },
  },
  {
    id: "rec_mock_network_01",
    domain: "network",
    title: "NAT Gateway 데이터 전송 최적화",
    description:
      "S3/ECR 트래픽을 VPC Endpoint로 전환해 NAT Data Processing 비용을 줄입니다.",
    status: "reviewed",
    confidenceScore: 0.92,
    estMonthlySaving: 870000,
    riskLevel: "medium",
    commandSnippet:
      "aws ec2 create-vpc-endpoint --vpc-id <vpc-id> --service-name com.amazonaws.ap-northeast-2.s3 --vpc-endpoint-type Gateway",
    rollbackSnippet: "aws ec2 delete-vpc-endpoint --vpc-endpoint-id <vpce-id>",
    evidence: {
      summary: "NAT 처리량 4.2TB/월, 교차 AZ 트래픽 비중 37%입니다.",
      metrics: [
        { key: "nat_data_processed", value: 4.2, unit: "TB/month" },
        { key: "cross_az_traffic_ratio", value: 37, unit: "%" },
      ],
    },
    ruleTrace: {
      ruleId: "WA-COST-NETWORK-ENDPOINT-008",
      principleName: "Well-Architected: Cost Optimization",
    },
  },
  {
    id: "rec_mock_eks_01",
    domain: "eks",
    title: "EKS 노드그룹 Spot 혼합 전략 적용",
    description:
      "온디맨드 위주 노드그룹을 Spot 혼합으로 전환해 컴퓨트 비용을 낮춥니다.",
    status: "reviewed",
    confidenceScore: 0.84,
    estMonthlySaving: 1260000,
    riskLevel: "medium",
    commandSnippet:
      "eksctl create nodegroup --cluster prod --name prod-spot-mix --spot --instance-types m5.large,m5a.large,m4.large --nodes 3",
    rollbackSnippet: "eksctl delete nodegroup --cluster prod --name prod-spot-mix",
    evidence: {
      summary: "Spot 적용 가능 워크로드 비율 58%입니다.",
      metrics: [
        { key: "spot_eligible_workload_ratio", value: 58, unit: "%" },
        { key: "on_demand_node_ratio", value: 100, unit: "%" },
      ],
    },
    ruleTrace: {
      ruleId: "WA-COST-EKS-SPOT-014",
      principleName: "Well-Architected: Cost Optimization",
    },
  },
  {
    id: "rec_mock_finops_01",
    domain: "finops",
    title: "Prometheus 기반 유휴 리소스 자동 태깅",
    description:
      "장기간 유휴 지표가 관측된 리소스를 자동 태깅해 정리 후보군을 생성합니다.",
    status: "reviewed",
    confidenceScore: 0.86,
    estMonthlySaving: 520000,
    riskLevel: "low",
    commandSnippet: "kubectl apply -f finops-idle-rule.yaml",
    rollbackSnippet: "kubectl delete -f finops-idle-rule.yaml",
    evidence: {
      summary: "유휴 후보 리소스 14건이 탐지되었습니다.",
      metrics: [{ key: "idle_candidates", value: 14, unit: "count" }],
    },
    ruleTrace: {
      ruleId: "WA-OPS-OBSERVABILITY-017",
      principleName: "Well-Architected: Operational Excellence",
    },
  },
];

function createMockSession(analysisId: string, pinnedRecommendationId?: string): ChatSession {
  const selected =
    MOCK_RECOMMENDATIONS.find((item) => item.id === pinnedRecommendationId) ??
    MOCK_RECOMMENDATIONS[0];
  const now = new Date().toISOString();

  return {
    id: "chat_mock_workspace",
    workspaceId: "ws-jeolgam-default",
    analysisId,
    pinnedRecommendationId: selected?.id,
    updatedAt: now,
    messages: [
      {
        id: "chat_msg_seed_assistant",
        role: "assistant",
        content: `현재 선택 안건은 "${selected?.title ?? "N/A"}"입니다. pre-check / change / post-check 기준으로 실행 체크리스트를 작성해드릴까요?`,
        createdAt: now,
      },
    ],
  };
}

function buildMockAssistantReply(content: string, recommendation?: Recommendation): string {
  if (!recommendation) {
    return "추천 안건을 먼저 선택해 주세요.";
  }

  const lower = content.toLowerCase();
  if (lower.includes("롤백") || lower.includes("rollback")) {
    return `롤백 절차:\n${recommendation.rollbackSnippet ?? "롤백 스크립트 없음"}\n\n검증 포인트:\n- 서비스 헬스체크\n- 에러율/지연시간 회복 여부\n- 비용 지표 정상화`;
  }
  if (lower.includes("명령") || lower.includes("실행")) {
    return `실행 명령:\n${recommendation.commandSnippet ?? "명령 없음"}\n\n예상 월 절감: ${formatCurrency(
      recommendation.estMonthlySaving,
    )}\n신뢰도: ${((recommendation.confidenceScore ?? 0) * 100).toFixed(0)}%`;
  }

  return [
    `권고안: ${recommendation.title}`,
    `핵심 근거: ${recommendation.description ?? "설명 없음"}`,
    "실행 순서: Pre-check -> Change -> Post-check",
    "필수 체크: 장애 알람, 주요 API 지연시간, 비용 변화 추적",
  ].join("\n");
}

interface ArchitectureBlueprint {
  scenarioTitle: string;
  current: string[];
  target: string[];
  transitionPoints: string[];
  validationPoints: string[];
}

function getArchitectureBlueprint(
  recommendation?: Recommendation,
): ArchitectureBlueprint {
  const domain = recommendation?.domain ?? "";
  const title = recommendation?.title ?? "선택된 권고 없음";

  if (domain === "storage" || title.includes("S3")) {
    return {
      scenarioTitle: "Storage Tiering Transformation",
      current: [
        "App Logs -> S3 Standard",
        "장기보관 데이터도 Standard 유지",
        "수동 정리 중심 운영",
      ],
      target: [
        "0~30일: S3 Standard",
        "31~90일: S3 Standard-IA",
        "90일+: Glacier Instant Retrieval",
      ],
      transitionPoints: [
        "Lifecycle 정책 자동 전환",
        "월별 스토리지 단가 하향",
        "장기보관 버킷 운영 자동화",
      ],
      validationPoints: [
        "복원 테스트 (Glacier retrieval)",
        "객체 접근 패턴 재검증",
        "Lifecycle rule 충돌 여부 확인",
      ],
    };
  }

  if (domain === "network" || title.includes("NAT") || title.includes("CloudFront")) {
    return {
      scenarioTitle: "Network Cost Offload Transformation",
      current: [
        "Private Subnet -> NAT Gateway -> S3/ECR",
        "Origin 직통 요청 비중 높음",
        "Cross-AZ 데이터 전송 증가",
      ],
      target: [
        "S3/ECR Gateway Endpoint 직결",
        "CloudFront 캐시 히트율 상향",
        "NAT Data Processing 최소화",
      ],
      transitionPoints: [
        "NAT 경유 트래픽 Endpoint로 우회",
        "원본(EC2/ALB) 요청량 감소",
        "전송비 + 컴퓨트 부하 동시 절감",
      ],
      validationPoints: [
        "라우팅 테이블/보안정책 점검",
        "캐시 정책 적용 후 HIT Ratio 추적",
        "장애시 Origin fallback 확인",
      ],
    };
  }

  if (domain === "database" || title.includes("RDS")) {
    return {
      scenarioTitle: "RDS Pricing Model Transformation",
      current: [
        "RDS On-Demand 100%",
        "장기 상시 워크로드",
        "비용 예측 변동성 큼",
      ],
      target: [
        "RDS Reserved Instance 혼합",
        "기본부하 RI + 급증부하 On-Demand",
        "월 비용 예측 가능성 강화",
      ],
      transitionPoints: [
        "베이스라인 부하 RI로 고정",
        "비용 추세 안정화",
        "SLA 유지하면서 단가 최적화",
      ],
      validationPoints: [
        "RI 적용 범위 및 기간 재검토",
        "실제 사용률과 구매 용량 매칭",
        "증설/감축 이벤트 대응 계획 점검",
      ],
    };
  }

  if (domain === "eks" || title.includes("K8s") || title.includes("EKS")) {
    return {
      scenarioTitle: "Kubernetes Capacity Transformation",
      current: [
        "고정 Request/Limit 과할당",
        "온디맨드 노드 위주 구성",
        "낮은 노드 사용률 지속",
      ],
      target: [
        "Workload별 Request/Limit 재조정",
        "Spot + On-Demand 혼합 노드",
        "HPA 기준 기반 탄력 스케일",
      ],
      transitionPoints: [
        "유휴 리소스 축소로 노드 수 절감",
        "Spot 우선으로 단가 하향",
        "장애 허용 워크로드 우선 적용",
      ],
      validationPoints: [
        "P95 Latency / Error Rate 추적",
        "Pod 재스케줄링 안정성 점검",
        "Critical 워크로드 분리 여부 검토",
      ],
    };
  }

  if (domain === "finops") {
    return {
      scenarioTitle: "FinOps Governance Transformation",
      current: [
        "비용 이상징후 수동 탐지",
        "미사용 리소스 정리 지연",
        "팀별 승인 흐름 비정형",
      ],
      target: [
        "유휴 리소스 자동 탐지/태깅",
        "권고 승인 워크플로 표준화",
        "실행 추적 + 절감 실적 누적",
      ],
      transitionPoints: [
        "자동화 규칙 기반 후보군 생성",
        "승인/반려 이력 중앙 관리",
        "비용 절감 KPI 상시 관찰",
      ],
      validationPoints: [
        "오탐률/미탐률 정기 검토",
        "승인 SLA 및 책임자 매핑",
        "절감액 실측과 추정 비교",
      ],
    };
  }

  return {
    scenarioTitle: "Compute Rightsizing Transformation",
    current: [
      "EC2 과도 스펙 상시 운영",
      "오프피크 구간 유휴율 높음",
      "인스턴스 타입 수동 관리",
    ],
    target: [
      "워크로드별 적정 타입 재배치",
      "스케줄/오토스케일 정책 적용",
      "비용 대비 성능 균형 최적화",
    ],
    transitionPoints: [
      "저사용 구간 다운사이징 자동화",
      "성능 임계치 초과시 즉시 확장",
      "실행/롤백 표준 절차 내재화",
    ],
    validationPoints: [
      "CPU/메모리 P95 지표 확인",
      "배포 후 오류율/지연시간 점검",
      "롤백 리허설 시간 측정",
    ],
  };
}

export default function AiOptimizationPage() {
  const [loading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [analysisId, setAnalysisId] = useState<string>(MOCK_ANALYSIS.id);
  const [analysisScore, setAnalysisScore] = useState<number>(MOCK_ANALYSIS.score.totalScore);
  const [analysisGrade, setAnalysisGrade] = useState<string>(MOCK_ANALYSIS.score.grade);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
  const [pinnedRecommendationId, setPinnedRecommendationId] = useState<string>(
    MOCK_RECOMMENDATIONS[0]?.id ?? "",
  );
  const [session, setSession] = useState<ChatSession | null>(() =>
    createMockSession(MOCK_ANALYSIS.id, MOCK_RECOMMENDATIONS[0]?.id),
  );
  const [coachOpen, setCoachOpen] = useState(false);

  const prioritizedRecommendations = useMemo(
    () => [...recommendations].sort((a, b) => b.estMonthlySaving - a.estMonthlySaving),
    [recommendations],
  );

  const selectedRecommendation =
    recommendations.find((recommendation) => recommendation.id === pinnedRecommendationId) ??
    prioritizedRecommendations[0];
  const architectureBlueprint = useMemo(
    () => getArchitectureBlueprint(selectedRecommendation),
    [selectedRecommendation],
  );
  const recommendationSummary = useMemo(() => {
    if (!selectedRecommendation) {
      return "좌측 백로그에서 안건을 선택하면 해당 권고의 기술 근거와 전환 효과를 자세히 보여줍니다.";
    }

    const evidenceSummary = selectedRecommendation.evidence?.summary;
    const metricText =
      selectedRecommendation.evidence?.metrics
        ?.slice(0, 3)
        .map((metric) => `${metric.key}=${metric.value}${metric.unit}`)
        .join(", ") ?? "";

    return [
      selectedRecommendation.description ?? "",
      evidenceSummary ?? "",
      metricText ? `핵심 지표: ${metricText}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [selectedRecommendation]);

  const totalMonthlySaving = useMemo(
    () => recommendations.reduce((acc, recommendation) => acc + recommendation.estMonthlySaving, 0),
    [recommendations],
  );

  const highPriorityCount = useMemo(
    () =>
      recommendations.filter(
        (recommendation) =>
          recommendation.riskLevel === "high" || recommendation.riskLevel === "critical",
      ).length,
    [recommendations],
  );

  function loadLatestAnalysis() {
    setError("");
    setAnalysisId(MOCK_ANALYSIS.id);
    setAnalysisScore(MOCK_ANALYSIS.score.totalScore);
    setAnalysisGrade(MOCK_ANALYSIS.score.grade);
    setRecommendations(MOCK_RECOMMENDATIONS);
    setPinnedRecommendationId(MOCK_RECOMMENDATIONS[0]?.id ?? "");
    setSession(createMockSession(MOCK_ANALYSIS.id, MOCK_RECOMMENDATIONS[0]?.id));
  }

  useEffect(() => {
    if (!analysisId || !pinnedRecommendationId) return;
    setSession((previous) => {
      if (!previous) {
        return createMockSession(analysisId, pinnedRecommendationId);
      }
      return {
        ...previous,
        analysisId,
        pinnedRecommendationId,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [analysisId, pinnedRecommendationId]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analysisId || !prompt.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const selected =
        recommendations.find((recommendation) => recommendation.id === pinnedRecommendationId) ??
        prioritizedRecommendations[0];
      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: `chat_user_${Date.now()}`,
        role: "user",
        content: prompt.trim(),
        createdAt: now,
      };
      const assistantMessage: ChatMessage = {
        id: `chat_assistant_${Date.now()}`,
        role: "assistant",
        content: buildMockAssistantReply(prompt.trim(), selected),
        createdAt: now,
      };

      setSession((previous) => {
        const base = previous ?? createMockSession(analysisId, pinnedRecommendationId);
        return {
          ...base,
          pinnedRecommendationId,
          updatedAt: now,
          messages: [...base.messages, userMessage, assistantMessage],
        };
      });
      setPrompt("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7ff] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="chat" />

      <main className="flex min-w-0 flex-1 flex-col">
        <PageTopBar
          title="AI 최적화 워크스페이스"
          description="AWS Well-Architected / FinOps 모범사례 기반 추천안의 검토, 대화, 실행까지 한 화면에서 처리합니다."
          actions={
            <>
              <Link
                href="/analysis/infrastructure"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                인프라 분석
              </Link>
              <button
                onClick={loadLatestAnalysis}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                최신 분석 새로고침
              </button>
            </>
          }
        />

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,rgba(28,89,242,0.15),transparent_38%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.16),transparent_32%)] p-4 md:p-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#161B22]">
              분석 데이터를 불러오는 중입니다...
            </div>
          ) : null}

          {!loading && !analysisId ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-500">
              아직 분석 결과가 없습니다. 연동 후 분석을 실행해 주세요.
              <div className="mt-4">
                <Link
                  href="/integrations"
                  className="rounded-lg bg-[#1c59f2] px-3 py-2 text-xs font-bold text-white"
                >
                  연동 설정으로 이동
                </Link>
              </div>
            </div>
          ) : null}

          {analysisId ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-[#1c59f2]/20 bg-white/80 p-6 backdrop-blur-sm dark:bg-[#111827]/70">
                <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.12em] text-[#1c59f2] uppercase">
                      AI Optimization Control Tower
                    </p>
                    <h3 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                      비용 최적화 실행 큐 {recommendations.length}건
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                      모니터링에서 끝나지 않고, 실행 가능한 명령/롤백/검증까지 연결된 워크플로를 제공합니다.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#0B0E14]">
                      <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        점수
                      </p>
                      <p className="mt-1 text-lg font-extrabold">{analysisScore}점</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#0B0E14]">
                      <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        등급
                      </p>
                      <p className="mt-1 text-lg font-extrabold">{analysisGrade}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#0B0E14]">
                      <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        월 절감
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-[#16A34A]">
                        {formatCurrency(totalMonthlySaving)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#0B0E14]">
                      <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        고위험
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-amber-500">
                        {highPriorityCount}건
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#161B22]">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-black tracking-widest text-slate-500 uppercase">
                      Prioritized Backlog
                    </h4>
                    <span className="text-xs font-semibold text-slate-400">
                      {analysisId.slice(0, 10)}...
                    </span>
                  </div>
                  <div className="max-h-[730px] space-y-2 overflow-y-auto pr-1">
                    {prioritizedRecommendations.map((recommendation, index) => (
                      <button
                        key={recommendation.id}
                        onClick={() => setPinnedRecommendationId(recommendation.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          recommendation.id === pinnedRecommendationId
                            ? "border-[#1c59f2] bg-[#1c59f2]/10 shadow-lg shadow-[#1c59f2]/10"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#0B0E14]"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-[#1c59f2]">
                            P{index + 1}
                          </span>
                          <span className="text-[11px] font-bold text-[#16A34A]">
                            {formatCurrency(recommendation.estMonthlySaving)}
                          </span>
                        </div>
                        <p className="text-sm font-bold leading-tight">{recommendation.title}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getRiskBadgeClass(
                              recommendation.riskLevel,
                            )}`}
                          >
                            {recommendation.riskLevel}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {(recommendation.confidenceScore ?? 0).toFixed(2)} confidence
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </aside>

                <section className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-2xl font-black tracking-tight">
                          {selectedRecommendation?.title ?? "추천안을 선택하세요"}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          {selectedRecommendation?.ruleTrace?.ruleId ?? "WA-RULE"} ·{" "}
                          {selectedRecommendation?.ruleTrace?.principleName ??
                            "Well-Architected"}
                        </p>
                      </div>
                      {selectedRecommendation ? (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${getRiskBadgeClass(
                            selectedRecommendation.riskLevel,
                          )}`}
                        >
                          {selectedRecommendation.riskLevel}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {recommendationSummary}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-[#0B0E14]">
                        <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          Monthly Saving
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-[#16A34A]">
                          {formatCurrency(selectedRecommendation?.estMonthlySaving ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-[#0B0E14]">
                        <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          Confidence
                        </p>
                        <p className="mt-1 text-lg font-extrabold">
                          {((selectedRecommendation?.confidenceScore ?? 0) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
                    <div className="mb-3">
                      <h5 className="text-xs font-extrabold tracking-widest text-slate-500 uppercase">
                        AS-IS -&gt; TO-BE 아키텍처 전환
                      </h5>
                      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {architectureBlueprint.scenarioTitle}
                      </p>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#0B0E14]">
                        <p className="mb-2 text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                          AS-IS
                        </p>
                        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                          {architectureBlueprint.current.map((item) => (
                            <li key={`current-${item}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center justify-center text-2xl font-black text-[#1c59f2]">
                        →
                      </div>
                      <div className="rounded-xl border border-[#1c59f2]/30 bg-[#1c59f2]/5 p-3 dark:border-[#1c59f2]/40 dark:bg-[#1c59f2]/10">
                        <p className="mb-2 text-[10px] font-extrabold tracking-wider text-[#1c59f2] uppercase">
                          TO-BE
                        </p>
                        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                          {architectureBlueprint.target.map((item) => (
                            <li key={`target-${item}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                        <p className="mb-2 text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                          전환 포인트
                        </p>
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {architectureBlueprint.transitionPoints.map((item) => (
                            <li key={`transition-${item}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                        <p className="mb-2 text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                          검증 체크포인트
                        </p>
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {architectureBlueprint.validationPoints.map((item) => (
                            <li key={`validation-${item}`}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
                    <h5 className="mb-2 text-xs font-extrabold tracking-widest text-slate-500 uppercase">
                      Execute / Rollback
                    </h5>
                    <div className="rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-200">
                      {selectedRecommendation?.commandSnippet ?? "선택된 권고 없음"}
                    </div>
                    <div className="mt-2 rounded-lg bg-slate-800 p-3 font-mono text-xs leading-relaxed text-slate-200">
                      {selectedRecommendation?.rollbackSnippet ?? "선택된 권고 없음"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href="/execution-guide"
                        className="rounded-lg bg-[#1c59f2] px-3 py-2 text-xs font-bold text-white hover:bg-[#1c59f2]/90"
                      >
                        구현 가이드 열기
                      </Link>
                      <button
                        onClick={() => {
                          setPrompt(
                            `권고안 "${selectedRecommendation?.title ?? ""}" 실행 체크리스트를 pre-check, change, post-check로 나눠서 작성해줘`,
                          );
                          setCoachOpen(true);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        AI 체크리스트 생성
                      </button>
                      <button
                        onClick={() => setCoachOpen(true)}
                        className="rounded-lg border border-[#1c59f2]/30 bg-[#1c59f2]/10 px-3 py-2 text-xs font-bold text-[#1c59f2] hover:bg-[#1c59f2]/20"
                      >
                        AI Execution Coach 열기
                      </button>
                    </div>
                  </div>
                </section>
              </section>

              <button
                onClick={() => setCoachOpen(true)}
                className="fixed right-6 bottom-6 z-40 rounded-full bg-[#1c59f2] px-5 py-3 text-sm font-extrabold text-white shadow-2xl shadow-[#1c59f2]/40 transition hover:scale-[1.02] hover:bg-[#1c59f2]/90"
              >
                AI Execution Coach
              </button>

              {coachOpen ? (
                <div className="fixed inset-0 z-50">
                  <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                    onClick={() => setCoachOpen(false)}
                  />

                  <section className="absolute right-4 bottom-4 flex h-[78vh] w-[min(460px,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#161B22]">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                      <div>
                        <h4 className="text-sm font-black tracking-widest text-slate-500 uppercase">
                          AI Execution Coach
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          선택 안건 기반으로 적용 전략을 즉시 질의하세요.
                        </p>
                      </div>
                      <button
                        onClick={() => setCoachOpen(false)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        닫기
                      </button>
                    </div>

                    <div className="max-h-full flex-1 space-y-3 overflow-y-auto p-4">
                      {session?.messages.length ? (
                        session.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                              message.role === "user"
                                ? "ml-8 bg-[#1c59f2] text-white"
                                : "mr-8 border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-[#0B0E14] dark:text-slate-100"
                            }`}
                          >
                            {message.content}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
                          예시 질문: &quot;이 권고를 오늘 적용하면 다운타임 위험은?&quot;
                        </div>
                      )}
                    </div>

                    <form
                      onSubmit={sendMessage}
                      className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#161B22]"
                    >
                      <div className="mb-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPrompt("이 안건의 pre-check / rollback / verification을 표로 작성해줘")
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          표 형식 요청
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPrompt("운영 반영 전에 꼭 확인해야 할 AWS 모범사례를 5개로 정리해줘")
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          모범사례 요청
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          value={prompt}
                          onChange={(event) => setPrompt(event.target.value)}
                          disabled={!analysisId || submitting}
                          placeholder="예: 적용 리스크와 롤백 시간을 보수적으로 추정해줘"
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0B0E14]"
                        />
                        <button
                          type="submit"
                          disabled={!analysisId || submitting || !prompt.trim()}
                          className="rounded-lg bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#1c59f2]/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submitting ? "전송 중..." : "질문"}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
              {error}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
