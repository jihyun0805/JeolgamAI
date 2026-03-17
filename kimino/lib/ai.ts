/**
 * AI Utility Module for "너의 이름은"
 *
 * This module provides a centralized AI generation function.
 * GMS OpenAI 호환 엔드포인트를 통해 이름 추천을 생성한다.
 */

import type { NameRecommendation } from "./types";

// GMS 공식 문서는 OpenAI 호환 경로를 제공하므로 기본값도 그 규격에 맞춘다.
const GMS_API_BASE_URL =
  process.env.GMS_API_BASE_URL?.replace(/\/$/, "") ??
  "https://gms.ssafy.io/gmsapi/api.openai.com/v1";

const GMS_API_ENDPOINT = `${GMS_API_BASE_URL}/chat/completions`;

// 기존 이름(GMS_API_KEY)도 잠시 호환하고, 이후에는 GMS_KEY 사용을 기준으로 맞춘다.
const GMS_API_KEY = process.env.GMS_KEY ?? process.env.GMS_API_KEY;
const GMS_MODEL = process.env.GMS_MODEL ?? "gpt-4o-mini";
const GMS_TIMEOUT_MS = Number(process.env.GMS_TIMEOUT_MS ?? 60000);

interface AIResponse {
  recommendations: NameRecommendation[];
  summary: string;
}

/**
 * Main AI generation function using GMS API
 *
 * @param prompt - The complete prompt to send to the AI
 * @returns Promise<string> - The raw AI response
 */
export async function generateWithAI(prompt: string): Promise<string> {
  if (!GMS_API_KEY) {
    throw new Error("GMS_KEY가 설정되지 않았습니다. 환경 변수를 확인해 주세요.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GMS_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(GMS_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GMS_API_KEY}`,
      },
      body: JSON.stringify({
        model: GMS_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a Korean naming expert AI. Always respond in valid JSON format following the exact schema requested. Provide thoughtful, culturally appropriate name recommendations with meaningful explanations in Korean.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("GMS 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GMS API 오류: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item: { type?: string; text?: string }) =>
        item?.type === "text" ? item.text ?? "" : ""
      )
      .join("")
      .trim();
    if (text) {
      return text;
    }
  }

  throw new Error("GMS 응답 형식이 예상과 다릅니다. 모델 설정을 확인해 주세요.");
}

/**
 * Parse AI response to structured format with validation
 */
export function parseAIResponse(rawResponse: string): AIResponse {
  try {
    // Try to extract JSON from the response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error("Invalid response structure: missing recommendations array");
    }

    // Validate each recommendation
    const validatedRecommendations: NameRecommendation[] = parsed.recommendations.map(
      (rec: Partial<NameRecommendation>, index: number) => ({
        name: rec.name || `이름 ${index + 1}`,
        tag: rec.tag || "추천",
        reason: rec.reason || "AI가 추천한 이름입니다.",
        details: rec.details,
      })
    );

    return {
      recommendations: validatedRecommendations,
      summary: parsed.summary || "AI가 추천한 이름들입니다.",
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.error("Raw response:", rawResponse);

    // Fallback: try to extract names from text
    throw new Error(
      "AI 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요."
    );
  }
}

/**
 * Generate and parse recommendations in one call
 */
export async function generateRecommendations(
  prompt: string
): Promise<AIResponse> {
  const rawResponse = await generateWithAI(prompt);
  return parseAIResponse(rawResponse);
}
