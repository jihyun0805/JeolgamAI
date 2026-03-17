"use client";

import { useState } from "react";
import { FormWrapper } from "@/components/form-wrapper";
import { ChipSelect } from "@/components/chip-select";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ResultsContainer } from "@/components/results-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";
import { generateNames } from "@/app/actions/generate";
import { addToHistory } from "@/lib/history";
import type { GameNameInput, RecommendationResult } from "@/lib/types";

const genreOptions = [
  "MMORPG",
  "FPS",
  "RPG",
  "전략 게임",
  "액션 게임",
  "스포츠 게임",
  "시뮬레이션",
  "어드벤처",
  "퍼즐",
  "모바일 게임",
];

const worldSettingOptions = [
  { value: "fantasy", label: "판타지" },
  { value: "sf", label: "SF" },
  { value: "oriental", label: "동양풍" },
  { value: "dark", label: "다크" },
  { value: "cute", label: "귀여운" },
  { value: "mythology", label: "고대신화풍" },
  { value: "modern", label: "현대" },
  { value: "medieval", label: "중세" },
];

const personalityOptions = [
  { value: "mysterious", label: "신비로운" },
  { value: "powerful", label: "강력한" },
  { value: "wise", label: "지혜로운" },
  { value: "playful", label: "장난스러운" },
  { value: "dark", label: "어두운" },
  { value: "noble", label: "고귀한" },
  { value: "brave", label: "용감한" },
  { value: "cunning", label: "교활한" },
];

const styleOptions = [
  { value: "cool", label: "간지나는" },
  { value: "cute", label: "귀여운" },
  { value: "unique", label: "유니크" },
  { value: "meme", label: "밈 느낌" },
];

