import { getLatestAnalysis } from "@/lib/store";
import { runAnalysis } from "@/lib/analysis-engine";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

export const dynamic = "force-dynamic";

type InfraIconName =
  | "analytics"
  | "dashboard"
  | "bar_chart"
  | "payments"
  | "settings"
  | "search"
  | "notifications"
  | "download"
  | "expand_more"
  | "calendar_today"
  | "warning"
  | "computer"
  | "database"
  | "hard_drive"
  | "more_vert"
  | "chevron_left"
  | "chevron_right";

function InfraIcon({
  name,
  className,
}: {
  name: InfraIconName;
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
    case "analytics":
      return (
        <svg {...baseProps}>
          <rect x="4" y="12" width="3" height="7" rx="0.8" />
          <rect x="10.5" y="8" width="3" height="11" rx="0.8" />
          <rect x="17" y="5" width="3" height="14" rx="0.8" />
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
    case "bar_chart":
      return (
        <svg {...baseProps}>
          <path d="M4 19V8" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19V9" />
        </svg>
      );
    case "payments":
      return (
        <svg {...baseProps}>
          <path d="M4 8.5h16v7H4z" />
          <path d="M4 11h16" />
          <path d="M8 14h4" />
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
    case "download":
      return (
        <svg {...baseProps}>
          <path d="M12 4v11" />
          <path d="m8 11 4 4 4-4" />
          <path d="M4 19h16" />
        </svg>
      );
    case "expand_more":
      return (
        <svg {...baseProps}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "calendar_today":
      return (
        <svg {...baseProps}>
          <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
          <path d="M3.5 9.5h17" />
          <path d="M8 3.5v4" />
          <path d="M16 3.5v4" />
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
    case "computer":
      return (
        <svg {...baseProps}>
          <rect x="3.5" y="5" width="17" height="11" rx="1.5" />
          <path d="M8.5 19h7" />
          <path d="M12 16v3" />
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
    case "hard_drive":
      return (
        <svg {...baseProps}>
          <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
          <circle cx="16.5" cy="12" r="1" />
          <path d="M7 12h5" />
        </svg>
      );
    case "more_vert":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "chevron_left":
      return (
        <svg {...baseProps}>
          <path d="m14 6-6 6 6 6" />
        </svg>
      );
    case "chevron_right":
      return (
        <svg {...baseProps}>
          <path d="m10 6 6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}

function formatKrw(amount: number): string {
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

function getResourceIcon(type: string): InfraIconName {
  if (type.includes("rds") || type.includes("db")) return "database";
  if (type.includes("ebs") || type.includes("disk") || type.includes("gp")) {
    return "hard_drive";
  }
  return "computer";
}

function getStatusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "running") return "Running";
  if (normalized === "available") return "Available";
  if (normalized === "warning") return "Warning";
  if (normalized === "unused") return "Unused";
  return status;
}

function getStatusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "running" || normalized === "available") {
    return "text-emerald-500";
  }
  if (normalized === "warning") return "text-amber-500";
  if (normalized === "unused") return "text-slate-400";
  return "text-slate-500";
}

function getRiskBadgeClass(risk: string): string {
  if (risk === "critical") {
    return "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300";
  }
  if (risk === "high") {
    return "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300";
  }
  if (risk === "medium") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300";
  }
  return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
}

export default function InfrastructureAnalysisPage() {
  const latestAnalysis =
    getLatestAnalysis() ?? runAnalysis({ triggeredBy: "manual", lookbackDays: 30 });
  const resources = latestAnalysis.resources;
  const tableResources = resources.slice(0, 12);
  const alerts = resources
    .filter(
      (resource) =>
        resource.riskLevel === "critical" ||
        resource.riskLevel === "high" ||
        resource.status === "unused",
    )
    .slice(0, 4)
    .map((resource) => ({
      ...resource,
      estimatedSaving: Math.round(
        resource.monthlyCost *
          (resource.riskLevel === "critical"
            ? 0.4
            : resource.riskLevel === "high"
              ? 0.2
              : 0.1),
      ),
    }));

  const topResource = resources[0];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#101522] dark:text-slate-100">
      <MainSidebar active="analysis" />

      <main className="flex flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="인프라 상세 분석"
          description="클라우드 자원 사용량 및 비용 효율성 정밀 진단"
          searchPlaceholder="리소스 ID 또는 태그 검색"
          actions={
            <button className="flex items-center gap-2 rounded-lg bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-[#1c59f2]/20">
              <InfraIcon name="download" className="h-4 w-4" />
              데이터 내보내기
            </button>
          }
        />

        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto bg-slate-50 p-4 dark:bg-[#101522] md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-3">
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-[#1c59f2] dark:border-[#2d3446] dark:bg-[#1a1f2e]">
                  프로젝트: <span className="text-[#1c59f2]">전체</span>
                  <InfraIcon name="expand_more" className="h-4 w-4" />
                </button>
              </div>
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-[#1c59f2] dark:border-[#2d3446] dark:bg-[#1a1f2e]">
                  서비스 유형: <span className="text-[#1c59f2]">EC2, RDS, EBS</span>
                  <InfraIcon name="expand_more" className="h-4 w-4" />
                </button>
              </div>
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-[#1c59f2] dark:border-[#2d3446] dark:bg-[#1a1f2e]">
                  리전:
                  <span className="text-[#1c59f2]">아시아 태평양 (서울)</span>
                  <InfraIcon name="expand_more" className="h-4 w-4" />
                </button>
              </div>
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-[#1c59f2] dark:border-[#2d3446] dark:bg-[#1a1f2e]">
                  기간: <span className="text-[#1c59f2]">최근 {latestAnalysis.lookbackDays}일</span>
                  <InfraIcon name="calendar_today" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="col-span-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2d3446] dark:bg-[#1a1f2e] xl:col-span-2">
              <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold">CPU / 메모리 사용률 추이</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#1c59f2]" />
                      <span className="text-xs font-medium text-slate-500">CPU</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="text-xs font-medium text-slate-500">메모리</span>
                    </div>
                  </div>
                </div>
                <div className="rounded bg-slate-100 px-2 py-1 text-xs font-bold tracking-wider text-slate-500 uppercase dark:bg-[#101522]">
                  {topResource?.id ?? "resource"}
                </div>
              </div>
              <div className="relative h-48 w-full">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 800 200">
                  <defs>
                    <linearGradient id="grad-primary" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1c59f2" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#1c59f2" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,150 Q50,140 100,160 T200,100 T300,120 T400,60 T500,80 T600,40 T700,70 T800,50 V200 H0 Z"
                    fill="url(#grad-primary)"
                  />
                  <path
                    d="M0,150 Q50,140 100,160 T200,100 T300,120 T400,60 T500,80 T600,40 T700,70 T800,50"
                    fill="none"
                    stroke="#1c59f2"
                    strokeWidth="3"
                  />
                  <path
                    d="M0,180 Q50,175 100,185 T200,160 T300,170 T400,140 T500,150 T600,130 T700,145 T800,140"
                    fill="none"
                    stroke="#64748b"
                    strokeDasharray="4"
                    strokeWidth="2"
                  />
                </svg>
                <div className="absolute right-0 bottom-0 left-0 mt-4 flex justify-between border-t border-slate-100 px-1 pt-2 text-[10px] font-medium text-slate-400 dark:border-[#2d3446]">
                  <span>02:00</span>
                  <span>06:00</span>
                  <span>10:00</span>
                  <span>14:00</span>
                  <span>18:00</span>
                  <span>22:00</span>
                  <span>현재</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2d3446] dark:bg-[#1a1f2e]">
              <div className="mb-4 flex items-center gap-2 text-amber-500">
                <InfraIcon name="warning" className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  미사용 리소스 감지
                </h3>
              </div>
              <div className="scrollbar-hide flex-1 space-y-3 overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-[#2d3446] dark:bg-[#101522]">
                    현재 즉시 조치가 필요한 리소스가 없습니다.
                  </div>
                ) : (
                  alerts.map((resource) => (
                    <div
                      key={resource.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-[#2d3446] dark:bg-[#101522]"
                    >
                      <div className="mb-1 flex items-start justify-between">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {resource.name}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${getRiskBadgeClass(
                            resource.riskLevel,
                          )}`}
                        >
                          {resource.riskLevel}
                        </span>
                      </div>
                      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                        {resource.id} · {resource.type} · 상태: {getStatusLabel(resource.status)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          절감액: {formatKrw(resource.estimatedSaving)}/월
                        </span>
                        <button className="text-xs font-bold text-[#1c59f2] hover:underline">
                          상세보기
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#2d3446] dark:bg-[#1a1f2e]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-[#2d3446]">
              <h3 className="text-lg font-bold">전체 리소스 현황 ({resources.length})</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">정렬 기준:</span>
                <select className="cursor-pointer border-none bg-transparent text-xs font-bold text-slate-600 focus:ring-0 dark:text-slate-300">
                  <option>비용 높은 순</option>
                  <option>사용량 낮은 순</option>
                  <option>최근 생성 순</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:bg-[#101522]/50 dark:text-slate-400">
                    <th className="px-6 py-4">리소스 ID / 이름</th>
                    <th className="px-6 py-4">유형</th>
                    <th className="px-6 py-4">상태</th>
                    <th className="px-6 py-4">평균 CPU 사용률</th>
                    <th className="px-6 py-4">평균 메모리</th>
                    <th className="px-6 py-4 text-right">월 예상 비용</th>
                    <th className="w-10 px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-[#2d3446]">
                  {tableResources.map((resource) => {
                    const highlight =
                      resource.riskLevel === "critical" || resource.riskLevel === "high";
                    const cpuWidth = Math.max(1, Math.min(100, resource.cpuUsagePercent ?? 0));
                    const memoryWidth = Math.max(
                      1,
                      Math.min(100, resource.memoryUsagePercent ?? 0),
                    );

                    return (
                      <tr
                        key={resource.id}
                        className={`group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-[#101522]/30 ${
                          highlight ? "border-l-2 border-[#1c59f2] bg-[#1c59f2]/5" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {resource.id}
                            </span>
                            <span className="text-xs text-slate-500">{resource.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <InfraIcon
                              name={getResourceIcon(resource.type)}
                              className="h-5 w-5 text-[#1c59f2]"
                            />
                            <span className="text-xs font-medium">{resource.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`flex items-center gap-1.5 text-xs font-bold ${getStatusClass(
                              resource.status,
                            )}`}
                          >
                            <span className="h-2 w-2 rounded-full bg-current" />
                            {getStatusLabel(resource.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {resource.cpuUsagePercent === null ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="max-w-[80px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-[#2d3446]">
                                <div
                                  className="h-1.5 rounded-full bg-[#1c59f2]"
                                  style={{ width: `${cpuWidth}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold">
                                {resource.cpuUsagePercent.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {resource.memoryUsagePercent === null ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="max-w-[80px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-[#2d3446]">
                                <div
                                  className="h-1.5 rounded-full bg-slate-400"
                                  style={{ width: `${memoryWidth}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-500">
                                {resource.memoryUsagePercent.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatKrw(resource.monthlyCost)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="p-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <InfraIcon name="more_vert" className="h-4 w-4 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-[#2d3446] dark:bg-[#101522]/30">
              <div className="text-xs font-medium text-slate-500">
                {resources.length}개 중 1-{tableResources.length}개 표시 중
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded p-1 transition-colors hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-[#1a1f2e]"
                  disabled
                >
                  <InfraIcon name="chevron_left" className="h-4 w-4" />
                </button>
                <button className="flex h-7 w-7 items-center justify-center rounded bg-[#1c59f2] text-xs font-bold text-white">
                  1
                </button>
                <button className="rounded p-1 transition-colors hover:bg-slate-200 dark:hover:bg-[#1a1f2e]">
                  <InfraIcon name="chevron_right" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
