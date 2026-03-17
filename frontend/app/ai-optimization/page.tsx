"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

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

interface ChatSessionPayload {
  session: {
    id: string;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      createdAt: string;
    }>;
  };
}

function formatKrw(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export default function AiOptimizationPage() {
  const [analysisId, setAnalysisId] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationSummary[]>([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState("");
  const [messages, setMessages] = useState<ChatSessionPayload["session"]["messages"]>([]);
  const [scoreLabel, setScoreLabel] = useState("");
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadWorkspaceOptimization() {
    setLoading(true);
    setError("");
    try {
      const [analysisResponse, recommendationsResponse] = await Promise.all([
        fetch("/api/analysis/latest", { cache: "no-store" }),
        fetch("/api/recommendations", { cache: "no-store" }),
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
          recommendationData.recommendations.some((recommendation) => recommendation.id === current)
            ? current
            : recommendationData.recommendations[0]?.id || "",
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

    const response = await fetch(`/api/chat?${params.toString()}`, { cache: "no-store" });
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

  async function submitPrompt() {
    if (!analysisId || !prompt.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisId,
          content: prompt,
          pinnedRecommendationId: selectedRecommendationId || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? "질문 전송에 실패했습니다.");
      }

      setMessages((payload.data as ChatSessionPayload).session.messages ?? []);
      setPrompt("");
    } catch (sendError) {
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
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    if (event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    submitPrompt().catch(() => {});
  }

  const selectedRecommendation =
    recommendations.find((recommendation) => recommendation.id === selectedRecommendationId) ??
    recommendations[0];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7ff] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="chat" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="AI 최적화"
          description="현재 active project의 권고를 바탕으로 근거, 리스크, 실행 순서를 질의합니다."
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-6">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                <p className="text-xs font-bold tracking-[0.24em] text-[#1c59f2] uppercase">
                  Analysis
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  {loading ? "분석 결과 로딩 중" : scoreLabel || "분석 없음"}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {analysisSummary || "프로젝트별 분석과 권고만 조회합니다."}
                </p>
              </article>

              {error ? (
                <article className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </article>
              ) : null}

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">권고 목록</h3>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    프로젝트 스코프
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {recommendations.map((recommendation) => (
                    <button
                      key={recommendation.id}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        recommendation.id === selectedRecommendationId
                          ? "border-[#1c59f2] bg-[#1c59f2]/5"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                      }`}
                      onClick={() => setSelectedRecommendationId(recommendation.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{recommendation.title}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {recommendation.rationale ?? recommendation.description}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                          {recommendation.riskLevel}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-emerald-600 dark:text-emerald-300">
                          예상 절감 {formatKrw(recommendation.estMonthlySaving)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          신뢰도 {(recommendation.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section className="flex min-h-[640px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <h3 className="text-lg font-bold">권고 대화</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedRecommendation
                    ? `${selectedRecommendation.title} · ${selectedRecommendation.targetResource}`
                    : "권고를 선택해 질문하세요."}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "assistant"
                        ? "bg-slate-100 text-slate-800 dark:bg-[#0B0E14] dark:text-slate-100"
                        : "ml-auto bg-[#1c59f2] text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                ))}
                {!loading && messages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    아직 대화가 없습니다. 권고를 선택하고 질문을 입력하세요.
                  </div>
                ) : null}
              </div>

              <form
                className="border-t border-slate-200 px-6 py-5 dark:border-slate-800"
                onSubmit={sendMessage}
              >
                <textarea
                  className="h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#1c59f2] dark:border-slate-700 dark:bg-[#0B0E14]"
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="예: 이 권고의 근거와 롤백 절차를 설명해줘"
                  value={prompt}
                />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    현재 프로젝트와 선택한 권고만 질의 대상입니다. Enter 전송, Shift+Enter 줄바꿈
                  </p>
                  <button
                    className="rounded-lg bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#194fd8] disabled:opacity-60"
                    disabled={submitting || !prompt.trim() || !analysisId}
                    type="submit"
                  >
                    {submitting ? "전송 중..." : "질문 보내기"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
