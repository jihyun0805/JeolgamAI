import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import {
  createId,
  getAnalysisById,
  getChatSession,
  getRecommendationById,
  getRecommendationsByAnalysis,
  nowIso,
  persistStore,
} from "@/lib/store";
import { ChatMessage } from "@/lib/types";

interface ChatRequestBody {
  workspaceId?: string;
  analysisId?: string;
  content?: string;
  pinnedRecommendationId?: string;
}

function buildAssistantResponse(params: {
  content: string;
  analysisId: string;
  pinnedRecommendationId?: string;
}): string {
  const recommendations = getRecommendationsByAnalysis(params.analysisId);
  const pinned = params.pinnedRecommendationId
    ? getRecommendationById(params.pinnedRecommendationId)
    : recommendations[0];

  if (!pinned) {
    return "아직 분석 결과가 없습니다. 먼저 분석을 실행해 주세요.";
  }

  const lower = params.content.toLowerCase();
  const askRollback = lower.includes("롤백") || lower.includes("rollback");
  const askCommand =
    lower.includes("명령") || lower.includes("command") || lower.includes("실행");
  const askReason = lower.includes("왜") || lower.includes("근거") || lower.includes("이유");

  if (askRollback) {
    return `권고: ${pinned.title}\n롤백 절차: ${pinned.rollbackSnippet}\n룰: ${pinned.ruleTrace.ruleId} (${pinned.ruleTrace.principleName})\n참고: ${pinned.ruleTrace.awsDocUrl}`;
  }

  if (askCommand) {
    return `권고: ${pinned.title}\n실행 명령: ${pinned.commandSnippet}\n예상 월 절감: ${pinned.estMonthlySaving.toLocaleString("ko-KR")}원\n리스크: ${pinned.riskLevel.toUpperCase()} · 신뢰도 ${(pinned.confidenceScore * 100).toFixed(0)}%\n참고: ${pinned.ruleTrace.awsDocUrl}`;
  }

  if (askReason) {
    const evidence = pinned.evidence.metrics
      .map((metric) => `${metric.key}=${metric.value}${metric.unit}`)
      .join(", ");
    return `결론: ${pinned.title}를 우선 적용하는 것이 비용 대비 효과가 큽니다.\n근거: ${pinned.description}\n메트릭: ${evidence}\n룰: ${pinned.ruleTrace.ruleId} (${pinned.ruleTrace.principleName})\n참고: ${pinned.ruleTrace.awsDocUrl}`;
  }

  return `핵심 액션: ${pinned.title}\n다음 단계: 실행 명령 검토 → 승인 여부 결정 → 실행 가이드에서 적용\n예상 절감: 월 ${pinned.estMonthlySaving.toLocaleString("ko-KR")}원`;
}

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("analysisId");

  if (!analysisId) {
    return fail("VALIDATION_ERROR", "analysisId 쿼리 파라미터가 필요합니다.", 400);
  }

  const pinnedRecommendationId = searchParams.get("pinnedRecommendationId") ?? undefined;
  const workspaceId = auth.session.workspaceId;

  const session = getChatSession(workspaceId, analysisId, pinnedRecommendationId);

  return ok({
    session,
  });
}

export async function POST(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as ChatRequestBody;

  if (!body.analysisId || !body.content) {
    return fail("VALIDATION_ERROR", "analysisId와 content는 필수입니다.", 400);
  }

  const analysis = getAnalysisById(body.analysisId);
  if (!analysis) {
    return fail("NOT_FOUND", `analysisId=${body.analysisId}를 찾을 수 없습니다.`, 404);
  }

  const session = getChatSession(
    auth.session.workspaceId,
    body.analysisId,
    body.pinnedRecommendationId,
  );

  const userMessage: ChatMessage = {
    id: createId("chat_msg_user"),
    role: "user",
    content: body.content,
    createdAt: nowIso(),
  };

  const assistantMessage: ChatMessage = {
    id: createId("chat_msg_assistant"),
    role: "assistant",
    content: buildAssistantResponse({
      content: body.content,
      analysisId: body.analysisId,
      pinnedRecommendationId: body.pinnedRecommendationId,
    }),
    createdAt: nowIso(),
  };

  session.messages.push(userMessage, assistantMessage);
  session.updatedAt = nowIso();
  persistStore();

  return ok({
    session,
    reply: assistantMessage,
  });
}
