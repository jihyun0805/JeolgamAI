"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";

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

function getCostBasisLabel(data: DashboardPayload | null) {
  if (!data?.analysis) return null;
  if (data.analysis.sourceCoverage.aws) return "AWS 실측 기반";
  if (data.analysis.sourceCoverage.prometheus) return "Prometheus 기반 추정";
  return "제한적 분석";
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

/** 첫 줄: "낭비되고 있습니다" + 다음 문장까지. 그 다음 문장부터는 줄바꿈 */
function formatExecutiveSummaryWithBreaks(text: string) {
  const match = text.match(/([\s\S]*?낭비되고 있습니다\.?)\s*([\s\S]*)/);
  if (!match) return text;

  const upToPhrase = match[1].trim();
  const after = match[2].trim();
  if (!after) return upToPhrase;

  const sentenceMatch = after.match(/^[^.!?]*[.!?]/);
  const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : "";
  const rest = sentenceMatch ? after.slice(sentenceMatch[0].length).trim() : after;

  const firstLine = firstSentence ? `${upToPhrase} ${firstSentence}` : upToPhrase;
  if (!rest) return firstLine;

  const laterSentences = rest.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  return [firstLine, ...laterSentences].join("\n");
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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="m12 3 1.6 3.8L17.5 8l-3.8 1.6L12 13.5 10.3 9.6 6.5 8l3.9-1.2L12 3Z" />
      <path d="m18.5 13 1 2.3 2.5.7-2.5 1-1 2.3-1-2.3-2.5-1 2.5-.7 1-2.3Z" />
    </svg>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningAnalysis, setRunningAnalysis] = useState(false);

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
        .slice(0, 4),
    [data],
  );

  const costBasisLabel = getCostBasisLabel(data);
  const analysisTime = formatCompactDateTime(data?.analysis?.createdAt);
  const coverage = data?.analysis?.sourceCoverage;
  const sources = [
    { label: "AWS", enabled: Boolean(coverage?.aws) },
    { label: "Prometheus", enabled: Boolean(coverage?.prometheus) },
    { label: "K8s", enabled: Boolean(coverage?.k8s) },
  ];

  const metricCards = [
    {
      label: "총 월간 비용",
      value: data?.analysis ? formatKrw(data.analysis.totalMonthlyCost) : "—",
      sub: data?.analysis?.awsRegion ?? "ap-northeast-2",
      accent: "text-slate-900 dark:text-white",
      barClass: "bg-slate-300 dark:bg-slate-600",
    },
    {
      label: "예상 월 절감",
      value: data?.analysis ? formatKrw(data.analysis.potentialMonthlySaving) : "—",
      sub: `연간 ${data?.analysis ? formatKrw(data.analysis.potentialAnnualSaving) : "—"}`,
      accent: "text-emerald-600 dark:text-emerald-300",
      barClass: "bg-emerald-400",
    },
    {
      label: "낭비 비용",
      value: data?.analysis ? formatKrw(data.analysis.wasteCost) : "—",
      sub: "유휴·과할당 추정 포함",
      accent: "text-[#b41a2a] dark:text-[#e63946]",
      barClass: "bg-[#b41a2a]",
    },
    {
      label: "AI 점수",
      value: data?.analysis ? `${data.analysis.score.totalScore}점` : "—",
      sub: data?.analysis
        ? `${data.analysis.score.grade} · 신뢰도 ${data.analysis.score.confidencePercent}%`
        : "분석 없음",
      accent: "text-[#2a6ef5]",
      barClass: "bg-[#2a6ef5]",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="dashboard" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="대시보드"
          description="프로젝트 비용과 권고를 한눈에 확인합니다."
          actions={
            <button
              className="flex h-8 items-center rounded-xl bg-[#2a6ef5] px-4 py-0 text-sm font-bold text-white transition hover:bg-[#2262f0] disabled:opacity-60"
              disabled={runningAnalysis || loading}
              onClick={onRunAnalysis}
            >
              {runningAnalysis ? "분석 중…" : "분석 실행"}
            </button>
          }
        />

        <div className="content-area-subtle min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 md:px-8 md:pb-10 md:pt-8">
          <div className="w-full space-y-5">

            {/* Hero — project header */}
            <section className="shadow-card rounded-3xl border border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-[#1a2029]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.26em] text-[#2a6ef5] uppercase">
                    Active Project
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-black tracking-tight">
                    {loading ? "로딩 중…" : (data?.project?.name ?? "프로젝트 없음")}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {sources.map((src) => (
                      <span
                        key={src.label}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                          src.enabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-[#0f1218] dark:text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${src.enabled ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`}
                        />
                        {src.label}
                      </span>
                    ))}
                  </div>
                </div>
                {(costBasisLabel || analysisTime) && (
                  <div className="shrink-0 text-right">
                    {costBasisLabel && (
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {costBasisLabel}
                      </p>
                    )}
                    {analysisTime && (
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {analysisTime} 분석
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {error ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </section>
            ) : null}

            {/* Metric cards */}
            <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {metricCards.map((card) => (
                <article
                  key={card.label}
                  className="shadow-card relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1a2029]"
                >
                  <div className={`absolute top-0 left-0 right-0 h-[3px] ${card.barClass}`} />
                  <p className="text-xs font-bold tracking-[0.15em] text-slate-600 dark:text-slate-300 uppercase md:text-sm">
                    {card.label}
                  </p>
                  <p className={`mt-3 text-2xl font-black tracking-tight ${card.accent}`}>
                    {loading ? "…" : card.value}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {card.sub}
                  </p>
                </article>
              ))}
            </section>

            {/* AI Summary */}
            {data?.analysis?.executiveSummary ? (
              <section className="relative overflow-hidden rounded-2xl border border-[#2a6ef5]/30 bg-gradient-to-br from-[#2a6ef5]/25 via-[#2a6ef5]/12 to-[#2a6ef5]/5 backdrop-blur-xl px-5 py-4 shadow-[0_0_24px_-8px_rgba(42,110,245,0.25)] dark:shadow-[0_0_28px_-8px_rgba(42,110,245,0.2)] dark:border-[#2a6ef5]/25 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/15 before:to-transparent before:content-[''] dark:before:from-white/5">
                <div className="relative flex items-center gap-2 text-[#2a6ef5]">
                  <SparkleIcon />
                  <p className="text-[10px] font-bold tracking-[0.22em] uppercase">AI Analysis Summary</p>
                </div>
                <p className="relative mt-2.5 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {formatExecutiveSummaryWithBreaks(data.analysis.executiveSummary)}
                </p>
              </section>
            ) : null}

            {/* Bottom grid */}
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">

              {/* Recommendations */}
              <article className="shadow-card rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1a2029]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">상위 절감 권고</h3>
                  <Link
                    href="/ai-optimization"
                    className="text-xs font-semibold text-[#2a6ef5] transition hover:underline"
                  >
                    전체 보기 →
                  </Link>
                </div>
                <div className="mt-4 space-y-2.5">
                  {loading ? (
                    [1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                    ))
                  ) : topRecommendations.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">권고 없음</p>
                  ) : (
                    topRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700/60"
                      >
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${riskBadgeClass(rec.riskLevel)}`}
                        >
                          {rec.riskLevel}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={rec.title}>
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
              <article className="shadow-card flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1a2029]">
                <h3 className="font-bold">경고 및 신뢰도</h3>

                <div className="space-y-2">
                  {(data?.analysis?.warnings ?? []).map((warning) => (
                    <div
                      key={warning}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
                    >
                      {warning}
                    </div>
                  ))}
                  {!loading && (data?.analysis?.warnings.length ?? 0) === 0 ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      치명적인 경고 없음
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto rounded-2xl bg-slate-50 p-4 dark:bg-[#0f1218]">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                        Analysis Confidence
                      </p>
                      <p className={`mt-2 text-3xl font-black ${data?.analysis ? "text-[#2a6ef5]" : "text-slate-400"}`}>
                        {loading ? "…" : `${data?.analysis?.score.confidencePercent ?? 0}%`}
                      </p>
                    </div>
                    {data?.analysis && (
                      <span className="mb-1 rounded-full border border-[#2a6ef5]/20 bg-[#2a6ef5]/8 px-3 py-1 text-sm font-bold text-[#2a6ef5]">
                        {data.analysis.score.grade}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-[#2a6ef5] transition-all duration-700"
                      style={{ width: `${data?.analysis?.score.confidencePercent ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                    연동된 소스 수와 데이터 품질 기반
                  </p>
                </div>
              </article>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
