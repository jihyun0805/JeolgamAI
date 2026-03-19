import { redirect } from "next/navigation";

<<<<<<< HEAD
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { useEffect, useState } from "react";

type ReportIconName =
  | "insights"
  | "search"
  | "notifications"
  | "dashboard"
  | "analytics"
  | "description"
  | "settings"
  | "verified"
  | "edit"
  | "summarize"
  | "check_circle"
  | "monitoring"
  | "picture_as_pdf"
  | "download"
  | "zoom_out"
  | "zoom_in"
  | "fullscreen"
  | "bar_chart"
  | "arrow_back_ios"
  | "arrow_forward_ios";

function ReportIcon({
  name,
  className,
}: {
  name: ReportIconName;
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
    case "insights":
      return (
        <svg {...baseProps}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-8" />
          <path d="M22 19V12" />
        </svg>
      );
    case "search":
      return (
        <svg {...baseProps}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...baseProps}>
          <path d="M7.5 9a4.5 4.5 0 1 1 9 0v4l1.5 2H6l1.5-2V9Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
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
    case "analytics":
      return (
        <svg {...baseProps}>
          <rect x="4" y="12" width="3" height="7" rx="0.8" />
          <rect x="10.5" y="8" width="3" height="11" rx="0.8" />
          <rect x="17" y="5" width="3" height="14" rx="0.8" />
        </svg>
      );
    case "description":
      return (
        <svg {...baseProps}>
          <path d="M7 3.5h7l3.5 3.5V20a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M14 3.5V7h3.5" />
          <path d="M9 11h6" />
          <path d="M9 14.5h6" />
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
    case "verified":
      return (
        <svg {...baseProps}>
          <path d="M12 3 5 6v6c0 4.2 2.7 7.8 7 9 4.3-1.2 7-4.8 7-9V6l-7-3Z" />
          <path d="m9.5 12 1.8 1.8 3.2-3.2" />
        </svg>
      );
    case "edit":
      return (
        <svg {...baseProps}>
          <path d="m14 4 6 6" />
          <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z" />
        </svg>
      );
    case "summarize":
      return (
        <svg {...baseProps}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      );
    case "check_circle":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.8 12.2 2.2 2.2 4.2-4.2" />
        </svg>
      );
    case "monitoring":
      return (
        <svg {...baseProps}>
          <path d="M3 18.5h18" />
          <path d="m5 14 3-4 3 2 4-5 4 3" />
          <circle cx="8" cy="10" r="1" />
          <circle cx="15" cy="7" r="1" />
        </svg>
      );
    case "picture_as_pdf":
      return (
        <svg {...baseProps}>
          <path d="M7 3.5h7l3.5 3.5V20a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M14 3.5V7h3.5" />
          <path d="M8.5 14h7" />
          <path d="M8.5 17h7" />
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
    case "zoom_out":
      return (
        <svg {...baseProps}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4.5 4.5" />
          <path d="M8.5 11h5" />
        </svg>
      );
    case "zoom_in":
      return (
        <svg {...baseProps}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4.5 4.5" />
          <path d="M11 8.5v5" />
          <path d="M8.5 11h5" />
        </svg>
      );
    case "fullscreen":
      return (
        <svg {...baseProps}>
          <path d="M4 9V4h5" />
          <path d="M15 4h5v5" />
          <path d="M20 15v5h-5" />
          <path d="M9 20H4v-5" />
        </svg>
      );
    case "bar_chart":
      return (
        <svg {...baseProps}>
          <path d="M4 19V8" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19V9" />
        </svg>
      );
    case "arrow_back_ios":
      return (
        <svg {...baseProps}>
          <path d="m14 6-6 6 6 6" />
        </svg>
      );
    case "arrow_forward_ios":
      return (
        <svg {...baseProps}>
          <path d="m10 6 6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}

export default function NewReportPage() {
  const [analysisId, setAnalysisId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    async function loadLatestAnalysis() {
      const response = await fetch("/api/analysis/latest", { cache: "no-store" });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: {
          analysis: { id: string } | null;
        };
      };

      if (payload.ok && payload.data?.analysis?.id) {
        setAnalysisId(payload.data.analysis.id);
      }
    }

    loadLatestAnalysis().catch(() => {
      setReportError("분석 데이터 조회에 실패했습니다.");
    });
  }, []);

  async function generateReport() {
    if (!analysisId) {
      setReportError("리포트를 생성할 분석 결과가 없습니다.");
      return;
    }

    setGenerating(true);
    setReportError("");
    setReportMessage("");

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisId,
          templateType: "executive",
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        data?: { id: string; exportUrl: string };
        error?: { message: string };
      };

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "리포트 생성에 실패했습니다.");
      }

      setReportMessage(
        `리포트 생성 완료: ${payload.data.id} (export: ${payload.data.exportUrl})`,
      );
    } catch (error) {
      setReportError(error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="reports" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="리포트 생성"
          description="AI 기반 재무 최적화 리포트를 구성하고 시뮬레이션 결과를 확인하세요."
        />

        <main className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <section className="scrollbar-hide flex-1 space-y-8 overflow-y-auto bg-[#f5f6f8] p-6 dark:bg-[#0f1218]">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  리포트 구성 옵션
                </h3>
                <button className="flex items-center gap-2 rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-300 dark:bg-[#1a2029] dark:text-white dark:hover:bg-[#2D3139]">
                  <ReportIcon name="edit" className="h-4 w-4" />
                  데이터 수정
                </button>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  보고서 템플릿 선택
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="group relative cursor-pointer rounded-xl border-2 border-[#2a6ef5] bg-white p-5 shadow-sm dark:bg-[#1a2029]">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-[#2a6ef5] text-white">
                        <ReportIcon name="summarize" className="h-5 w-5" />
                      </div>
                      <ReportIcon
                        name="check_circle"
                        className="h-5 w-5 text-[#2a6ef5]"
                      />
                    </div>
                    <h4 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">
                      경영 요약 보고서
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      핵심 ROI 및 월간 지출 패턴을 집약적으로 분석한 의사결정용
                      리포트
                    </p>
                  </div>

                  <div className="group relative cursor-pointer rounded-xl border-2 border-transparent bg-white p-5 shadow-sm transition-all hover:border-slate-300 dark:bg-[#1a2029] dark:hover:border-slate-700">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-[#0f1218]">
                        <ReportIcon name="monitoring" className="h-5 w-5" />
                      </div>
                    </div>
                    <h4 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">
                      비용 최적화 상세 리포트
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      개별 인프라 및 서비스별 낭비 요소를 진단하고 절감 가이드를
                      포함한 리포트
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  ROI 시뮬레이션 결과
                </h3>
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 dark:border-[#2D3139] dark:bg-[#1a2029]">
                  <div className="mb-8 grid grid-cols-2 gap-8">
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        6개월 예상 누적 절감액
                      </p>
                      <h5 className="text-2xl font-extrabold text-[#2a6ef5]">
                        ₩42,850,000
                      </h5>
                    </div>
                    <div className="border-l border-slate-200 pl-8 dark:border-[#2D3139]">
                      <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        12개월 예상 누적 절감액
                      </p>
                      <h5 className="text-2xl font-extrabold text-emerald-500">
                        ₩98,420,000
                      </h5>
                    </div>
                  </div>

                  <div className="relative flex h-48 w-full items-end gap-2 px-2">
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-full flex-col justify-between opacity-10">
                      <div className="w-full border-b border-slate-900 dark:border-white" />
                      <div className="w-full border-b border-slate-900 dark:border-white" />
                      <div className="w-full border-b border-slate-900 dark:border-white" />
                      <div className="w-full border-b border-slate-900 dark:border-white" />
                    </div>

                    <div className="group relative h-[20%] flex-1 rounded-t-lg bg-[#2a6ef5]/20 transition-all hover:bg-[#2a6ef5]/40">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                        M1: ₩5.2M
                      </div>
                    </div>
                    <div className="h-[35%] flex-1 rounded-t-lg bg-[#2a6ef5]/25 transition-all hover:bg-[#2a6ef5]/45" />
                    <div className="h-[45%] flex-1 rounded-t-lg bg-[#2a6ef5]/30 transition-all hover:bg-[#2a6ef5]/50" />
                    <div className="h-[55%] flex-1 rounded-t-lg bg-[#2a6ef5]/40 transition-all hover:bg-[#2a6ef5]/60" />
                    <div className="h-[70%] flex-1 rounded-t-lg bg-[#2a6ef5]/50 transition-all hover:bg-[#2a6ef5]/70" />
                    <div className="relative h-[80%] flex-1 rounded-t-lg bg-[#2a6ef5]/60 transition-all hover:bg-[#2a6ef5]/80">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold whitespace-nowrap text-white shadow-lg dark:bg-[#2a6ef5]">
                        6개월 목표 달성
                      </div>
                    </div>
                    <div className="h-[85%] flex-1 rounded-t-lg bg-emerald-500/30 transition-all hover:bg-emerald-500/50" />
                    <div className="h-[90%] flex-1 rounded-t-lg bg-emerald-500/40 transition-all hover:bg-emerald-500/60" />
                    <div className="h-[95%] flex-1 rounded-t-lg bg-emerald-500/50 transition-all hover:bg-emerald-500/70" />
                    <div className="h-full flex-1 rounded-t-lg bg-emerald-500/60 transition-all hover:bg-emerald-500/80" />
                  </div>

                  <div className="mt-4 flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    <span>1개월</span>
                    <span>3개월</span>
                    <span>6개월</span>
                    <span>9개월</span>
                    <span>12개월</span>
                  </div>
                </div>
              </div>

            <div className="flex items-center justify-end gap-4 border-t border-slate-200 pt-6 dark:border-[#2D3139]">
              <button className="rounded-lg border border-slate-300 px-6 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-[#2D3139] dark:text-white dark:hover:bg-[#1a2029]">
                PDF 취소
              </button>
              <button
                onClick={generateReport}
                disabled={generating || !analysisId}
                className="flex items-center gap-2 rounded-lg bg-[#2a6ef5] px-8 py-3 font-bold text-white shadow-lg shadow-[#2a6ef5]/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ReportIcon name="picture_as_pdf" className="h-5 w-5" />
                {generating ? "리포트 생성 중..." : "최종 리포트 생성"}
              </button>
            </div>
            {reportMessage ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">
                {reportMessage}
              </div>
            ) : null}
            {reportError ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">
                {reportError}
              </div>
            ) : null}
          </div>
        </section>

          <section className="flex w-full flex-col border-l border-slate-300 bg-slate-200 dark:border-[#2D3139] dark:bg-[#0f1218] lg:w-[480px] xl:w-[560px]">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-300 bg-white px-6 dark:border-[#2D3139] dark:bg-[#1a2029]">
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                프리뷰: 경영 요약 (Page 1/4)
              </span>
              <div className="flex items-center gap-2">
                <button className="flex size-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#2D3139]">
                  <ReportIcon name="zoom_out" className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  100%
                </span>
                <button className="flex size-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#2D3139]">
                  <ReportIcon name="zoom_in" className="h-4 w-4" />
                </button>
                <div className="mx-1 h-4 w-px bg-slate-300 dark:bg-[#2D3139]" />
                <button className="flex size-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#2D3139]">
                  <ReportIcon name="fullscreen" className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="scrollbar-hide flex flex-1 flex-col items-center gap-8 overflow-y-auto bg-slate-100 p-10 dark:bg-[#080B11]">
              <div className="pdf-shadow relative origin-top scale-95 overflow-hidden rounded-sm bg-white p-10 text-slate-900 transition-transform [aspect-ratio:1/1.414] w-[420px]">
                <div className="absolute top-0 left-0 h-1.5 w-full bg-[#2a6ef5]" />

                <div className="mb-12 flex items-start justify-between">
                  <div>
                    <h5 className="mb-1 text-[10px] font-extrabold tracking-tighter text-[#2a6ef5] uppercase">
                      JeolgamAI Financial Insight
                    </h5>
                    <h1 className="text-2xl font-black text-slate-900">경영 요약 보고서</h1>
                    <p className="mt-1 text-[8px] text-slate-400">
                      발행일: 2024년 5월 20일 | 작성자: JeolgamAI 엔진 v4.2
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded bg-slate-900 text-white">
                    <ReportIcon name="insights" className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded border-l-4 border-[#2a6ef5] bg-slate-50 p-4">
                    <h6 className="mb-2 text-[10px] font-bold text-slate-500">
                      핵심 진단 (Key Findings)
                    </h6>
                    <p className="text-[11px] leading-relaxed font-medium text-slate-800 italic">
                      &quot;현재 클라우드 인프라의 24.5%가 비활성 상태로 방치되어
                      있으며, 예약 인스턴스 최적화를 통해 연간 최대 9천 8백만 원의
                      비용 절감이 가능할 것으로 분석됩니다.&quot;
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded border border-slate-100 p-4">
                      <p className="mb-1 text-[8px] font-bold text-slate-400 uppercase">
                        현재 월 지출
                      </p>
                      <p className="text-lg font-black text-slate-900">₩18.4M</p>
                    </div>
                    <div className="rounded border border-slate-100 p-4">
                      <p className="mb-1 text-[8px] font-bold text-slate-400 uppercase">
                        최적화 후 지출
                      </p>
                      <p className="text-lg font-black text-[#2a6ef5]">₩14.2M</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h6 className="border-b border-slate-100 pb-1 text-[10px] font-bold text-slate-500 uppercase">
                      절감 항목별 비중
                    </h6>
                    <div className="flex items-center gap-3">
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-[45%] bg-[#2a6ef5]" />
                        <div className="h-full w-[25%] bg-[#2a6ef5]/60" />
                        <div className="h-full w-[30%] bg-[#2a6ef5]/30" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-[#2a6ef5]" />
                        <span className="text-[7px] font-bold text-slate-600">
                          인스턴스 정리
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-[#2a6ef5]/60" />
                        <span className="text-[7px] font-bold text-slate-600">
                          RI 최적화
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-[#2a6ef5]/30" />
                        <span className="text-[7px] font-bold text-slate-600">
                          스토리지 티어링
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex h-20 w-full items-center justify-center rounded bg-slate-50">
                    <ReportIcon name="bar_chart" className="h-12 w-12 text-slate-200" />
                  </div>
                </div>

                <div className="absolute right-10 bottom-10 left-10 flex items-end justify-between border-t border-slate-100 pt-4">
                  <span className="text-[8px] text-slate-400">Strictly Confidential</span>
                  <span className="text-[8px] font-bold text-slate-900">Page 1 of 4</span>
                </div>
              </div>

              <div className="mb-10 w-[420px] rounded-sm border border-white/20 bg-white/40 [aspect-ratio:1/1.414] dark:bg-white/5" />
            </div>

            <div className="flex h-16 shrink-0 items-center justify-center gap-4 border-t border-slate-300 bg-white px-6 dark:border-[#2D3139] dark:bg-[#1a2029]">
              <button className="p-2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-white">
                <ReportIcon name="arrow_back_ios" className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-black text-slate-900 dark:bg-[#0f1218] dark:text-white">
                  1
                </span>
                <span className="mx-1 text-xs font-bold text-slate-400">/</span>
                <span className="text-xs font-bold text-slate-500">4</span>
              </div>
              <button className="p-2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-white">
                <ReportIcon name="arrow_forward_ios" className="h-4 w-4" />
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
=======
export default function NewReportRedirectPage() {
  redirect("/reports");
>>>>>>> origin/develop
}
