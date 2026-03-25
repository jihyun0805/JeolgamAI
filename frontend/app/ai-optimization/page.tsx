"use client";

import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

interface AnalysisPayload {
  analysis: {
    id: string;
    score: {
      totalScore: number;
      grade: string;
    };
    executiveSummary?: string | null;
  } | null;
}

interface RecommendationSummary {
  id: string;
  title: string;
  description: string;
  targetResource: string;
  confidenceScore: number;
  riskLevel: string;
  estMonthlySaving: number;
  rationale?: string | null;
}

interface RecommendationListPayload {
  analysisId: string | null;
  recommendations: RecommendationSummary[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatSessionPayload {
  session: {
    id: string;
    messages: ChatMessage[];
  };
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

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="m22 2-11 11" />
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3.5 dark:bg-[#131820]">
        <span
          className="h-2 w-2 rounded-full bg-slate-400 animate-bounce dark:bg-slate-500"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-slate-400 animate-bounce dark:bg-slate-500"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-slate-400 animate-bounce dark:bg-slate-500"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

export default function AiOptimizationPage() {
  const [analysisId, setAnalysisId] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [scoreLabel, setScoreLabel] = useState("");
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, submitting]);

  async function loadWorkspaceOptimization() {
    setLoading(true);
    setError("");
    try {
      const [analysisResponse, recommendationsResponse] = await Promise.all([
        authFetch("/api/analysis/latest", { cache: "no-store" }),
        authFetch("/api/recommendations", { cache: "no-store" }),
      ]);
      const [analysisPayload, recommendationsPayload] = await Promise.all([
        analysisResponse.json(),
        recommendationsResponse.json(),
      ]);
      if (!analysisResponse.ok || !analysisPayload?.ok || !analysisPayload?.data) {
        throw new Error(analysisPayload?.error?.message ?? "분석 결과를 불러오지 못했습니다.");
      }
      if (!recommendationsResponse.ok || !recommendationsPayload?.ok || !recommendationsPayload?.data) {
        throw new Error(recommendationsPayload?.error?.message ?? "권고 목록을 불러오지 못했습니다.");
      }

      const analysisData = analysisPayload.data as AnalysisPayload;
      const recommendationData = recommendationsPayload.data as RecommendationListPayload;
      const nextAnalysisId = recommendationData.analysisId ?? analysisData.analysis?.id ?? "";

      setAnalysisId(nextAnalysisId);
      setRecommendations(recommendationData.recommendations ?? []);
      if (analysisData.analysis) {
        setScoreLabel(
          `${analysisData.analysis.score.totalScore}점 · ${analysisData.analysis.score.grade}`,
        );
        setAnalysisSummary(analysisData.analysis.executiveSummary ?? "");
        setSummaryExpanded(false);
      } else {
        setScoreLabel("");
        setAnalysisSummary("");
        setSummaryExpanded(false);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadChat(nextAnalysisId: string) {
    if (!nextAnalysisId) return;

    const params = new URLSearchParams({ analysisId: nextAnalysisId });

    const response = await authFetch(`/api/chat?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload?.ok || !payload?.data) {
      throw new Error(payload?.error?.message ?? "대화 세션을 불러오지 못했습니다.");
    }

    setMessages((payload.data as ChatSessionPayload).session.messages ?? []);
  }

  useEffect(() => {
    loadWorkspaceOptimization().catch(() => {});
  }, []);

  useEffect(() => {
    function handleWorkspaceChanged() {
      setMessages([]);
      setAnalysisId("");
      loadWorkspaceOptimization().catch(() => {});
    }

    window.addEventListener("app:workspace:changed", handleWorkspaceChanged);
    return () => {
      window.removeEventListener("app:workspace:changed", handleWorkspaceChanged);
    };
  }, []);

  useEffect(() => {
    if (!analysisId) return;
    loadChat(analysisId).catch((chatError) => {
      setError(chatError instanceof Error ? chatError.message : String(chatError));
    });
  }, [analysisId]);

  function adjustTextareaHeight() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }

  async function submitPrompt() {
    if (!analysisId || !prompt.trim() || submitting) return;

    const text = prompt.trim();
    const optimisticId = `opt-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user", content: text, createdAt: new Date().toISOString() },
    ]);
    setPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setSubmitting(true);
    setError("");

    try {
      const response = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          content: text,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? "질문 전송에 실패했습니다.");
      }

      setMessages((payload.data as ChatSessionPayload).session.messages ?? []);
    } catch (sendError) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError(sendError instanceof Error ? sendError.message : String(sendError));
    } finally {
      setSubmitting(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitPrompt();
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitPrompt().catch(() => {});
  }

  const [scorePart, gradePart] = scoreLabel.split("·").map((s) => s.trim());
  const primaryRecommendation = recommendations[0];
  const totalPotentialSaving = recommendations.reduce(
    (sum, recommendation) => sum + recommendation.estMonthlySaving,
    0,
  );
  const starterPrompts = recommendations.length
    ? [
        "지금 가장 먼저 처리할 권고가 뭐야?",
        "전체 권고를 위험도와 절감 효과 기준으로 정리해줘",
        "이번 분석 기준 실행 순서를 짜줘",
      ]
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="chat" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="AI 최적화"
          description="권고를 선택하고 근거, 리스크, 실행 방법을 AI에게 질문하세요."
        />

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden p-4 md:p-6">
          <section className="grid shrink-0 gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.4fr)]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.24em] text-[#2a6ef5] uppercase">
                    최적화 점수
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-5xl font-black tracking-tight text-slate-950 dark:text-white">
                      {loading ? "…" : scorePart || "—"}
                    </span>
                    {gradePart ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {gradePart}
                      </span>
                    ) : null}
                  </div>
                </div>
                {primaryRecommendation ? (
                  <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-slate-700 dark:bg-[#131820] md:block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      대표 권고
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {primaryRecommendation.title}
                    </p>
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                      예상 절감 {formatKrw(primaryRecommendation.estMonthlySaving)}
                    </p>
                  </div>
                ) : null}
              </div>
              {analysisSummary ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-[#131820]">
                  <p
                    className={`text-sm leading-7 break-words text-slate-600 dark:text-slate-300 ${
                      summaryExpanded ? "" : "line-clamp-3"
                    }`}
                  >
                    {analysisSummary}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSummaryExpanded((prev) => !prev)}
                    className="mt-2 text-xs font-semibold text-[#2a6ef5] hover:text-[#1f5de6] dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    {summaryExpanded ? "접기" : "더보기"}
                  </button>
                </div>
              ) : null}
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
              <p className="text-[10px] font-bold tracking-[0.24em] text-[#2a6ef5] uppercase">
                Recommendation Brief
              </p>
              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                    {primaryRecommendation
                      ? `${primaryRecommendation.title}부터 검토하는 편이 현재 흐름에 맞습니다.`
                      : "현재 분석 전체를 기준으로 질문을 이어가세요."}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                    {primaryRecommendation
                      ? `${primaryRecommendation.description} 이 페이지에서는 개별 권고를 고정하지 않고, 현재 분석에 포함된 전체 권고를 바탕으로 근거와 실행 순서를 함께 설명합니다.`
                      : "권고가 없어도 현재 분석 결과를 기준으로 우선순위와 리스크, 다음 액션을 질문할 수 있습니다."}
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 dark:border-slate-700 dark:bg-[#131820]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      현재 권고 수
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {recommendations.length}건
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 dark:border-slate-700 dark:bg-[#131820]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      잠재 절감 합계
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                      {formatKrw(totalPotentialSaving)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
              <div className="shrink-0 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">전체 권고 대화</h3>
                    <p className="mt-1 truncate text-sm text-slate-400 dark:text-slate-500">
                      {recommendations.length
                        ? `현재 분석에 연결된 권고 ${recommendations.length}건을 기준으로 질문합니다.`
                        : "현재 분석 결과를 기준으로 질문하세요."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {primaryRecommendation ? (
                      <>
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${riskBadgeClass(
                            primaryRecommendation.riskLevel,
                          )}`}
                        >
                          {primaryRecommendation.riskLevel}
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          최대 단일 절감 {formatKrw(primaryRecommendation.estMonthlySaving)}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {error ? (
                  <div className="mx-auto mb-4 max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                    {error}
                  </div>
                ) : null}

                {!loading && messages.length === 0 && !submitting ? (
                  <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#131820]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-8 w-8 text-slate-400"
                        aria-hidden
                      >
                        <path d="m12 3 1.6 3.8L17.5 8l-3.8 1.6L12 13.5 10.3 9.6 6.5 8l3.9-1.2L12 3Z" />
                        <path d="m18.5 13 1 2.3 2.5.7-2.5 1-1 2.3-1-2.3-2.5-1 2.5-.7 1-2.3Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        전체 권고안을 바로 질문해보세요
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        근거, 리스크, 우선순위, 적용 순서까지 현재 분석에 포함된 모든 권고를 기준으로 이어서 설명합니다.
                      </p>
                    </div>
                    {starterPrompts.length ? (
                      <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2.5">
                        {starterPrompts.map((starter) => (
                          <button
                            key={starter}
                            type="button"
                            onClick={() => {
                              setPrompt(starter);
                              requestAnimationFrame(() => {
                                textareaRef.current?.focus();
                                adjustTextareaHeight();
                              });
                            }}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#2a6ef5]/30 hover:text-[#2a6ef5] dark:border-slate-700 dark:bg-[#131820] dark:text-slate-300 dark:hover:border-[#2a6ef5]/40 dark:hover:text-blue-300"
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-5">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[72%] rounded-[22px] px-4 py-3.5 text-sm leading-7 shadow-sm ${
                            message.role === "user"
                              ? "rounded-br-md bg-[#2a6ef5] text-white"
                              : "rounded-bl-md border border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-[#131820] dark:text-slate-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {submitting ? <TypingIndicator /> : null}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              <form
                className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800"
                onSubmit={sendMessage}
              >
                <div
                  className={`flex items-end gap-3 rounded-[22px] border bg-slate-50 px-4 py-3 transition dark:bg-[#131820] ${
                    submitting
                      ? "border-slate-200 dark:border-slate-700"
                      : "border-slate-200 focus-within:border-[#2a6ef5] focus-within:bg-white dark:border-slate-700 dark:focus-within:border-[#2a6ef5] dark:focus-within:bg-[#151b24]"
                  }`}
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                    style={{ maxHeight: "120px", overflowY: "auto" }}
                    placeholder="권고에 대해 질문하세요…"
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onKeyDown={handlePromptKeyDown}
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !prompt.trim() || !analysisId}
                    className="shrink-0 rounded-2xl bg-[#2a6ef5] p-3 text-white transition hover:bg-[#2262f0] disabled:opacity-40"
                    aria-label="전송"
                  >
                    <SendIcon />
                  </button>
                </div>
                <p className="mt-2 px-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Enter 전송 · Shift+Enter 줄바꿈
                </p>
              </form>
            </section>

            <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto">
              <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.24em] text-[#2a6ef5] uppercase">
                      Recommendation Canvas
                    </p>
                    <h3 className="mt-2 text-lg font-bold">전체 권고안</h3>
                  </div>
                  <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {recommendations.length}건
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {loading ? (
                    [1, 2, 3].map((item) => (
                      <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    ))
                  ) : recommendations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      현재 분석에 연결된 권고가 없습니다.
                    </div>
                  ) : (
                    recommendations.map((rec, index) => (
                      <div
                        key={rec.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-[#131820]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-slate-700">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                                {rec.title}
                              </p>
                              <span
                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${riskBadgeClass(
                                  rec.riskLevel,
                                )}`}
                              >
                                {rec.riskLevel}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {rec.description}
                            </p>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                                {rec.targetResource}
                              </span>
                              <span className="shrink-0 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                ↓ {formatKrw(rec.estMonthlySaving)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
                <p className="text-[10px] font-bold tracking-[0.24em] text-[#2a6ef5] uppercase">
                  Prompt Starters
                </p>
                <h3 className="mt-2 text-lg font-bold">질문 시작점</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  개별 권고를 고르지 않아도, 전체 권고안 기준으로 우선순위와 실행 방향을 질문할 수 있습니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {starterPrompts.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => {
                        setPrompt(starter);
                        requestAnimationFrame(() => {
                          textareaRef.current?.focus();
                          adjustTextareaHeight();
                        });
                      }}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#2a6ef5]/30 hover:text-[#2a6ef5] dark:border-slate-700 dark:bg-[#131820] dark:text-slate-300 dark:hover:border-[#2a6ef5]/40 dark:hover:text-blue-300"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </article>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
