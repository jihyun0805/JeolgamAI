"use server";

import { generateRecommendations } from "@/lib/ai";
import {
  buildSajuNamingPrompt,
  buildRenamePrompt,
  buildForeignNamePrompt,
  buildGameNamePrompt,
  buildProjectNamePrompt,
  buildTeamNamePrompt,
} from "@/lib/prompts";
import type {
  RecommendationInput,
  RecommendationResult,
  SajuNamingInput,
  RenameInput,
  ForeignNameInput,
  GameNameInput,
  ProjectNameInput,
  TeamNameInput,
} from "@/lib/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function generateNames(
  input: RecommendationInput
): Promise<{ success: true; result: RecommendationResult } | { success: false; error: string }> {
  try {
    let prompt: string;

    switch (input.type) {
      case "saju":
        prompt = buildSajuNamingPrompt(input.data as SajuNamingInput);
        break;
      case "rename":
        prompt = buildRenamePrompt(input.data as RenameInput);
        break;
      case "foreign":
        prompt = buildForeignNamePrompt(input.data as ForeignNameInput);
        break;
      case "game":
        prompt = buildGameNamePrompt(input.data as GameNameInput);
        break;
      case "project":
        prompt = buildProjectNamePrompt(input.data as ProjectNameInput);
        break;
      case "team":
        prompt = buildTeamNamePrompt(input.data as TeamNameInput);
        break;
      default:
        return { success: false, error: "지원하지 않는 추천 유형입니다." };
    }

    const aiResponse = await generateRecommendations(prompt);

    const result: RecommendationResult = {
      recommendations: aiResponse.recommendations,
      summary: aiResponse.summary,
      category: input.type,
      timestamp: Date.now(),
      id: generateId(),
    };

    return { success: true, result };
  } catch (error) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "이름 추천 중 오류가 발생했습니다.";
    return { success: false, error: message };
  }
}
