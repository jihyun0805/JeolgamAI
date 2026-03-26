"use client";

import Image from "next/image";
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
  const [selectedRecommendationId, setSelectedRecommendationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [scoreLabel, setScoreLabel] = useState("");
  const [analysisSummary, setAnalysisSummary] = useState("");
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
      setSelectedRecommendationId(
        (current) =>
          recommendationData.recommendations.some((r) => r.id === current)
            ? current
            : recommendationData.recommendations[0]?.id ?? "",
      );
      if (analysisData.analysis) {
        setScoreLabel(
          `${analysisData.analysis.score.totalScore}점 · ${analysisData.analysis.score.grade}`,
        );
        setAnalysisSummary(analysisData.analysis.executiveSummary ?? "");
      } else {
        setScoreLabel("");
        setAnalysisSummary("");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadChat(nextAnalysisId: string, recommendationId?: string) {
    if (!nextAnalysisId) return;

    const params = new URLSearchParams({ analysisId: nextAnalysisId });
    if (recommendationId) {
      params.set("pinnedRecommendationId", recommendationId);
    }

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
    if (!analysisId) return;
    loadChat(analysisId, selectedRecommendationId).catch((chatError) => {
      setError(chatError instanceof Error ? chatError.message : String(chatError));
    });
  }, [analysisId, selectedRecommendationId]);

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
          pinnedRecommendationId: selectedRecommendationId || undefined,
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

  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const REC_LIMIT = 3;
  const [scorePart, gradePart] = scoreLabel.split("·").map((s) => s.trim());
  const selectedRecommendation =
    recommendations.find((r) => r.id === selectedRecommendationId) ?? recommendations[0];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="chat" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="AI 최적화"
          description="권고를 선택하고 근거, 리스크, 실행 방법을 AI에게 질문하세요."
        />

        <div className="flex min-h-0 flex-1 gap-5 overflow-hidden p-4 md:p-6">
          {/* Left panel */}
          <aside className="flex w-72 shrink-0 flex-col gap-4 xl:w-80">
            {/* Analysis score */}
            <article className="shrink-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
              <p className="text-[10px] font-bold tracking-[0.24em] text-brand uppercase">
                Analysis Score
              </p>
              <div className="mt-2 flex items-center gap-2.5">
                <span className="text-4xl font-black tracking-tight">
                  {loading ? "…" : scorePart || "—"}
                </span>
                {gradePart ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {gradePart}
                  </span>
                ) : null}
              </div>
              {analysisSummary ? (
                <div className="mt-2">
                  <p className={`text-xs leading-relaxed text-slate-500 dark:text-slate-400 ${summaryExpanded ? "" : "line-clamp-2"}`}>
                    {analysisSummary}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSummaryExpanded((v) => !v)}
                    className="mt-1 text-[10px] font-semibold text-brand hover:underline"
                  >
                    {summaryExpanded ? "접기" : "더보기"}
                  </button>
                </div>
              ) : null}
            </article>

            {/* Recommendations */}
            <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
              <div className="shrink-0 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
                <h3 className="text-sm font-bold">권고 목록</h3>
              </div>
              <div className="space-y-1.5 p-2.5">
                {loading ? (
                  <div className="space-y-1.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                  </div>
                ) : recommendations.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">권고 없음</p>
                ) : (
                  <>
                    {recommendations.slice(0, REC_LIMIT).map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setSelectedRecommendationId(rec.id)}
                        className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                          rec.id === selectedRecommendationId
                            ? "border-brand/30 bg-brand/6 dark:bg-brand/8"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${riskBadgeClass(rec.riskLevel)}`}
                          >
                            {rec.riskLevel}
                          </span>
                          <p className="text-sm font-semibold leading-snug">{rec.title}</p>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2 pl-0.5">
                          <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {rec.targetResource}
                          </span>
                          <span className="shrink-0 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            ↓ {formatKrw(rec.estMonthlySaving)}
                          </span>
                        </div>
                      </button>
                    ))}
                    {recommendations.length > REC_LIMIT && (
                      <div className="w-full rounded-xl border border-dashed border-slate-200 py-2 text-center text-xs font-semibold text-slate-400 dark:border-slate-700">
                        +{recommendations.length - REC_LIMIT}개 더보기
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>

            {/* Jeolnyangi mascot */}
            <div className="relative mt-auto shrink-0 h-48 px-1">
              <div className="absolute top-0 -left-1 max-w-[58%] rounded-2xl rounded-br-none border border-brand/25 bg-brand/8 px-2 py-2.5 text-xs leading-relaxed text-slate-600 dark:bg-brand/10 dark:text-slate-300">
                권고를 선택하면 AI가 근거와<br />실행 방법을 상세히 알려드려요!
              </div>
              <Image
                src="/jeolnyangi.png"
                alt="절냥이"
                width={170}
                height={170}
                className="absolute -bottom-[13px] right-0 drop-shadow-sm"
              />
            </div>
          </aside>

          {/* Chat panel */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
            {/* Chat header */}
            <div className="shrink-0 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="font-bold">권고 대화</h3>
              <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                {selectedRecommendation
                  ? `${selectedRecommendation.title} · ${selectedRecommendation.targetResource}`
                  : "왼쪽에서 권고를 선택하세요."}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {error ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              {!loading && messages.length === 0 && !submitting ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#131820]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-7 w-7 text-slate-400"
                      aria-hidden
                    >
                      <path d="m12 3 1.6 3.8L17.5 8l-3.8 1.6L12 13.5 10.3 9.6 6.5 8l3.9-1.2L12 3Z" />
                      <path d="m18.5 13 1 2.3 2.5.7-2.5 1-1 2.3-1-2.3-2.5-1 2.5-.7 1-2.3Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">질문을 입력해보세요</p>
                    <p className="mt-1 text-sm text-slate-400">
                      선택한 권고의 근거, 리스크, 실행 방법을 물어보세요.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "rounded-br-sm bg-brand text-white"
                            : "rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-[#131820] dark:text-slate-100"
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

            {/* Input */}
            <form
              className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800"
              onSubmit={sendMessage}
            >
              <div
                className={`flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 transition dark:bg-[#131820] ${
                  submitting
                    ? "border-slate-200 dark:border-slate-700"
                    : "border-slate-200 focus-within:border-brand focus-within:bg-white dark:border-slate-700 dark:focus-within:border-brand dark:focus-within:bg-[#151b24]"
                }`}
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm leading-normal text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
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
                  className="shrink-0 rounded-xl bg-brand p-2.5 text-white transition hover:bg-brand-hover disabled:opacity-40"
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
        </div>
      </main>
    </div>
  );
}
