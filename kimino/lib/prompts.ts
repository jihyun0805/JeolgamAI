/**
 * Prompt Builders for "너의 이름은"
 *
 * Each function creates a specialized prompt for different naming categories.
 * The prompts are designed to generate structured JSON responses.
 */

import type {
  SajuNamingInput,
  RenameInput,
  ForeignNameInput,
  GameNameInput,
  ProjectNameInput,
  TeamNameInput,
} from "./types";

const JSON_SCHEMA_INSTRUCTION = `
응답은 반드시 다음 JSON 형식으로 작성해 주세요:
{
  "recommendations": [
    {
      "name": "추천 이름",
      "tag": "이름의 느낌을 한 단어로 (예: 부드러운, 강인한, 지적인)",
      "reason": "이 이름을 추천하는 이유 (2-3문장)",
      "details": "추가 설명이나 참고사항 (선택사항)"
    }
  ],
  "summary": "전체 추천에 대한 요약 설명 (1-2문장)"
}
`;

export function buildSajuNamingPrompt(input: SajuNamingInput): string {
  const genderText =
    input.gender === "male"
      ? "남성"
      : input.gender === "female"
      ? "여성"
      : "중성적";
  const calendarText = input.calendarType === "solar" ? "양력" : "음력";
  const nameLengthText = input.nameLength === "2" ? "2글자" : "3글자";
  const vibesText = input.vibes.join(", ");

  return `당신은 한국 작명 전문가입니다. 다음 정보를 바탕으로 어울리는 한국 이름을 10개 추천해 주세요.

## 사용자 정보
- 성별: ${genderText}
- 성씨: ${input.lastName}
- 생년월일: ${calendarText} ${input.birthYear}년 ${input.birthMonth}월 ${input.birthDay}일
${input.birthTime ? `- 출생시간: ${input.birthTime}` : ""}
- 원하는 이름 분위기: ${vibesText}
- 이름 길이: ${nameLengthText}
${input.avoidChars ? `- 피하고 싶은 글자/느낌: ${input.avoidChars}` : ""}
${input.additionalRequests ? `- 추가 요청사항: ${input.additionalRequests}` : ""}

## 요청사항
- 입력한 생년월일과 원하는 분위기를 바탕으로 AI가 이름 방향성을 제안합니다
- 각 이름은 성씨 "${input.lastName}"과 자연스럽게 어울려야 합니다
- 발음이 좋고 현대적이면서도 의미 있는 이름을 추천해 주세요
- 각 이름에 대해 어떤 이미지/의미를 담고 있는지 설명해 주세요
- 너무 흔한 이름만 반복하지 말고 다양한 스타일을 제안해 주세요
- 한자의 의미 방향성도 참고로 설명해 주세요 (실제 한자가 아닌 의미적 느낌)

${JSON_SCHEMA_INSTRUCTION}`;
}

export function buildRenamePrompt(input: RenameInput): string {
  const genderText =
    input.gender === "male"
      ? "남성"
      : input.gender === "female"
      ? "여성"
      : "중성적";
  const desiredImageText = input.desiredImage.join(", ");
  const nameLengthText = input.nameLength === "2" ? "2글자" : "3글자";

  return `당신은 한국 개명 상담 전문가입니다. 다음 정보를 바탕으로 새로운 이름을 10개 추천해 주세요.

## 현재 정보
- 현재 이름: ${input.currentName}
- 성별: ${genderText}
- 나이대: ${input.ageGroup}
- 개명하고 싶은 이유: ${input.changeReason}

## 원하는 새 이름
- 원하는 이미지/인상: ${desiredImageText}
- 이름 길이: ${nameLengthText}
- 발음 스타일: ${input.pronunciationStyle}
${input.avoidChars ? `- 피하고 싶은 글자/느낌: ${input.avoidChars}` : ""}
${input.additionalRequests ? `- 추가 요청사항: ${input.additionalRequests}` : ""}

## 요청사항
- 현재 이름 "${input.currentName}"과 비교했을 때 어떤 이미지 변화가 있는지 설명해 주세요
- 각 이름이 주는 인상과 이미지 키워드를 제시해 주세요
- 현재 이름과 완전히 다른 느낌의 이름과 약간의 연결성이 있는 이름 모두 포함해 주세요
- 실제로 사용하기 좋은 자연스러운 이름을 추천해 주세요

${JSON_SCHEMA_INSTRUCTION}`;
}

export function buildForeignNamePrompt(input: ForeignNameInput): string {
  const genderText =
    input.gender === "male"
      ? "남성"
      : input.gender === "female"
      ? "여성"
      : "중성적";
  const vibesText = input.vibes.join(", ");
  const localFeelText = input.localFeel === "local" ? "현지 느낌" : "글로벌 보편성";

  return `당신은 다국어 이름 전문가입니다. 한국 이름을 가진 사람에게 어울리는 외국어 이름을 10개 추천해 주세요.

## 사용자 정보
- 한국 이름: ${input.koreanName}
- 성별: ${genderText}
- 원하는 언어권: ${input.targetLanguage}
- 원하는 분위기: ${vibesText}
- 발음 쉬움 우선: ${input.easyPronunciation ? "예" : "아니오"}
- 선호 스타일: ${localFeelText}
- 닉네임 스타일: ${input.nicknameStyle ? "예" : "아니오"}
${input.additionalRequests ? `- 추가 요청사항: ${input.additionalRequests}` : ""}

## 요청사항
- 한국 이름 "${input.koreanName}"의 발음이나 의미와 연결될 수 있는 이름을 우선 고려해 주세요
- 각 이름의 발음 가이드를 한글로 제공해 주세요
- 해당 문화권에서 자연스럽고 적절한 이름인지 확인해 주세요
- 너무 구식이거나 문화적으로 어색한 이름은 피해 주세요
- 각 이름이 어떤 인상을 주는지 설명해 주세요

${JSON_SCHEMA_INSTRUCTION}`;
}

