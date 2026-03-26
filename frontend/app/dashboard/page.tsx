"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";
import { AnalysisInsights } from "@/lib/types";

interface DashboardPayload {
  workspaceId: string;
  project?: {
    id: string;
    name: string;
    awsRegion: string;
  } | null;
  analysis: {
    id: string;
    totalMonthlyCost: number;
    wasteCost: number;
    potentialMonthlySaving: number;
    potentialAnnualSaving: number;
    awsRegion: string;
    createdAt: string;
    warnings: string[];
    sourceCoverage: {
      aws: boolean;
      k8s: boolean;
      prometheus: boolean;
    };
    score: {
      totalScore: number;
      grade: string;
      confidencePercent: number;
    };
    resources: Array<{
      id: string;
      name: string;
      type: string;
      monthlyCost: number;
      riskLevel: string;
      status: string;
    }>;
    executiveSummary?: string | null;
  } | null;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    estMonthlySaving: number;
    riskLevel: string;
    rationale?: string | null;
  }>;
  insights?: AnalysisInsights | null;
}

function formatKrw(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatCompactDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function riskLeftBorderClass(riskLevel: string) {
  switch (riskLevel.toLowerCase()) {
    case "low":      return "border-l-emerald-400 dark:border-l-emerald-500";
    case "medium":   return "border-l-amber-400 dark:border-l-amber-500";
    case "high":
    case "critical": return "border-l-rose-400 dark:border-l-rose-500";
    default:         return "border-l-slate-300 dark:border-l-slate-600";
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

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <path d="m12 3 1.6 3.8L17.5 8l-3.8 1.6L12 13.5 10.3 9.6 6.5 8l3.9-1.2L12 3Z" />
      <path d="m18.5 13 1 2.3 2.5.7-2.5 1-1 2.3-1-2.3-2.5-1 2.5-.7 1-2.3Z" />
    </svg>
  );
}

interface IntegrationCoverage {
  aws: boolean;
  k8s: boolean;
  prometheus: boolean;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [integrationCoverage, setIntegrationCoverage] = useState<IntegrationCoverage | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch("/api/analysis/latest", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? "대시보드 데이터를 불러오지 못했습니다.");
      }
      setData(payload.data as DashboardPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard().catch(() => {});
    authFetch("/api/integrations", { cache: "no-store" })
      .then((r) => r.json())
      .then((p) => { if (p?.ok && p?.data?.coverage) setIntegrationCoverage(p.data.coverage); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleWorkspaceChanged() {
      loadDashboard().catch(() => {});
    }
    window.addEventListener("app:workspace:changed", handleWorkspaceChanged);
    return () => {
      window.removeEventListener("app:workspace:changed", handleWorkspaceChanged);
    };
  }, []);

  async function onRunAnalysis() {
    setRunningAnalysis(true);
    setError("");
    try {
      const response = await authFetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookbackDays: 30, triggeredBy: "manual" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "분석 실행에 실패했습니다.");
      }
      window.dispatchEvent(new Event("app:notifications:refresh"));
      await loadDashboard();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setRunningAnalysis(false);
    }
  }

  const topRecommendations = useMemo(
    () =>
      [...(data?.recommendations ?? [])]
        .sort((a, b) => b.estMonthlySaving - a.estMonthlySaving)
        .slice(0, 5),
    [data],
  );

  const sources = [
    { label: "AWS", enabled: Boolean(integrationCoverage?.aws ?? data?.analysis?.sourceCoverage?.aws) },
    { label: "K8s", enabled: Boolean(integrationCoverage?.k8s ?? data?.analysis?.sourceCoverage?.k8s) },
    { label: "Prometheus", enabled: Boolean(integrationCoverage?.prometheus ?? data?.analysis?.sourceCoverage?.prometheus) },
  ];
  const analysisTime = formatCompactDateTime(data?.analysis?.createdAt);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="dashboard" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="대시보드"
          description="프로젝트 비용과 권고를 한눈에 확인합니다."
          actions={
            <button
              className="h-8 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              disabled={runningAnalysis || loading}
              onClick={onRunAnalysis}
            >
              {runningAnalysis ? "분석 중…" : "분석 실행"}
            </button>
          }
        />

        <div className="content-area-subtle min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-5 md:px-8 md:pt-7">
          <div className="w-full space-y-5">

            {/* Project info row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                  {loading ? "로딩 중…" : (data?.project?.name ?? "프로젝트 없음")}
                </h2>
                <div className="flex items-center gap-1.5">
                  {sources.map((src) => (
                    <span
                      key={src.label}
                      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        src.enabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-transparent dark:text-slate-600"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${src.enabled ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-700"}`} />
                      {src.label}
                    </span>
                  ))}
                </div>
              </div>
              {analysisTime && (
                <p className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {analysisTime} 분석
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </div>
            )}

            {/* Hero — savings focal point + stat strip */}
            <section className="shadow-card relative overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1a2029]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-transparent" />

              {/* Top: savings number */}
              <div className="relative px-7 py-7">
                <p className="text-xs font-bold tracking-[0.2em] text-emerald-600 uppercase dark:text-emerald-400">
                  절감 가능
                </p>
                <p className="mt-2 text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                  {loading ? (
                    <span className="text-slate-300 dark:text-slate-700">—</span>
                  ) : data?.analysis ? (
                    formatKrw(data.analysis.potentialMonthlySaving)
                  ) : (
                    <span className="text-slate-300 dark:text-slate-700">—</span>
                  )}
                  {data?.analysis && (
                    <span className="ml-1 text-lg font-semibold text-slate-400 dark:text-slate-500">/월</span>
                  )}
                </p>
                {data?.analysis && (
                  <p className="mt-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    연간 {formatKrw(data.analysis.potentialAnnualSaving)} 절약 가능
                  </p>
                )}
              </div>

              {/* Bottom stat strip */}
              <div className="relative grid grid-cols-3 border-t border-slate-100 dark:border-slate-800">
                <div className="px-7 py-4">
                  <p className="text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">총 월간 비용</p>
                  <p className="mt-1.5 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    {loading ? "…" : data?.analysis ? formatKrw(data.analysis.totalMonthlyCost) : "—"}
                  </p>
                </div>
                <div className="border-x border-slate-100 px-7 py-4 dark:border-slate-800">
                  <p className="text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">낭비 비용</p>
                  <p className="mt-1.5 text-xl font-black tracking-tight text-[#b41a2a] dark:text-[#e63946]">
                    {loading ? "…" : data?.analysis ? formatKrw(data.analysis.wasteCost) : "—"}
                  </p>
                </div>
                <div className="px-7 py-4">
                  <p className="text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">최적화 점수</p>
                  <p className="mt-1.5 text-xl font-black tracking-tight text-[#2a6ef5]">
                    {loading ? "…" : data?.analysis ? `${data.analysis.score.totalScore}점` : "—"}
                    {data?.analysis && (
                      <span className="ml-1.5 text-sm font-semibold text-slate-400 dark:text-slate-500">
                        {data.analysis.score.grade}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* AI Summary */}
            {data?.analysis?.executiveSummary && (
              <section className="shadow-card rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50/40 px-6 py-5 dark:border-orange-500/20 dark:from-orange-500/10 dark:to-amber-500/5">
                <div className="flex items-center gap-2 text-brand">
                  <SparkleIcon />
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase">AI 요약</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                  {data.analysis.executiveSummary}
                </p>
              </section>
            )}

            {/* Bottom 2-col */}
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">

              {/* Recommendations */}
              <article className="shadow-card rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1a2029]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">상위 절감 권고</h3>
                  <Link
                    href="/ai-optimization"
                    className="text-xs font-semibold text-brand transition hover:underline"
                  >
                    전체 보기 →
                  </Link>
                </div>
                <div className="mt-4 space-y-2">
                  {loading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                    ))
                  ) : topRecommendations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">분석 후 권고가 표시됩니다</p>
                  ) : (
                    topRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className={`flex items-center gap-3 rounded-xl border border-l-2 border-slate-100 py-2.5 pl-4 pr-4 dark:border-slate-700/50 ${riskLeftBorderClass(rec.riskLevel)}`}
                      >
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200" title={rec.title}>
                          {rec.title}
                        </p>
                        <span className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ↓ {formatKrw(rec.estMonthlySaving)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </article>

              {/* Warnings + confidence */}
              <article className="shadow-card flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1a2029]">
                {/* Warnings */}
                <div className="flex-1 p-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">경고</h3>
                  <div className="mt-3 space-y-2">
                    {(data?.analysis?.warnings ?? []).map((warning) => (
                      <div
                        key={warning}
                        className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
                      >
                        <span className="mt-0.5 shrink-0 text-amber-500">▲</span>
                        {warning}
                      </div>
                    ))}
                    {!loading && (data?.analysis?.warnings.length ?? 0) === 0 && (
                      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                        치명적인 경고 없음
                      </div>
                    )}
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="border-t border-slate-100 p-6 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">분석 신뢰도</h3>
                    {data?.analysis && (
                      <span className="rounded-full border border-brand/20 bg-brand/8 px-2.5 py-0.5 text-xs font-bold text-brand">
                        {data.analysis.score.grade}
                      </span>
                    )}
                  </div>
                  <p className={`mt-3 text-3xl font-black ${data?.analysis ? "text-brand" : "text-slate-300 dark:text-slate-700"}`}>
                    {loading ? "…" : `${data?.analysis?.score.confidencePercent ?? 0}%`}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-700"
                      style={{ width: `${data?.analysis?.score.confidencePercent ?? 0}%` }}
                    />
                  </div>
                </div>
              </article>

            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
