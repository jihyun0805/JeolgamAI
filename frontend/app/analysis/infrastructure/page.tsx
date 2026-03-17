"use client";

import { useEffect, useMemo, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

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

export default function InfrastructureAnalysisPage() {
  const [data, setData] = useState<AnalysisPayload | null>(null);
  const [error, setError] = useState("");
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  async function loadAnalysis() {
    setError("");
    try {
      const response = await fetch("/api/analysis/latest", { cache: "no-store" });
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
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lookbackDays: 30, triggeredBy: "manual" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "비용 분석 실행에 실패했습니다.");
      }
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
    () =>
      [...(analysis?.resources ?? [])].sort(
        (left, right) => right.monthlyCost - left.monthlyCost,
      ),
    [analysis],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#101522] dark:text-slate-100">
      <MainSidebar active="analysis" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="프로젝트 비용 분석"
          description="AWS 서울 리전 비용을 기준으로 현재 프로젝트의 사용량과 권고를 분석합니다."
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

        <div className="flex min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.24em] text-[#1c59f2] uppercase">
                    Project Cost Scope
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">
                    {project?.name ?? "프로젝트 로딩 중"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    분석 기간 최근 {analysis?.lookbackDays ?? 30}일 · 리전{" "}
                    {analysis?.awsRegion ?? "ap-northeast-2"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-[#0B0E14]">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">월간 비용</p>
                    <p className="mt-1 text-xl font-black">
                      {analysis ? formatKrw(analysis.totalMonthlyCost) : "..."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">월 절감 가능</p>
                    <p className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-300">
                      {analysis ? formatKrw(analysis.potentialMonthlySaving) : "..."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {error ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">서비스별 비용 산정</h3>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    AWS 서울 리전 기반
                  </span>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-[#0B0E14]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">서비스</th>
                        <th className="px-4 py-3 text-left font-semibold">Usage Type</th>
                        <th className="px-4 py-3 text-left font-semibold">리소스 수</th>
                        <th className="px-4 py-3 text-right font-semibold">월 비용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(analysis?.costBreakdown ?? []).map((item) => (
                        <tr key={`${item.service}-${item.usageType}`}>
                          <td className="px-4 py-3 font-semibold">{item.service}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {item.usageType}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {item.resourceCount}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatKrw(item.monthlyCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!analysis ? (
                  <div className="border-t border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    아직 분석 결과가 없습니다. 상단의 분석 다시 실행 버튼으로 직접 실행해주세요.
                  </div>
                ) : null}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                <h3 className="text-lg font-bold">상위 절감 권고</h3>
                <div className="mt-4 space-y-3">
                  {recommendations.slice(0, 5).map((recommendation) => (
                    <div
                      key={recommendation.id}
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{recommendation.title}</p>
                        <span className="rounded-full bg-[#1c59f2]/10 px-2 py-1 text-xs font-bold text-[#1c59f2]">
                          {recommendation.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">
                        예상 월 절감 {formatKrw(recommendation.estMonthlySaving)}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">리소스별 비용 Top</h3>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  현재 active project만 표시
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sortedResources.map((resource) => (
                  <div
                    key={resource.id}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{resource.name}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {resource.type} · {resource.region ?? "ap-northeast-2"}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {resource.status}
                      </span>
                    </div>
                    <p className="mt-4 text-2xl font-black tracking-tight">
                      {formatKrw(resource.monthlyCost)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      리스크 {resource.riskLevel.toUpperCase()}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {warnings.length > 0 ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="font-bold">분석 주의사항</p>
                <ul className="mt-3 space-y-2">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