export default function GameNamePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);

  // Form state
  const [gameGenre, setGameGenre] = useState("MMORPG");
  const [characterClass, setCharacterClass] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "neutral" | "none">("male");
  const [worldSetting, setWorldSetting] = useState("fantasy");
  const [personalityKeywords, setPersonalityKeywords] = useState<string[]>([]);
  const [nameLength, setNameLength] = useState<"short" | "long">("short");
  const [language, setLanguage] = useState<"korean" | "english" | "mixed">("mixed");
  const [style, setStyle] = useState<"cool" | "cute" | "unique" | "meme">("cool");
  const [forbiddenWords, setForbiddenWords] = useState("");
  const [additionalRequests, setAdditionalRequests] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!characterClass.trim()) {
      toast.error("캐릭터 종족/직업을 입력해 주세요.");
      return;
    }

    if (personalityKeywords.length === 0) {
      toast.error("캐릭터 성격을 하나 이상 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    const input: GameNameInput = {
      gameGenre,
      characterClass: characterClass.trim(),
      gender,
      worldSetting,
      personalityKeywords,
      nameLength,
      language,
      style,
      forbiddenWords: forbiddenWords || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "game", data: input });

    setIsLoading(false);

    if (response.success) {
      setResult(response.result);
      addToHistory({
        ...response.result,
        inputSummary: `${gameGenre} | ${characterClass} | ${worldSetting}`,
      });
      toast.success("캐릭터 이름 추천이 완료되었습니다!");
    } else {
      toast.error(response.error);
    }
  };

  const handleRegenerate = async () => {
    if (!characterClass.trim() || personalityKeywords.length === 0) return;

    setIsLoading(true);

    const input: GameNameInput = {
      gameGenre,
      characterClass: characterClass.trim(),
      gender,
      worldSetting,
      personalityKeywords,
      nameLength,
      language,
      style,
      forbiddenWords: forbiddenWords || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "game", data: input });

    setIsLoading(false);

    if (response.success) {
      setResult(response.result);
      toast.success("새로운 이름을 추천받았습니다!");
    } else {
      toast.error(response.error);
    }
  };

  return (
    <FormWrapper
      title="게임 캐릭터 이름"
      description="세계관에 어울리는 멋진 캐릭터 이름을 만들어보세요."
      category="game"
    >
      {result ? (
        <ResultsContainer
          result={result}
          onRegenerate={handleRegenerate}
          isRegenerating={isLoading}
        />
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Game genre */}
          <Field>
            <FieldLabel>게임 장르</FieldLabel>
            <Select value={gameGenre} onValueChange={setGameGenre}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="장르 선택" />
              </SelectTrigger>
              <SelectContent>
                {genreOptions.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Character class */}
          <Field>
            <FieldLabel htmlFor="characterClass">캐릭터 종족/직업</FieldLabel>
            <Input
              id="characterClass"
              value={characterClass}
              onChange={(e) => setCharacterClass(e.target.value)}
              placeholder="예: 엘프 마법사, 인간 전사, 드래곤 기사"
              className="bg-background/50"
            />
          </Field>

          {/* Gender */}
          <Field>
            <FieldLabel>캐릭터 성별</FieldLabel>
            <RadioGroup
              value={gender}
              onValueChange={(v) => setGender(v as "male" | "female" | "neutral" | "none")}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male" className="cursor-pointer">남성</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female" className="cursor-pointer">여성</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="neutral" id="neutral" />
                <Label htmlFor="neutral" className="cursor-pointer">중성</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="cursor-pointer">무성</Label>
              </div>
            </RadioGroup>
          </Field>

          {/* World setting */}
          <Field>
            <FieldLabel>세계관 분위기</FieldLabel>
            <ChipSelect
              options={worldSettingOptions}
              value={[worldSetting]}
              onChange={(v) => setWorldSetting(v[0] || "fantasy")}
              multiple={false}
            />
          </Field>

          {/* Personality keywords */}
          <Field>
            <FieldLabel>캐릭터 성격 (복수 선택 가능)</FieldLabel>
            <ChipSelect
              options={personalityOptions}
              value={personalityKeywords}
              onChange={setPersonalityKeywords}
              multiple
            />
          </Field>

          {/* Name length */}
          <Field>
            <FieldLabel>이름 길이</FieldLabel>
            <RadioGroup
              value={nameLength}
              onValueChange={(v) => setNameLength(v as "short" | "long")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="short" id="short" />
                <Label htmlFor="short" className="cursor-pointer">짧은 이름</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="long" id="long" />
                <Label htmlFor="long" className="cursor-pointer">긴 이름</Label>
              </div>
            </RadioGroup>
          </Field>

          {/* Language */}
          <Field>
            <FieldLabel>언어 선호</FieldLabel>
            <RadioGroup
              value={language}
              onValueChange={(v) => setLanguage(v as "korean" | "english" | "mixed")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="korean" id="korean" />
                <Label htmlFor="korean" className="cursor-pointer">한글</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="english" id="english" />
                <Label htmlFor="english" className="cursor-pointer">영어</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="mixed" id="mixed" />
                <Label htmlFor="mixed" className="cursor-pointer">혼합</Label>
              </div>
            </RadioGroup>
          </Field>

          {/* Style */}
          <Field>
            <FieldLabel>이름 스타일</FieldLabel>
            <ChipSelect
              options={styleOptions}
              value={[style]}
              onChange={(v) => setStyle((v[0] || "cool") as "cool" | "cute" | "unique" | "meme")}
              multiple={false}
            />
          </Field>

          {/* Forbidden words */}
          <Field>
            <FieldLabel htmlFor="forbiddenWords">금지어 (선택)</FieldLabel>
            <Input
              id="forbiddenWords"
              value={forbiddenWords}
              onChange={(e) => setForbiddenWords(e.target.value)}
              placeholder="피하고 싶은 단어나 표현"
              className="bg-background/50"
            />
          </Field>

          {/* Additional requests */}
          <Field>
            <FieldLabel htmlFor="additionalRequests">추가 요청사항 (선택)</FieldLabel>
            <Textarea
              id="additionalRequests"
              value={additionalRequests}
              onChange={(e) => setAdditionalRequests(e.target.value)}
              placeholder="추가로 고려해주셨으면 하는 사항을 적어주세요."
              className="bg-background/50 min-h-[100px]"
            />
          </Field>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-base bg-primary hover:bg-primary/90"
            disabled={isLoading}
          >
            캐릭터 이름 추천받기
          </Button>
        </form>
      )}
    </FormWrapper>
  );
}
