"use client";

import { useEffect, useMemo, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCostBasisLabel(data: DashboardPayload | null) {
  if (!data?.analysis) return "분석 없음";

  if (data.analysis.sourceCoverage.aws) {
    return "AWS 실측 비용 기반";
  }

  if (data.analysis.sourceCoverage.prometheus) {
    return "Prometheus capacity 기반 추정";
  }

  return "연동 부족으로 제한된 분석";
}

function getSourcePillClass(enabled: boolean) {
  return enabled
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-400";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const costBasisLabel = getCostBasisLabel(data);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analysis/latest", { cache: "no-store" });
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
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        .sort((left, right) => right.estMonthlySaving - left.estMonthlySaving)
        .slice(0, 4),
    [data],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="dashboard" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="대시보드 개요"
          description="프로젝트별 서울 리전 비용과 권고를 한 번에 확인합니다."
          actions={
            <button
              className="rounded-lg bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#194fd8] disabled:opacity-60"
              disabled={runningAnalysis}
              onClick={onRunAnalysis}
            >
              {runningAnalysis ? "분석 실행 중..." : "분석 다시 실행"}
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.24em] text-[#1c59f2] uppercase">
                    Active Project
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">
                    {data?.project?.name ?? "프로젝트 로딩 중"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    AWS 비용 기준 리전: {data?.analysis?.awsRegion ?? "ap-northeast-2"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      {
                        label: "AWS",
                        enabled: Boolean(data?.analysis?.sourceCoverage.aws),
                      },
                      {
                        label: "Prometheus",
                        enabled: Boolean(data?.analysis?.sourceCoverage.prometheus),
                      },
                      {
                        label: "K8s",
                        enabled: Boolean(data?.analysis?.sourceCoverage.k8s),
                      },
                    ].map((source) => (
                      <span
                        key={source.label}
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getSourcePillClass(source.enabled)}`}
                      >
                        {source.label} {source.enabled ? "연동됨" : "미연동"}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-[#0B0E14]">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">분석 기준</p>
                    <p className="font-bold">{costBasisLabel}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">최근 분석 시각</p>
                    <p className="font-bold">
                      {formatDateTime(data?.analysis?.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">보안 스코프</p>
                    <p className="font-bold">현재 로그인 사용자의 프로젝트만 조회 가능</p>
                  </div>
                </div>
              </div>
            </section>

            {error ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "총 월간 비용",
                  value: data?.analysis ? formatKrw(data.analysis.totalMonthlyCost) : "-",
                  accent: "text-slate-900 dark:text-white",
                  hint: costBasisLabel,
                },
                {
                  label: "예상 월 절감",
                  value: data?.analysis
                    ? formatKrw(data.analysis.potentialMonthlySaving)
                    : "-",
                  accent: "text-emerald-600 dark:text-emerald-300",
                  hint: "현재 연동 상태 기준 추정 절감액",
                },
                {
                  label: "낭비 비용",
                  value: data?.analysis ? formatKrw(data.analysis.wasteCost) : "-",
                  accent: "text-amber-600 dark:text-amber-300",
                  hint: "유휴 자원 및 과할당 추정 포함",
                },
                {
                  label: "AI 점수",
                  value: data?.analysis
                    ? `${data.analysis.score.totalScore} / ${data.analysis.score.grade}`
                    : "-",
                  accent: "text-[#1c59f2]",
                  hint: "연결된 소스와 신뢰도를 반영",
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161B22]"
                >
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className={`mt-3 text-2xl font-black tracking-tight ${card.accent}`}>
                    {loading ? "..." : card.value}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{card.hint}</p>
                </article>
              ))}
            </section>

            {data?.analysis?.executiveSummary ? (
              <section className="rounded-2xl border border-[#1c59f2]/20 bg-[#1c59f2]/5 p-5 shadow-sm dark:border-[#1c59f2]/30 dark:bg-[#11234d]/30">
                <p className="text-xs font-bold tracking-[0.24em] text-[#1c59f2] uppercase">
                  AI Analysis Summary
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {data.analysis.executiveSummary}
                </p>
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">상위 절감 권고</h3>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    프로젝트 기준
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  {topRecommendations.map((recommendation) => (
                    <div
                      key={recommendation.id}
                      className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold">{recommendation.title}</h4>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {recommendation.rationale ?? recommendation.description}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#1c59f2]/10 px-3 py-1 text-xs font-bold text-[#1c59f2]">
                          {recommendation.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                        예상 월 절감 {formatKrw(recommendation.estMonthlySaving)}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                <h3 className="text-lg font-bold">리스크 / 경고</h3>
                <div className="mt-4 space-y-3">
                  {(data?.analysis?.warnings ?? []).map((warning) => (
                    <div
                      key={warning}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
                    >
                      {warning}
                    </div>
                  ))}
                  {!loading && (data?.analysis?.warnings.length ?? 0) === 0 ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
                      현재 프로젝트에 치명적인 경고가 없습니다.
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-[#0B0E14]">
                  <p className="text-xs font-bold tracking-[0.24em] text-slate-500 uppercase">
                    Confidence
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {data?.analysis?.score.confidencePercent ?? 0}%
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    AWS 서울 리전 비용과 연결 상태를 반영한 신뢰도입니다.
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
