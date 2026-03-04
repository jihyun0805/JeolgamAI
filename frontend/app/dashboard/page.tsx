import Link from "next/link";
import { runAnalysis } from "@/lib/analysis-engine";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { getLatestAnalysis, getRecommendationsByAnalysis } from "@/lib/store";

export const dynamic = "force-dynamic";

type DashboardIconName =
  | "query_stats"
  | "dashboard"
  | "monitoring"
  | "auto_awesome"
  | "description"
  | "list_alt"
  | "settings"
  | "person"
  | "search"
  | "notifications"
  | "help_outline"
  | "account_balance_wallet"
  | "trending_up"
  | "savings"
  | "check_circle"
  | "percent"
  | "show_chart"
  | "bolt"
  | "grid_view"
  | "arrow_forward"
  | "bookmark"
  | "database"
  | "warning";

function DashboardIcon({
  name,
  className,
}: {
  name: DashboardIconName;
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
    case "query_stats":
      return (
        <svg {...baseProps}>
          <path d="M4 18V6" />
          <path d="M10 18v-7" />
          <path d="M16 18v-4" />
          <path d="M22 18V8" />
          <path d="m4 12 6-3 6 2 6-4" />
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
    case "monitoring":
      return (
        <svg {...baseProps}>
          <path d="M3 18.5h18" />
          <path d="m5 14 3-4 3 2 4-5 4 3" />
          <circle cx="8" cy="10" r="1" />
          <circle cx="15" cy="7" r="1" />
        </svg>
      );
    case "auto_awesome":
      return (
        <svg {...baseProps}>
          <path d="m12 3 1.6 3.8L17.5 8 13.7 9.6 12 13.5 10.3 9.6 6.5 8l3.9-1.2L12 3Z" />
          <path d="m18.5 13 1 2.3 2.5.7-2.5 1-1 2.3-1-2.3-2.5-1 2.5-.7 1-2.3Z" />
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
    case "list_alt":
      return (
        <svg {...baseProps}>
          <rect x="3.5" y="4" width="17" height="16" rx="2" />
          <path d="M8.5 9h8" />
          <path d="M8.5 13h8" />
          <path d="M8.5 17h8" />
          <circle cx="6.5" cy="9" r="0.8" />
          <circle cx="6.5" cy="13" r="0.8" />
          <circle cx="6.5" cy="17" r="0.8" />
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
    case "person":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20a7 7 0 0 1 14 0" />
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
    case "help_outline":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9.4a2.5 2.5 0 1 1 4.1 2c-.8.6-1.4 1-1.4 2.1" />
          <circle cx="12" cy="16.8" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "account_balance_wallet":
      return (
        <svg {...baseProps}>
          <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
          <path d="M3.5 9.5h17" />
          <path d="M16 12h3.5v3H16a1.5 1.5 0 1 1 0-3Z" />
        </svg>
      );
    case "trending_up":
      return (
        <svg {...baseProps}>
          <path d="m4 16 6-6 4 4 6-7" />
          <path d="M16 7h4v4" />
        </svg>
      );
    case "savings":
      return (
        <svg {...baseProps}>
          <path d="M5 14.5a6.8 6.8 0 0 0 6.8 6.8h1.4a6.8 6.8 0 0 0 0-13.6H8.8A3.8 3.8 0 0 0 5 11.5v3Z" />
          <path d="M10 12h4" />
          <path d="M12 10v4" />
        </svg>
      );
    case "check_circle":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.8 12.2 2.2 2.2 4.2-4.2" />
        </svg>
      );
    case "percent":
      return (
        <svg {...baseProps}>
          <path d="M6 18 18 6" />
          <circle cx="7.5" cy="7.5" r="2" />
          <circle cx="16.5" cy="16.5" r="2" />
        </svg>
      );
    case "show_chart":
      return (
        <svg {...baseProps}>
          <path d="M3.5 18.5h17" />
          <path d="m6 15 3-3 2 2 4-5 3 2" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...baseProps}>
          <path d="M13.5 2.8 6.5 13h4l-1 8.2 8-11h-4l.5-7.4Z" />
        </svg>
      );
    case "grid_view":
      return (
        <svg {...baseProps}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
        </svg>
      );
    case "arrow_forward":
      return (
        <svg {...baseProps}>
          <path d="M4 12h16" />
          <path d="m14 6 6 6-6 6" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...baseProps}>
          <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3-6 3V5.5a1 1 0 0 1 1-1Z" />
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
    case "warning":
      return (
        <svg {...baseProps}>
          <path d="M12 4 3.8 18.5h16.4L12 4Z" />
          <path d="M12 9v4.8" />
          <circle cx="12" cy="16.2" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

function formatKrw(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

export default function DashboardPage() {
  const latestAnalysis =
    getLatestAnalysis() ?? runAnalysis({ triggeredBy: "manual", lookbackDays: 30 });
  const recommendations = getRecommendationsByAnalysis(latestAnalysis.id);
  const prioritizedRecommendations = [...recommendations]
    .sort((a, b) => b.estMonthlySaving - a.estMonthlySaving)
    .slice(0, 6);
  const highRiskCount = recommendations.filter(
    (item) => item.riskLevel === "high" || item.riskLevel === "critical",
  ).length;

  const savingRate =
    latestAnalysis.totalMonthlyCost > 0
      ? (latestAnalysis.potentialMonthlySaving / latestAnalysis.totalMonthlyCost) * 100
      : 0;
  const wasteRatio =
    latestAnalysis.totalMonthlyCost > 0
      ? (latestAnalysis.wasteCost / latestAnalysis.totalMonthlyCost) * 100
      : 0;
  const idleWasteRatio = Math.max(8, Math.min(70, wasteRatio * 0.6));
  const overWasteRatio = Math.max(6, Math.min(55, wasteRatio * 0.4));
  const warningMessage =
    latestAnalysis.warnings[0] ?? "사용되지 않는 미연결 EBS 볼륨이 14개 감지되었습니다.";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="dashboard" />

      <main className="flex-1 overflow-y-auto bg-[#f5f6f8] dark:bg-[#0B0E14]">
        <PageTopBar
          title="대시보드 개요"
          description="실시간 클라우드 비용 현황 및 AI 최적화 제안"
        />

        <div className="mx-auto max-w-[1440px] space-y-8 p-4 md:p-8">
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="mb-4 flex items-start justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  총 월간 비용
                </span>
                <span className="rounded-lg bg-[#1c59f2]/10 p-1.5 text-[#1c59f2]">
                  <DashboardIcon
                    name="account_balance_wallet"
                    className="h-5 w-5"
                  />
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold tracking-tight">
                  {formatKrw(latestAnalysis.totalMonthlyCost)}
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                  <DashboardIcon name="trending_up" className="h-3 w-3" />
                  <span>최근 분석 기준</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="mb-4 flex items-start justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  예상 절감액
                </span>
                <span className="rounded-lg bg-[#16A34A]/10 p-1.5 text-[#16A34A]">
                  <DashboardIcon name="savings" className="h-5 w-5" />
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold tracking-tight text-[#16A34A]">
                  {formatKrw(latestAnalysis.potentialMonthlySaving)}
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#16A34A]">
                  <DashboardIcon name="check_circle" className="h-3 w-3" />
                  <span>{savingRate.toFixed(1)}% 최적화 가능</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="mb-4 flex items-start justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  절감률
                </span>
                <span className="rounded-lg bg-amber-500/10 p-1.5 text-amber-500">
                  <DashboardIcon name="percent" className="h-5 w-5" />
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold tracking-tight">
                  {savingRate.toFixed(1)}%
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <DashboardIcon name="show_chart" className="h-3 w-3" />
                  <span>데이터 소스 범위 반영</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#1c59f2] bg-white p-6 shadow-sm dark:border-slate-800 dark:border-l-[#1c59f2] dark:bg-[#161B22]">
              <div className="mb-4 flex items-start justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  AI 최적화 점수
                </span>
                <span className="rounded-lg bg-[#1c59f2]/10 p-1.5 text-[#1c59f2]">
                  <DashboardIcon name="bolt" className="h-5 w-5" />
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold tracking-tight">
                  {latestAnalysis.score.totalScore}/100
                </h3>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[#1c59f2]"
                    style={{ width: `${latestAnalysis.score.totalScore}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161B22] xl:col-span-2">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-lg font-bold">월별 비용 추이</h3>
                <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900">
                  <option>최근 6개월</option>
                  <option>최근 12개월</option>
                </select>
              </div>

              <div className="relative flex h-[280px] w-full items-end gap-2 px-2">
                <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full flex-col justify-between opacity-10">
                  <div className="w-full border-t border-slate-400" />
                  <div className="w-full border-t border-slate-400" />
                  <div className="w-full border-t border-slate-400" />
                  <div className="w-full border-t border-slate-400" />
                </div>
                <div className="group relative h-[60%] flex-1 rounded-t bg-slate-100 transition-colors hover:bg-[#1c59f2]/20 dark:bg-slate-800/50">
                  <div className="absolute inset-x-0 bottom-0 h-[80%] rounded-t bg-[#1c59f2] opacity-40" />
                </div>
                <div className="group relative h-[75%] flex-1 rounded-t bg-slate-100 transition-colors hover:bg-[#1c59f2]/20 dark:bg-slate-800/50">
                  <div className="absolute inset-x-0 bottom-0 h-[85%] rounded-t bg-[#1c59f2] opacity-40" />
                </div>
                <div className="group relative h-[85%] flex-1 rounded-t bg-slate-100 transition-colors hover:bg-[#1c59f2]/20 dark:bg-slate-800/50">
                  <div className="absolute inset-x-0 bottom-0 h-[90%] rounded-t bg-[#1c59f2] opacity-40" />
                </div>
                <div className="group relative h-[70%] flex-1 rounded-t bg-slate-100 transition-colors hover:bg-[#1c59f2]/20 dark:bg-slate-800/50">
                  <div className="absolute inset-x-0 bottom-0 h-[82%] rounded-t bg-[#1c59f2] opacity-40" />
                </div>
                <div className="group relative h-[90%] flex-1 rounded-t border-t-2 border-[#1c59f2] bg-slate-100 transition-colors hover:bg-[#1c59f2]/20 dark:bg-slate-800/50">
                  <div className="absolute inset-x-0 bottom-0 h-[95%] rounded-t bg-[#1c59f2] opacity-60" />
                </div>
                <div className="group relative h-[95%] flex-1 rounded-t bg-slate-100 transition-colors hover:bg-[#1c59f2]/20 dark:bg-slate-800/50">
                  <div className="absolute inset-x-0 bottom-0 h-full rounded-t bg-[#1c59f2] opacity-80" />
                </div>
              </div>
              <div className="mt-4 flex justify-between px-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                <span>1월</span>
                <span>2월</span>
                <span>3월</span>
                <span>4월</span>
                <span>5월</span>
                <span>6월</span>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161B22]">
              <h3 className="mb-6 text-lg font-bold">서비스별 비용 비중</h3>
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="relative flex size-48 items-center justify-center rounded-full border-[18px] border-slate-100 dark:border-slate-800">
                  <div className="absolute inset-0 -rotate-45 rounded-full border-[18px] border-[#1c59f2] border-r-transparent border-b-transparent" />
                  <div className="absolute inset-0 rotate-[10deg] rounded-full border-[18px] border-[#16A34A] border-t-transparent border-l-transparent border-r-transparent" />
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Total
                    </span>
                    <span className="text-xl font-extrabold">32M</span>
                  </div>
                </div>

                <div className="mt-8 w-full space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-[#1c59f2]" />
                      <span className="text-slate-600 dark:text-slate-400">
                        EC2 Instances
                      </span>
                    </div>
                    <span className="font-bold">48%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-[#16A34A]" />
                      <span className="text-slate-600 dark:text-slate-400">
                        S3 Storage
                      </span>
                    </div>
                    <span className="font-bold">22%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-amber-400" />
                      <span className="text-slate-600 dark:text-slate-400">
                        RDS Database
                      </span>
                    </div>
                    <span className="font-bold">18%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="text-slate-600 dark:text-slate-400">
                        기타
                      </span>
                    </div>
                    <span className="font-bold">12%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DashboardIcon
                  name="auto_awesome"
                  className="h-5 w-5 text-[#1c59f2]"
                />
                <h3 className="text-xl font-bold">AI 최적화 허브</h3>
              </div>
              <Link
                href="/ai-optimization"
                className="text-sm font-bold text-[#1c59f2] hover:underline"
              >
                실행형 화면으로 이동
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#1c59f2]/20 bg-gradient-to-br from-[#1c59f2]/10 via-white to-white p-6 dark:from-[#1c59f2]/20 dark:via-[#161B22] dark:to-[#161B22] xl:col-span-2">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-[#1c59f2] uppercase">
                      AI Optimization Queue
                    </p>
                    <h4 className="mt-1 text-2xl font-black tracking-tight">
                      {recommendations.length}개 최적화 안건 감지
                    </h4>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      추천안 상세 검토, AI 챗봇 대화, 실행 가이드 적용까지 한 화면에서 진행하세요.
                    </p>
                  </div>
                  <div className="grid min-w-[220px] grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#0B0E14]">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">월 절감 합계</p>
                      <p className="mt-1 text-lg font-extrabold text-[#16A34A]">
                        {formatKrw(latestAnalysis.potentialMonthlySaving)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#0B0E14]">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">고위험 안건</p>
                      <p className="mt-1 text-lg font-extrabold text-amber-500">{highRiskCount}건</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/ai-optimization"
                    className="rounded-lg bg-[#1c59f2] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1c59f2]/90"
                  >
                    AI 최적화 워크스페이스 열기
                  </Link>
                  <Link
                    href="/execution-guide"
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    구현 가이드로 이동
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
                <h4 className="mb-4 text-sm font-bold tracking-wide text-slate-500 uppercase">
                  우선순위 TOP 6
                </h4>
                <div className="space-y-3">
                  {prioritizedRecommendations.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#1c59f2]">
                          P{index + 1}
                        </span>
                        <span className="text-[11px] font-bold text-[#16A34A]">
                          {formatKrw(item.estMonthlySaving)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {item.riskLevel.toUpperCase()} · 신뢰도{" "}
                        {(item.confidenceScore * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#1c59f2]/20 bg-[#1c59f2]/5 p-8 dark:bg-[#1c59f2]/10">
            <div className="grid grid-cols-1 items-center gap-12 xl:grid-cols-2">
              <div>
                <h3 className="mb-2 text-2xl font-extrabold tracking-tight">
                  낭비 비용 분석 (Waste Ratio)
                </h3>
                <p className="mb-8 text-slate-600 dark:text-slate-400">
                  사용하지 않는 리소스와 오버프로비저닝으로 인한 월간 낭비
                  비율입니다.
                </p>

                <div className="space-y-6">
                  <div>
                    <div className="mb-2 flex justify-between text-sm font-bold">
                      <span>유휴 리소스 (Idle Resources)</span>
                      <span className="text-[#1c59f2]">
                        {idleWasteRatio.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-[#1c59f2]"
                        style={{ width: `${idleWasteRatio.toFixed(1)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-sm font-bold">
                      <span>오버프로비저닝 (Over-provisioning)</span>
                      <span className="text-[#16A34A]">
                        {overWasteRatio.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-[#16A34A]"
                        style={{ width: `${overWasteRatio.toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex justify-center">
                <div className="relative flex size-56 items-center justify-center rounded-full border-[20px] border-[#1c59f2]/10">
                  <div className="absolute inset-0 rotate-[180deg] rounded-full border-[20px] border-[#1c59f2] border-t-transparent border-l-transparent border-r-transparent" />
                  <div className="text-center">
                    <span className="block text-4xl font-black tracking-tighter text-[#1c59f2]">
                      {wasteRatio.toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                      Total Waste
                    </span>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 max-w-[180px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#161B22]">
                  <div className="mb-2 flex items-center gap-2 text-rose-500">
                    <DashboardIcon name="warning" className="h-4 w-4" />
                    <span className="text-[10px] font-bold">주의 필요</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {warningMessage}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
