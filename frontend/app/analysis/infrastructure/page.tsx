"use client";

import { useEffect, useMemo, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";

interface AnalysisPayload {
  project?: {
    id: string;
    name: string;
    awsRegion: string;
  } | null;
  analysis: {
    id: string;
    awsRegion: string;
    lookbackDays: number;
    totalMonthlyCost: number;
    potentialMonthlySaving: number;
    resources: Array<{
      id: string;
      name: string;
      type: string;
      region?: string;
      monthlyCost: number;
      status: string;
      riskLevel: string;
    }>;
    costBreakdown: Array<{
      service: string;
      usageType: string;
      monthlyCost: number;
      region: string;
      resourceCount: number;
    }>;
    warnings: string[];
  } | null;
  recommendations: Array<{
    id: string;
    title: string;
    estMonthlySaving: number;
    riskLevel: string;
  }>;
}

function formatKrw(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function riskLeftBorderClass(riskLevel: string) {
  switch (riskLevel.toLowerCase()) {
    case "low": return "border-l-emerald-400";
    case "medium": return "border-l-amber-400";
    case "high":
    case "critical": return "border-l-rose-400";
    default: return "border-l-slate-300 dark:border-l-slate-600";
  }
}

function riskBadgeClass(riskLevel: string) {
  switch (riskLevel.toLowerCase()) {
    case "low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
    case "high":
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function StatCard({
  label,
  value,
  sub,
  valueClass = "text-slate-900 dark:text-slate-100",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{sub}</p> : null}
    </div>
  );
}

export default function InfrastructureAnalysisPage() {
  const [data, setData] = useState<AnalysisPayload | null>(null);
  const [error, setError] = useState("");
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  async function loadAnalysis() {
    setError("");
    try {
      const response = await authFetch("/api/analysis/latest", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? "비용 분석 데이터를 불러오지 못했습니다.");
      }
      setData(payload.data as AnalysisPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  }

  useEffect(() => {
    loadAnalysis().catch(() => {});
  }, []);

  async function onRunAnalysis() {
    setRunningAnalysis(true);
    try {
      const response = await authFetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookbackDays: 30, triggeredBy: "manual" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "비용 분석 실행에 실패했습니다.");
      }
      window.dispatchEvent(new Event("app:notifications:refresh"));
      await loadAnalysis();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setRunningAnalysis(false);
    }
  }

  const project = data?.project ?? null;
  const analysis = data?.analysis ?? null;
  const recommendations = data?.recommendations ?? [];
  const warnings = analysis?.warnings ?? [];

  const sortedResources = useMemo(
    () => [...(analysis?.resources ?? [])].sort((a, b) => b.monthlyCost - a.monthlyCost),
    [analysis],
  );

  const savingsRate =
    analysis && analysis.totalMonthlyCost > 0
      ? Math.round((analysis.potentialMonthlySaving / analysis.totalMonthlyCost) * 100)
      : null;

  const annualSaving = analysis ? analysis.potentialMonthlySaving * 12 : null;

  const maxBreakdownCost = useMemo(
    () => Math.max(1, ...(analysis?.costBreakdown ?? []).map((item) => item.monthlyCost)),
    [analysis],
  );

  const maxResourceCost = sortedResources[0]?.monthlyCost ?? 1;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="analysis" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="비용 분석"
          description="AWS 서울 리전 비용을 기준으로 현재 프로젝트의 사용량과 권고를 분석합니다."
          actions={
            <button
              className="h-8 rounded-xl bg-brand px-4 py-0 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
              disabled={runningAnalysis}
              onClick={onRunAnalysis}
            >
              {runningAnalysis ? "분석 중…" : "분석 실행"}
            </button>
          }
        />

        <div className="flex min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-8 md:px-8 md:pt-8">
          <div className="w-full space-y-5">

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            {/* project context */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.24em] text-brand uppercase">
                  Project Cost Scope
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">
                  {project?.name ?? "프로젝트 로딩 중…"}
                </h2>
              </div>
              <p className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                최근 {analysis?.lookbackDays ?? 30}일 · {analysis?.awsRegion ?? "ap-northeast-2"}
              </p>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard
                label="월간 총 비용"
                value={analysis ? formatKrw(analysis.totalMonthlyCost) : "…"}
                sub="현재 프로젝트 기준"
              />
              <StatCard
                label="절감 가능 금액"
                value={analysis ? formatKrw(analysis.potentialMonthlySaving) : "…"}
                valueClass="text-emerald-600 dark:text-emerald-400"
                sub="권고 전체 적용 시"
              />
              <StatCard
                label="절감 비율"
                value={savingsRate !== null ? `${savingsRate}%` : "…"}
                valueClass="text-emerald-600 dark:text-emerald-400"
                sub="총 비용 대비"
              />
              <StatCard
                label="연간 절감 예상"
                value={annualSaving !== null ? formatKrw(annualSaving) : "…"}
                valueClass="text-brand"
                sub="월 절감액 × 12"
              />
            </div>

            {/* 2-col: cost breakdown + recommendations */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">

              {/* cost breakdown */}
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">서비스별 비용</h3>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                    AWS 서울 리전
                  </span>
                </div>

                {analysis?.costBreakdown?.length ? (
                  <div className="mt-5 space-y-4">
                    {analysis.costBreakdown.map((item) => (
                      <div key={`${item.service}-${item.usageType}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-sm font-semibold">{item.service}</span>
                            <span className="truncate text-xs text-slate-400 dark:text-slate-500">
                              {item.usageType}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {item.resourceCount}개
                            </span>
                            <span className="w-28 text-right text-sm font-bold tabular-nums">
                              {formatKrw(item.monthlyCost)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-1.5 rounded-full bg-brand/60 transition-all"
                            style={{ width: `${(item.monthlyCost / maxBreakdownCost) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">
                    아직 분석 결과가 없습니다. 상단의 분석 실행 버튼을 눌러주세요.
                  </p>
                )}
              </article>

              {/* recommendations */}
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">절감 권고</h3>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    상위 {Math.min(recommendations.length, 6)}건
                  </span>
                </div>

                {recommendations.length ? (
                  <div className="mt-4 space-y-2">
                    {recommendations.slice(0, 6).map((rec) => (
                      <div
                        key={rec.id}
                        className={`border-l-2 pl-3.5 rounded-r-xl border border-slate-100 py-2.5 dark:border-slate-800 ${riskLeftBorderClass(rec.riskLevel)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug">{rec.title}</p>
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${riskBadgeClass(rec.riskLevel)}`}
                          >
                            {rec.riskLevel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          ↓ {formatKrw(rec.estMonthlySaving)}/월
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">권고 없음</p>
                )}
              </article>
            </div>

            {/* resource rank table */}
            {sortedResources.length > 0 ? (
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <h3 className="font-bold">리소스 비용 순위</h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500">비용 높은 순 · active project</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-[#0f1218] dark:text-slate-400">
                        <th className="w-10 px-5 py-3 text-left font-semibold">#</th>
                        <th className="px-4 py-3 text-left font-semibold">리소스</th>
                        <th className="px-4 py-3 text-left font-semibold">타입</th>
                        <th className="px-4 py-3 text-left font-semibold">리전</th>
                        <th className="px-4 py-3 text-left font-semibold">상태</th>
                        <th className="px-4 py-3 text-left font-semibold">리스크</th>
                        <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">월 비용</th>
                        <th className="w-32 px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sortedResources.map((resource, index) => (
                        <tr
                          key={resource.id}
                          className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3.5 font-semibold">{resource.name}</td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{resource.type}</td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                            {resource.region ?? "ap-northeast-2"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {resource.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${riskBadgeClass(resource.riskLevel)}`}
                            >
                              {resource.riskLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold tabular-nums whitespace-nowrap">
                            {formatKrw(resource.monthlyCost)}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-1.5 rounded-full bg-brand/55"
                                style={{ width: `${(resource.monthlyCost / maxResourceCost) * 100}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ) : null}

            {/* warnings */}
            {warnings.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="font-bold">분석 주의사항</p>
                <ul className="mt-3 space-y-1.5">
                  {warnings.map((warning) => (
                    <li key={warning} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-amber-500">·</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div aria-hidden className="h-2 md:h-4" />
          </div>
        </div>
      </main>
    </div>
  );
}
