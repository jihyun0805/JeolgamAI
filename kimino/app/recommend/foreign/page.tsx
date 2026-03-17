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
import { Switch } from "@/components/ui/switch";
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
import type { ForeignNameInput, RecommendationResult } from "@/lib/types";

const vibeOptions = [
  { value: "elegant", label: "세련된" },
  { value: "cute", label: "귀여운" },
  { value: "classic", label: "클래식" },
  { value: "neutral", label: "중성적" },
  { value: "professional", label: "전문적인" },
  { value: "artistic", label: "예술적인" },
];

const languageOptions = [
  { value: "english", label: "영어" },
  { value: "japanese", label: "일본어" },
  { value: "french", label: "프랑스어" },
  { value: "spanish", label: "스페인어" },
  { value: "german", label: "독일어" },
  { value: "italian", label: "이탈리아어" },
  { value: "chinese", label: "중국어" },
];

export default function ForeignNamePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);

  // Form state
  const [koreanName, setKoreanName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "neutral">("male");
  const [targetLanguage, setTargetLanguage] = useState("english");
  const [customLanguage, setCustomLanguage] = useState("");
  const [vibes, setVibes] = useState<string[]>([]);
  const [easyPronunciation, setEasyPronunciation] = useState(true);
  const [localFeel, setLocalFeel] = useState<"local" | "global">("global");
  const [nicknameStyle, setNicknameStyle] = useState(false);
  const [additionalRequests, setAdditionalRequests] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!koreanName.trim()) {
      toast.error("한국 이름을 입력해 주세요.");
      return;
    }

    if (vibes.length === 0) {
      toast.error("원하는 분위기를 하나 이상 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    const input: ForeignNameInput = {
      koreanName: koreanName.trim(),
      gender,
      targetLanguage: targetLanguage === "other" ? customLanguage : targetLanguage,
      vibes,
      easyPronunciation,
      localFeel,
      nicknameStyle,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "foreign", data: input });

    setIsLoading(false);

    if (response.success) {
      setResult(response.result);
      addToHistory({
        ...response.result,
        inputSummary: `${koreanName} -> ${targetLanguage === "other" ? customLanguage : targetLanguage} | ${vibes.join(", ")}`,
      });
      toast.success("외국어 이름 추천이 완료되었습니다!");
    } else {
      toast.error(response.error);
    }
  };

  const handleRegenerate = async () => {
    if (!koreanName.trim() || vibes.length === 0) return;

    setIsLoading(true);

    const input: ForeignNameInput = {
      koreanName: koreanName.trim(),
      gender,
      targetLanguage: targetLanguage === "other" ? customLanguage : targetLanguage,
      vibes,
      easyPronunciation,
      localFeel,
      nicknameStyle,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "foreign", data: input });

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
      title="외국어 이름 추천"
      description="당신에게 어울리는 외국어 이름을 추천해드려요."
      category="foreign"
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
          {/* Korean name */}
          <Field>
            <FieldLabel htmlFor="koreanName">한국 이름</FieldLabel>
            <Input
              id="koreanName"
              value={koreanName}
              onChange={(e) => setKoreanName(e.target.value)}
              placeholder="예: 김민지"
              className="bg-background/50"
            />
          </Field>

          {/* Gender */}
          <Field>
            <FieldLabel>성별</FieldLabel>
            <RadioGroup
              value={gender}
              onValueChange={(v) => setGender(v as "male" | "female" | "neutral")}
              className="flex gap-4"
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
                <Label htmlFor="neutral" className="cursor-pointer">중성적</Label>
              </div>
            </RadioGroup>
          </Field>

          {/* Target language */}
          <Field>
            <FieldLabel>원하는 언어권</FieldLabel>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="언어 선택" />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
                <SelectItem value="other">직접 입력</SelectItem>
              </SelectContent>
            </Select>
            {targetLanguage === "other" && (
              <Input
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                placeholder="언어를 입력해주세요"
                className="bg-background/50 mt-2"
              />
            )}
          </Field>

          {/* Vibes */}
          <Field>
            <FieldLabel>원하는 분위기 (복수 선택 가능)</FieldLabel>
            <ChipSelect
              options={vibeOptions}
              value={vibes}
              onChange={setVibes}
              multiple
            />
          </Field>

          {/* Easy pronunciation */}
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="easyPronunciation" className="mb-0">
                발음 쉬움 우선
              </FieldLabel>
              <Switch
                id="easyPronunciation"
                checked={easyPronunciation}
                onCheckedChange={setEasyPronunciation}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              한국인이 발음하기 쉬운 이름을 우선적으로 추천합니다.
            </p>
          </Field>

          {/* Local feel */}
          <Field>
            <FieldLabel>스타일 선호</FieldLabel>
            <RadioGroup
              value={localFeel}
              onValueChange={(v) => setLocalFeel(v as "local" | "global")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="local" id="local" />
                <Label htmlFor="local" className="cursor-pointer">현지 느낌</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="global" id="global" />
                <Label htmlFor="global" className="cursor-pointer">글로벌 보편성</Label>
              </div>
            </RadioGroup>
          </Field>

          {/* Nickname style */}
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="nicknameStyle" className="mb-0">
                닉네임 스타일 포함
              </FieldLabel>
              <Switch
                id="nicknameStyle"
                checked={nicknameStyle}
                onCheckedChange={setNicknameStyle}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              정식 이름 외에 캐주얼한 닉네임 스타일도 추천합니다.
            </p>
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
            외국어 이름 추천받기
          </Button>
        </form>
      )}
    </FormWrapper>
  );
}
