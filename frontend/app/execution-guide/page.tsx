"use client";

import { useEffect, useMemo, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

type ExecutionIconName =
  | "auto_awesome"
  | "dashboard"
  | "bolt"
  | "history"
  | "database"
  | "settings"
  | "chevron_right"
  | "help"
  | "notifications"
  | "download"
  | "check"
  | "warning"
  | "verified"
  | "content_copy"
  | "search"
  | "terminal"
  | "task_alt";

function ExecutionIcon({
  name,
  className,
}: {
  name: ExecutionIconName;
  className?: string;
}) {
  const baseProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "auto_awesome":
      return (
        <svg {...baseProps}>
          <path d="m12 3 1.6 3.8L17.5 8 13.7 9.6 12 13.5 10.3 9.6 6.5 8l3.9-1.2L12 3Z" />
          <path d="m18.5 13 1 2.3 2.5.7-2.5 1-1 2.3-1-2.3-2.5-1 2.5-.7 1-2.3Z" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...baseProps}>
          <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2" />
          <rect x="13" y="3.5" width="7.5" height="5.5" rx="1.2" />
          <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" />
          <rect x="13" y="11" width="7.5" height="9.5" rx="1.2" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...baseProps}>
          <path d="M13.5 2.8 6.5 13h4l-1 8.2 8-11h-4l.5-7.4Z" />
        </svg>
      );
    case "history":
      return (
        <svg {...baseProps}>
          <path d="M4.5 7.5V3.8" />
          <path d="M4.5 3.8h3.7" />
          <path d="M4.8 8.2A8.5 8.5 0 1 1 3.5 12" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "database":
      return (
        <svg {...baseProps}>
          <ellipse cx="12" cy="6.5" rx="7" ry="2.8" />
          <path d="M5 6.5v7c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-7" />
          <path d="M5 10c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" />
        </svg>
      );
    case "settings":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19 12h2" />
          <path d="M3 12h2" />
          <path d="m16.9 7.1 1.4-1.4" />
          <path d="m5.7 18.3 1.4-1.4" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="m16.9 16.9 1.4 1.4" />
          <path d="m5.7 5.7 1.4 1.4" />
        </svg>
      );
    case "chevron_right":
      return (
        <svg {...baseProps}>
          <path d="m10 6 6 6-6 6" />
        </svg>
      );
    case "help":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9.4a2.5 2.5 0 1 1 4.1 2c-.8.6-1.4 1-1.4 2.1" />
          <circle cx="12" cy="16.8" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...baseProps}>
          <path d="M7.5 9a4.5 4.5 0 1 1 9 0v4l1.5 2H6l1.5-2V9Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      );
    case "download":
      return (
        <svg {...baseProps}>
          <path d="M12 4v11" />
          <path d="m8 11 4 4 4-4" />
          <path d="M4 19h16" />
        </svg>
      );
    case "check":
      return (
        <svg {...baseProps}>
          <path d="m6 12 4 4 8-8" />
        </svg>
      );
    case "warning":
      return (
        <svg {...baseProps}>
          <path d="M12 4 3.8 18.5h16.4L12 4Z" />
          <path d="M12 9v4.8" />
          <circle cx="12" cy="16.2" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "verified":
      return (
        <svg {...baseProps}>
          <path d="M12 3 5 6v6c0 4.2 2.7 7.8 7 9 4.3-1.2 7-4.8 7-9V6l-7-3Z" />
          <path d="m9.5 12 1.8 1.8 3.2-3.2" />
        </svg>
      );
    case "content_copy":
      return (
        <svg {...baseProps}>
          <rect x="9" y="9" width="10" height="10" rx="1.5" />
          <path d="M6 15H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1h8.5a1 1 0 0 1 1 1V6" />
        </svg>
      );
    case "search":
      return (
        <svg {...baseProps}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
    case "terminal":
      return (
        <svg {...baseProps}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="m7 9 3 3-3 3" />
          <path d="M12 15h5" />
        </svg>
      );
    case "task_alt":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.8 12.2 2.2 2.2 4.2-4.2" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ExecutionGuidePage() {
  const [analysisId, setAnalysisId] = useState("");
  const [recommendations, setRecommendations] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      commandSnippet: string;
      rollbackSnippet: string;
      confidenceScore: number;
      riskLevel: string;
      targetResource: string;
    }>
  >([]);
  const [copyFeedback, setCopyFeedback] = useState("");

  const primaryRecommendation = recommendations[0];
  const secondaryRecommendation = recommendations[1];
  const confidencePercent = Math.round(
    (primaryRecommendation?.confidenceScore ?? 0.98) * 100,
  );

  const executeCommand = useMemo(() => {
    if (!primaryRecommendation && !secondaryRecommendation) {
      return `# AWS EC2 인스턴스 타입 최적화 실행\naws ec2 modify-instance-attribute --instance-id i-0a2b3c4d5e6f7g8h9 --instance-type "t3.medium"\n\n# EBS 볼륨 최적화 (gp2 to gp3)\naws ec2 modify-volume --volume-id vol-1234567890abcdef0 --volume-type gp3`;
    }

    const lines: string[] = [];

    if (primaryRecommendation) {
      lines.push(`# ${primaryRecommendation.title}`);
      lines.push(primaryRecommendation.commandSnippet);
    }

    if (secondaryRecommendation) {
      lines.push("");
      lines.push(`# ${secondaryRecommendation.title}`);
      lines.push(secondaryRecommendation.commandSnippet);
    }

    return lines.join("\n");
  }, [primaryRecommendation, secondaryRecommendation]);

  const riskGuidance = useMemo(() => {
    if (!primaryRecommendation) {
      return "인스턴스 타입 변경 시 최대 5분 내외의 일시적인 서비스 중단이 발생할 수 있습니다. 운영 환경(Prod)의 경우 트래픽이 낮은 시간대에 작업을 권장하며, 변경 전 스냅샷 백업 상태를 확인하시기 바랍니다.";
    }

    if (primaryRecommendation.riskLevel === "critical") {
      return `현재 선택된 권고(${primaryRecommendation.title})는 CRITICAL 리스크입니다. 적용 전 반드시 백업/롤백 리허설을 수행하고, 점검창 승인 후 단계적으로 반영하세요.`;
    }

    if (primaryRecommendation.riskLevel === "high") {
      return `현재 선택된 권고(${primaryRecommendation.title})는 HIGH 리스크입니다. 트래픽 저시간대에 적용하고, 변경 직후 지표(CPU/오류율/지연시간)를 집중 모니터링하세요.`;
    }

    return `현재 선택된 권고(${primaryRecommendation.title})는 ${primaryRecommendation.riskLevel.toUpperCase()} 리스크입니다. 운영 적용 전 변경 영향도 검토 및 모니터링 기준을 확정하세요.`;
  }, [primaryRecommendation]);

  useEffect(() => {
    async function loadLatestAnalysis() {
      const response = await fetch("/api/analysis/latest", {
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        ok: boolean;
        data?: {
          analysis: { id: string } | null;
          recommendations: Array<{
            id: string;
            title: string;
            description: string;
            commandSnippet: string;
            rollbackSnippet: string;
            confidenceScore: number;
            riskLevel: string;
            targetResource: string;
          }>;
        };
      };

      if (!payload.ok || !payload.data) return;

      setAnalysisId(payload.data.analysis?.id ?? "");
      setRecommendations(payload.data.recommendations ?? []);
    }

    loadLatestAnalysis().catch(() => {
      setCopyFeedback("분석 데이터를 불러오지 못했습니다.");
      setTimeout(() => setCopyFeedback(""), 1800);
    });
  }, []);

  async function trackCommandCopy() {
    await fetch("/api/execution/command-copy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recommendationId: primaryRecommendation?.id ?? "rec-demo-execution",
        commandType: "execute",
      }),
    });
  }

  async function handleCopyCommand() {
    try {
      await navigator.clipboard.writeText(executeCommand);
      await trackCommandCopy();
      setCopyFeedback("명령어가 복사되었습니다.");
      setTimeout(() => setCopyFeedback(""), 1800);
    } catch {
      setCopyFeedback("복사에 실패했습니다.");
      setTimeout(() => setCopyFeedback(""), 1800);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="execution" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="실행 가이드"
          description="AI가 생성한 인프라 비용 최적화 플랜을 단계별로 검토하고 실 인프라에 적용합니다."
          actions={
            <button className="flex items-center gap-2 rounded-lg bg-[#2a6ef5] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#2a6ef5]/90">
              <ExecutionIcon name="download" className="h-4 w-4" />
              플랜 다운로드 (PDF)
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black tracking-tight">실행 플랜 상세</h2>
                <span className="rounded-full bg-[#2a6ef5]/10 px-2 py-1 text-xs font-bold text-[#2a6ef5] uppercase">
                  Plan ID: {analysisId || "#AI-2024-001"}
                </span>
              </div>
              <p className="text-base text-slate-500 dark:text-slate-400">
                현재 적용 단계와 실행 명령, 리스크 가이드를 확인하세요.
              </p>
            </div>

            <div className="relative">
              <div className="absolute top-5 left-0 -z-10 h-0.5 w-full bg-slate-200 dark:bg-slate-800" />
              <div className="flex justify-between">
                <div className="flex flex-col items-center gap-3 bg-[#f5f6f8] px-4 dark:bg-[#0f1218]">
                  <div className="flex size-10 items-center justify-center rounded-full bg-green-500 text-white ring-4 ring-[#f5f6f8] dark:ring-[#0f1218]">
                    <ExecutionIcon name="check" className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">Step 1</p>
                    <p className="text-xs text-slate-500">구성 분석</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 bg-[#f5f6f8] px-4 dark:bg-[#0f1218]">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#2a6ef5] text-white ring-4 ring-[#f5f6f8] dark:ring-[#0f1218]">
                    <span className="text-sm font-bold italic">2</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-[#2a6ef5]">Step 2</p>
                    <p className="text-xs text-slate-500">명령어 실행</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 bg-[#f5f6f8] px-4 dark:bg-[#0f1218]">
                  <div className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-slate-400 ring-4 ring-[#f5f6f8] dark:bg-slate-800 dark:ring-[#0f1218]">
                    <span className="text-sm font-bold italic">3</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-400">Step 3</p>
                    <p className="text-xs text-slate-500">최종 확인</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="text-amber-500">
                <ExecutionIcon name="warning" className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 font-bold text-amber-500">
                  주의 사항 (Risk Guidance)
                </h3>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {riskGuidance}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/50 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="size-3 rounded-full bg-red-500/50" />
                      <div className="size-3 rounded-full bg-amber-500/50" />
                      <div className="size-3 rounded-full bg-green-500/50" />
                    </div>
                    <span className="code-block ml-3 text-xs font-medium text-slate-400">
                      terraform-apply-cost-optimization.sh
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-green-500">
                      <ExecutionIcon name="verified" className="h-3 w-3" />
                      <span className="text-[10px] font-bold">
                        {confidencePercent}% Confidence
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCommand}
                      className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-400 transition-colors hover:text-white"
                    >
                      <ExecutionIcon name="content_copy" className="h-4 w-4" />
                      복사
                    </button>
                  </div>
                </div>

                <div className="code-block p-6 text-sm leading-relaxed">
                  {executeCommand.split("\n").map((line, index) => (
                    <div key={`${index}-${line}`} className="flex gap-4">
                      <span className="select-none text-slate-600">{index + 1}</span>
                      <span
                        className={line.startsWith("#") ? "text-blue-400" : "text-slate-100"}
                      >
                        {line || " "}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-[#2a6ef5]/10 p-2 text-[#2a6ef5]">
                      <ExecutionIcon name="search" className="h-5 w-5" />
                    </div>
                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold text-green-500">
                      완료
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Dry Run 실행</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      변경 전 영향도를 가상 시뮬레이션으로 확인합니다.
                    </p>
                  </div>
                  <button className="mt-auto w-full rounded-lg border border-slate-200 py-2 text-xs font-bold transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    결과 리포트 보기
                  </button>
                </div>

                <div className="flex flex-col gap-4 rounded-xl border-2 border-[#2a6ef5] bg-white p-5 shadow-lg shadow-[#2a6ef5]/5 dark:bg-slate-900">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-[#2a6ef5] p-2 text-white">
                      <ExecutionIcon name="terminal" className="h-5 w-5" />
                    </div>
                    <span className="rounded bg-[#2a6ef5]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#2a6ef5]">
                      진행 중
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">명령어 실행</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      인프라 변경 명령어를 CLI 또는 콘솔에서 실행합니다.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCommand}
                    className="mt-auto w-full rounded-lg bg-[#2a6ef5] py-2 text-xs font-bold text-white transition-all hover:bg-[#2a6ef5]/90"
                  >
                    명령어 복사하기
                  </button>
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 opacity-50 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-400 dark:bg-slate-800">
                      <ExecutionIcon name="task_alt" className="h-5 w-5" />
                    </div>
                    <span className="rounded bg-slate-400/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                      대기
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">최종 상태 확인</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      자원이 정상적으로 변경되었는지 헬스체크를 진행합니다.
                    </p>
                  </div>
                  <button
                    className="mt-auto w-full cursor-not-allowed rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800"
                    disabled
                  >
                    검증 시작
                  </button>
                </div>
              </div>
            </div>

            {copyFeedback ? (
              <div className="rounded-lg border border-[#2a6ef5]/30 bg-[#2a6ef5]/10 p-3 text-sm text-[#2a6ef5]">
                {copyFeedback}
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="-space-x-2 flex">
                  <div className="flex size-8 items-center justify-center rounded-full border-2 border-[#0f1218] bg-slate-700 text-[10px] font-bold">
                    K1
                  </div>
                  <div className="flex size-8 items-center justify-center rounded-full border-2 border-[#0f1218] bg-slate-600 text-[10px] font-bold">
                    K2
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  2명의 엔지니어가 이 플랜을 승인했습니다.
                </p>
              </div>

              <div className="flex gap-3">
                <button className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  이전 단계
                </button>
                <button className="rounded-xl bg-[#2a6ef5] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#2a6ef5]/20 transition-all hover:scale-[1.02] active:scale-95">
                  실행 완료 (다음으로)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
