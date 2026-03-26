"use client";

import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";
import { ReportArtifact } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface AnalysisPayload {
  project?: {
    id: string;
    name: string;
    awsRegion: string;
  } | null;
  analysis: {
    id: string;
    awsRegion: string;
    totalMonthlyCost: number;
    wasteCost: number;
    potentialMonthlySaving: number;
    potentialAnnualSaving: number;
    executiveSummary?: string | null;
    score: {
      totalScore: number;
      grade: string;
    };
  } | null;
  recommendations: Array<{
    id: string;
    title: string;
  }>;
}

interface ReportListPayload {
  project?: {
    id: string;
    name: string;
    awsRegion: string;
  } | null;
  reports: ReportArtifact[];
  count: number;
}

function formatKrw(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function templateLabel() {
  return "통합 리포트";
}

function extractFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const asciiMatch = contentDisposition.match(/filename="([^"]+)"/i) ?? contentDisposition.match(/filename=([^;]+)/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1].trim();
  }
  return fallback;
}

export default function ReportsPage() {
  const [analysisData, setAnalysisData] = useState<AnalysisPayload | null>(null);
  const [reportsData, setReportsData] = useState<ReportListPayload | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selectedReportIdRef = useRef<string | null>(null);
  selectedReportIdRef.current = selectedReportId;

  function replaceReportQuery(reportId: string | null) {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (reportId) {
      url.searchParams.set("reportId", reportId);
    } else {
      url.searchParams.delete("reportId");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  const loadPageData = useCallback(async (nextSelectedReportId?: string | null) => {
    setLoading(true);
    setError("");
    try {
      const [analysisResponse, reportsResponse] = await Promise.all([
        authFetch("/api/analysis/latest", { cache: "no-store" }),
        authFetch("/api/reports/generate", { cache: "no-store" }),
      ]);

      const analysisPayload = await analysisResponse.json();
      const reportsPayload = await reportsResponse.json();

      if (!analysisResponse.ok || !analysisPayload?.ok || !analysisPayload?.data) {
        throw new Error(analysisPayload?.error?.message ?? "최신 분석을 불러오지 못했습니다.");
      }

      if (!reportsResponse.ok || !reportsPayload?.ok || !reportsPayload?.data) {
        throw new Error(reportsPayload?.error?.message ?? "리포트 목록을 불러오지 못했습니다.");
      }

      const nextAnalysisData = analysisPayload.data as AnalysisPayload;
      const nextReportsData = reportsPayload.data as ReportListPayload;
      const requestedId = nextSelectedReportId ?? selectedReportIdRef.current;
      const resolvedSelectedId =
        (requestedId &&
        nextReportsData.reports.some((report) => report.id === requestedId)
          ? requestedId
          : nextReportsData.reports[0]?.id) ?? null;

      setAnalysisData(nextAnalysisData);
      setReportsData(nextReportsData);
      setSelectedReportId(resolvedSelectedId);

      replaceReportQuery(resolvedSelectedId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const reportId =
      typeof window === "undefined"
        ? null
        : new URL(window.location.href).searchParams.get("reportId");
    setSelectedReportId(reportId);
    loadPageData(reportId).catch(() => {});
  }, [loadPageData]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 7000);
    return () => clearTimeout(t);
  }, [error]);

  const selectedReport = useMemo(
    () => reportsData?.reports.find((report) => report.id === selectedReportId) ?? null,
    [reportsData, selectedReportId],
  );

  async function handleGenerateReport() {
    if (!analysisData?.analysis?.id) {
      setError("먼저 비용 분석을 실행해야 리포트를 생성할 수 있습니다.");
      return;
    }

    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const response = await authFetch("/api/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisId: analysisData.analysis.id,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? "리포트 생성에 실패했습니다.");
      }

      const createdReport = payload.data as ReportArtifact;
      setMessage(`${templateLabel()}를 생성했습니다.`);
      await loadPageData(createdReport.id);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : String(generateError));
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportReport() {
    if (!selectedReport) return;

    setExporting(true);
    setError("");
    setMessage("");
    try {
      const response = await authFetch(
        `/api/reports/generate?reportId=${encodeURIComponent(selectedReport.id)}&format=pdf`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "리포트 PDF 다운로드에 실패했습니다.");
      }

      const blob = await response.blob();
      const fallbackName = `jeolgamai-report-${selectedReport.id}.pdf`;
      const filename = extractFilename(response.headers.get("content-disposition"), fallbackName);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage("PDF 다운로드를 시작했습니다.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : String(exportError));
    } finally {
      setExporting(false);
    }
  }

  function selectReport(reportId: string) {
    setSelectedReportId(reportId);
    replaceReportQuery(reportId);
  }

  const projectName = reportsData?.project?.name ?? analysisData?.project?.name ?? "프로젝트 로딩 중";
  const summary = selectedReport?.payload ?? null;
  const topRecommendations = summary?.topRecommendations ?? [];
  const topCostItems = summary?.topCostItems ?? [];
  const executionPlan = summary?.executionPlan ?? [];
  const warnings = summary?.warnings ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="reports" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="리포트"
          description="분석 스냅샷을 기반으로 경영 요약과 실행 계획을 함께 담은 통합 리포트를 생성하고 관리합니다."
          actions={
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={generating || !analysisData?.analysis}
              className="flex h-8 items-center rounded-xl bg-brand px-4 py-0 text-sm font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? "리포트 생성 중..." : "통합 리포트 생성"}
            </button>
          }
        />

        <div className="flex min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <div className="w-full space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.24em] text-[#1c59f2] uppercase">
                    Report Scope
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">{projectName}</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    최신 분석 기준으로 경영 요약과 실행 리포트를 함께 생성합니다. 생성된 결과는 backend DB에 보관됩니다.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-[#0F141C]">
                    <p className="text-xs text-slate-500 dark:text-slate-400">총 월 비용</p>
                    <p className="mt-2 text-xl font-black">
                      {analysisData?.analysis ? formatKrw(analysisData.analysis.totalMonthlyCost) : "-"}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-[#0F141C]">
                    <p className="text-xs text-slate-500 dark:text-slate-400">예상 월 절감</p>
                    <p className="mt-2 text-xl font-black text-emerald-500">
                      {analysisData?.analysis ? formatKrw(analysisData.analysis.potentialMonthlySaving) : "-"}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-[#0F141C]">
                    <p className="text-xs text-slate-500 dark:text-slate-400">분석 점수</p>
                    <p className="mt-2 text-xl font-black">
                      {analysisData?.analysis
                        ? `${analysisData.analysis.score.totalScore}점 · ${analysisData.analysis.score.grade}`
                        : "-"}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-[#0F141C]">
                    <p className="text-xs text-slate-500 dark:text-slate-400">생성 리포트</p>
                    <p className="mt-2 text-xl font-black">{reportsData?.count ?? 0}건</p>
                  </article>
                </div>
              </div>
            </section>

            {error ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </section>
            ) : null}

            {message ? (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                {message}
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="space-y-6">
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                        Report Action
                      </p>
                      <h3 className="mt-1.5 whitespace-nowrap text-xl font-black">통합 리포트 생성</h3>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {analysisData?.analysis?.id ?? "none"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-[#0F141C]">
                    <p className="text-sm font-bold">경영 요약 + 실행 계획</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      총 비용, 낭비 비용, 절감 효과, 주요 비용 드라이버와 함께 실행 순서, 명령어, 롤백 가이드까지 한 번에 묶어서 생성합니다.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {!analysisData?.analysis ? (
                      <Link
                        href="/analysis/infrastructure"
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-[#0F141C]"
                      >
                        먼저 분석 실행하기
                      </Link>
                    ) : null}
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                        Report History
                      </p>
                      <h3 className="mt-1.5 text-xl font-black">생성된 리포트</h3>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {reportsData?.count ?? 0}건
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {reportsData?.reports.length ? (
                      reportsData.reports.map((report) => {
                        const active = report.id === selectedReportId;
                        return (
                          <button
                            key={report.id}
                            type="button"
                            onClick={() => selectReport(report.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              active
                                ? "border-[#1c59f2] bg-[#1c59f2]/8"
                                : "border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-[#0F141C] dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold">{templateLabel()}</p>
                              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                {formatDateTime(report.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              score {report.payload.totalScore} · saving {formatKrw(report.payload.monthlySaving)}
                            </p>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              {report.payload.topRecommendationTitles.join(" · ") || "추천 항목 없음"}
                            </p>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        아직 생성된 리포트가 없습니다.
                      </div>
                    )}
                  </div>
                </article>
              </div>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-[0.22em] text-[#1c59f2] uppercase">
                      Report Preview
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      {selectedReport ? templateLabel() : "리포트 선택"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {selectedReport
                        ? `${formatDateTime(selectedReport.createdAt)} · ${selectedReport.id}`
                        : "좌측에서 리포트를 선택하면 상세 내용을 볼 수 있습니다."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportReport}
                    disabled={!selectedReport || exporting}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:bg-[#0F141C]"
                  >
                    {exporting ? "PDF 생성 중..." : "PDF 내보내기"}
                  </button>
                </div>

                {loading ? (
                  <div className="py-24 text-center text-sm text-slate-500 dark:text-slate-400">
                    리포트 데이터를 불러오는 중입니다.
                  </div>
                ) : selectedReport && summary ? (
                  <div className="space-y-6 pt-6">
                    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-[#0F141C]">
                        <p className="text-xs text-slate-500 dark:text-slate-400">등급</p>
                        <p className="mt-2 text-2xl font-black">{summary.grade}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-[#0F141C]">
                        <p className="text-xs text-slate-500 dark:text-slate-400">총 월 비용</p>
                        <p className="mt-2 text-2xl font-black">{formatKrw(summary.totalMonthlyCost)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-[#0F141C]">
                        <p className="text-xs text-slate-500 dark:text-slate-400">낭비 비용</p>
                        <p className="mt-2 text-2xl font-black">{formatKrw(summary.wasteCost)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-[#0F141C]">
                        <p className="text-xs text-slate-500 dark:text-slate-400">예상 월 절감</p>
                        <p className="mt-2 text-2xl font-black text-emerald-500">
                          {formatKrw(summary.monthlySaving)}
                        </p>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-[#0F141C]">
                      <p className="text-xs font-bold tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                        Executive Summary
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                        {summary.executiveSummary || "분석 요약이 아직 생성되지 않았습니다."}
                      </p>
                    </section>

                    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-[#0F141C]">
                        <p className="text-xs font-bold tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                          경영 요약 핵심 권고
                        </p>
                        <div className="mt-4 space-y-3">
                          {topRecommendations.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-[#161B22]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-bold">{item.title}</p>
                                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskBadgeClass(item.riskLevel)}`}>
                                  {item.riskLevel}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                {item.targetResource}
                              </p>
                              <p className="mt-2 text-sm text-emerald-500">
                                예상 절감 {formatKrw(item.monthlySaving)}
                              </p>
                              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {item.rationale || "상세 근거가 없습니다."}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-[#0F141C]">
                        <p className="text-xs font-bold tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                          비용 드라이버
                        </p>
                        <div className="mt-4 space-y-3">
                          {topCostItems.map((item) => (
                            <div
                              key={`${item.service}-${item.usageType}`}
                              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-[#161B22]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold">{item.service}</p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {item.usageType} · {item.resourceCount} resources
                                </p>
                              </div>
                              <p className="ml-4 shrink-0 text-sm font-bold">
                                {formatKrw(item.monthlyCost)}
                              </p>
                            </div>
                          ))}
                        </div>

                        {warnings.length ? (
                          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                            {warnings.join(" / ")}
                          </div>
                        ) : null}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-[#0F141C]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                          실행 계획
                        </p>
                        <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          {executionPlan.length} steps
                        </span>
                      </div>

                      <div className="mt-4 space-y-4">
                        {executionPlan.map((item, index) => (
                          <article
                            key={item.recommendationId}
                            className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-[#161B22]"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-xs font-bold tracking-[0.18em] text-[#1c59f2] uppercase">
                                  Step {index + 1}
                                </p>
                                <h4 className="mt-2 text-base font-black">{item.title}</h4>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {item.targetResource} · risk {item.riskLevel} · saving {formatKrw(item.monthlySaving)}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskBadgeClass(item.riskLevel)}`}>
                                {item.riskLevel}
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {item.rationale || "실행 배경 설명이 없습니다."}
                            </p>

                            <div className="mt-4 grid grid-cols-1 gap-3">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-[#0F141C]">
                                <p className="text-xs font-bold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                                  Apply
                                </p>
                                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-slate-700 dark:text-slate-200">
                                  {item.commandSnippet}
                                </pre>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-[#0F141C]">
                                <p className="text-xs font-bold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                                  Rollback
                                </p>
                                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-slate-700 dark:text-slate-200">
                                  {item.rollbackSnippet}
                                </pre>
                              </div>
                            </div>
                          </article>
                        ))}
                        {!executionPlan.length ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            실행 계획이 포함된 통합 리포트를 새로 생성하면 이 영역에 실행 단계가 표시됩니다.
                          </div>
                        ) : null}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="py-24 text-center text-sm text-slate-500 dark:text-slate-400">
                    아직 표시할 리포트가 없습니다.
                  </div>
                )}
              </article>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