export function buildGameNamePrompt(input: GameNameInput): string {
  const genderText =
    input.gender === "male"
      ? "남성"
      : input.gender === "female"
      ? "여성"
      : input.gender === "neutral"
      ? "중성"
      : "무성";
  const personalityText = input.personalityKeywords.join(", ");
  const nameLengthText = input.nameLength === "short" ? "짧은" : "긴";
  const languageText =
    input.language === "korean"
      ? "한글"
      : input.language === "english"
      ? "영어"
      : "혼합";
  const styleText =
    input.style === "cool"
      ? "간지나는"
      : input.style === "cute"
      ? "귀여운"
      : input.style === "unique"
      ? "유니크한"
      : "밈 느낌";

  return `당신은 게임 캐릭터 네이밍 전문가입니다. 멋진 게임 캐릭터 이름을 15개 추천해 주세요.

## 캐릭터 정보
- 게임 장르: ${input.gameGenre}
- 캐릭터 종족/직업: ${input.characterClass}
- 성별: ${genderText}
- 세계관 분위기: ${input.worldSetting}
- 캐릭터 성격: ${personalityText}

## 이름 스타일
- 이름 길이: ${nameLengthText}
- 언어: ${languageText}
- 스타일: ${styleText}
${input.forbiddenWords ? `- 금지어: ${input.forbiddenWords}` : ""}
${input.additionalRequests ? `- 추가 요청사항: ${input.additionalRequests}` : ""}

## 요청사항
- 세계관 "${input.worldSetting}"에 잘 어울리는 이름을 추천해 주세요
- 각 이름이 캐릭터의 어떤 면을 표현하는지 설명해 주세요
- 별칭이나 이명도 함께 제안해 주세요
- 다양한 스타일의 이름을 섞어서 추천해 주세요
- 게임에서 실제로 사용하기 좋은 길이와 형태로 추천해 주세요

${JSON_SCHEMA_INSTRUCTION}`;
}

export function buildProjectNamePrompt(input: ProjectNameInput): string {
  const toneText = input.tone.join(", ");
  const languageText =
    input.language === "korean"
      ? "한글"
      : input.language === "english"
      ? "영어"
      : "혼합";
  const nameStyleText =
    input.nameStyle === "short" ? "짧고 강렬한" : "설명적인";

  return `당신은 브랜드 네이밍 전문가입니다. 프로젝트에 어울리는 이름을 15개 추천해 주세요.

## 프로젝트 정보
- 한줄 설명: ${input.description}
- 분야/도메인: ${input.domain}
- 핵심 기능: ${input.coreFeatures}
- 타겟 사용자: ${input.targetUsers}

## 이름 스타일
- 원하는 톤: ${toneText}
- 언어: ${languageText}
- 이름 스타일: ${nameStyleText}
${input.includeKeywords ? `- 포함하고 싶은 키워드: ${input.includeKeywords}` : ""}
${input.excludeKeywords ? `- 피하고 싶은 키워드: ${input.excludeKeywords}` : ""}
${input.additionalRequests ? `- 추가 요청사항: ${input.additionalRequests}` : ""}

## 요청사항
- 프로젝트의 핵심 가치를 담은 이름을 추천해 주세요
- 각 이름의 의미와 브랜드 느낌을 설명해 주세요
- 가능하다면 슬로건 한 줄도 함께 제안해 주세요
- 너무 흔한 SaaS 이름은 피하고 독창적인 이름을 포함해 주세요
- 도메인 등록 가능성을 고려해 독특한 조합도 제안해 주세요

${JSON_SCHEMA_INSTRUCTION}`;
}

export function buildTeamNamePrompt(input: TeamNameInput): string {
  const toneText = input.tone.join(", ");
  const languageText =
    input.language === "korean"
      ? "한글"
      : input.language === "english"
      ? "영어"
      : "혼합";
  const usageText = input.usage === "internal" ? "내부용" : "대외 발표용";

  return `당신은 팀 네이밍 전문가입니다. 팀에 어울리는 이름을 15개 추천해 주세요.

## 팀 정보
- 팀 성격: ${input.teamNature}
- 팀 목표: ${input.teamGoal}
- 팀원 분위기: ${input.teamVibe}
- 분야: ${input.domain}

## 이름 스타일
- 원하는 톤: ${toneText}
- 언어: ${languageText}
- 용도: ${usageText}
${input.includeKeywords ? `- 포함하고 싶은 키워드: ${input.includeKeywords}` : ""}
${input.excludeKeywords ? `- 피하고 싶은 키워드: ${input.excludeKeywords}` : ""}
${input.additionalRequests ? `- 추가 요청사항: ${input.additionalRequests}` : ""}

## 요청사항
- 팀의 성격과 목표를 잘 표현하는 이름을 추천해 주세요
- 각 이름이 팀에 어떤 이미지를 부여하는지 설명해 주세요
- ${usageText}으로 적합한지 표시해 주세요
- 캐주얼한 이름과 프로페셔널한 이름을 모두 포함해 주세요
- 팀원들이 자부심을 느낄 수 있는 이름을 추천해 주세요

${JSON_SCHEMA_INSTRUCTION}`;
}
