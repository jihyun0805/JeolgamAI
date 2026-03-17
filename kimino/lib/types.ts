// Types for "너의 이름은" naming recommendation service

export type RecommendationType =
  | "saju"
  | "rename"
  | "foreign"
  | "game"
  | "project"
  | "team";

export interface NameRecommendation {
  name: string;
  tag: string;
  reason: string;
  details?: string;
}

export interface RecommendationResult {
  recommendations: NameRecommendation[];
  summary: string;
  category: RecommendationType;
  timestamp: number;
  id: string;
}

// Form Input Types

export interface SajuNamingInput {
  gender: "male" | "female" | "neutral";
  lastName: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthTime?: string;
  calendarType: "solar" | "lunar";
  vibes: string[];
  nameLength: "2" | "3";
  avoidChars?: string;
  additionalRequests?: string;
}

export interface RenameInput {
  currentName: string;
  gender: "male" | "female" | "neutral";
  ageGroup: string;
  changeReason: string;
  desiredImage: string[];
  nameLength: "2" | "3";
  pronunciationStyle: string;
  avoidChars?: string;
  additionalRequests?: string;
}

export interface ForeignNameInput {
  koreanName: string;
  gender: "male" | "female" | "neutral";
  targetLanguage: string;
  vibes: string[];
  easyPronunciation: boolean;
  localFeel: "local" | "global";
  nicknameStyle: boolean;
  additionalRequests?: string;
}

export interface GameNameInput {
  gameGenre: string;
  characterClass: string;
  gender: "male" | "female" | "neutral" | "none";
  worldSetting: string;
  personalityKeywords: string[];
  nameLength: "short" | "long";
  language: "korean" | "english" | "mixed";
  style: "cool" | "cute" | "unique" | "meme";
  forbiddenWords?: string;
  additionalRequests?: string;
}

export interface ProjectNameInput {
  description: string;
  domain: string;
  coreFeatures: string;
  targetUsers: string;
  tone: string[];
  language: "korean" | "english" | "mixed";
  nameStyle: "short" | "descriptive";
  includeKeywords?: string;
  excludeKeywords?: string;
  additionalRequests?: string;
}

export interface TeamNameInput {
  teamNature: string;
  teamGoal: string;
  teamVibe: string;
  domain: string;
  tone: string[];
  language: "korean" | "english" | "mixed";
  usage: "internal" | "external";
  includeKeywords?: string;
  excludeKeywords?: string;
  additionalRequests?: string;
}

export type RecommendationInput =
  | { type: "saju"; data: SajuNamingInput }
  | { type: "rename"; data: RenameInput }
  | { type: "foreign"; data: ForeignNameInput }
  | { type: "game"; data: GameNameInput }
  | { type: "project"; data: ProjectNameInput }
  | { type: "team"; data: TeamNameInput };

// History
export interface HistoryItem extends RecommendationResult {
  inputSummary: string;
}

// Category metadata
export interface CategoryInfo {
  id: RecommendationType;
  title: string;
  description: string;
  icon: string;
  href: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "saju",
    title: "사주 기반 작명",
    description: "생년월일과 원하는 분위기를 바탕으로 어울리는 이름을 추천해드려요",
    icon: "sparkles",
    href: "/recommend/saju",
  },
  {
    id: "rename",
    title: "개명 추천",
    description: "새로운 시작을 위한 당신만의 새 이름을 찾아보세요",
    icon: "refresh",
    href: "/recommend/rename",
  },
  {
    id: "foreign",
    title: "외국어 이름",
    description: "당신에게 어울리는 외국어 이름을 추천해드려요",
    icon: "globe",
    href: "/recommend/foreign",
  },
  {
    id: "game",
    title: "게임 캐릭터 이름",
    description: "세계관에 어울리는 멋진 캐릭터 이름을 만들어보세요",
    icon: "gamepad",
    href: "/recommend/game",
  },
  {
    id: "project",
    title: "프로젝트 이름",
    description: "당신의 프로젝트에 어울리는 브랜드 이름을 찾아보세요",
    icon: "rocket",
    href: "/recommend/project",
  },
  {
    id: "team",
    title: "팀 이름",
    description: "팀의 성격과 목표에 맞는 팀 이름을 추천해드려요",
    icon: "users",
    href: "/recommend/team",
  },
];
