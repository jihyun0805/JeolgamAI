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
import { Field, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";
import { generateNames } from "@/app/actions/generate";
import { addToHistory } from "@/lib/history";
import type { TeamNameInput, RecommendationResult } from "@/lib/types";

const toneOptions = [
  { value: "playful", label: "장난기 있는" },
  { value: "serious", label: "진지한" },
  { value: "elegant", label: "세련된" },
  { value: "cute", label: "귀여운" },
  { value: "professional", label: "전문적" },
  { value: "creative", label: "창의적" },
  { value: "energetic", label: "에너지 넘치는" },
  { value: "calm", label: "차분한" },
];

const domainOptions = [
  "IT/개발",
  "디자인",
  "마케팅",
  "기획",
  "연구",
  "영업",
  "스타트업",
  "동아리/동호회",
  "게임/e스포츠",
  "기타",
];

export default function TeamNamePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);

  // Form state
  const [teamNature, setTeamNature] = useState("");
  const [teamGoal, setTeamGoal] = useState("");
  const [teamVibe, setTeamVibe] = useState("");
  const [domain, setDomain] = useState("IT/개발");
  const [tone, setTone] = useState<string[]>([]);
  const [language, setLanguage] = useState<"korean" | "english" | "mixed">("mixed");
  const [usage, setUsage] = useState<"internal" | "external">("external");
  const [includeKeywords, setIncludeKeywords] = useState("");
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [additionalRequests, setAdditionalRequests] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamNature.trim()) {
      toast.error("팀 성격을 입력해 주세요.");
      return;
    }

    if (!teamGoal.trim()) {
      toast.error("팀 목표를 입력해 주세요.");
      return;
    }

    if (tone.length === 0) {
      toast.error("원하는 톤을 하나 이상 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    const input: TeamNameInput = {
      teamNature: teamNature.trim(),
      teamGoal: teamGoal.trim(),
      teamVibe: teamVibe.trim(),
      domain,
      tone,
      language,
      usage,
      includeKeywords: includeKeywords || undefined,
      excludeKeywords: excludeKeywords || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "team", data: input });

    setIsLoading(false);

    if (response.success) {
      setResult(response.result);
      addToHistory({
        ...response.result,
        inputSummary: `${domain} | ${tone.join(", ")} | ${usage === "internal" ? "내부용" : "대외용"}`,
      });
      toast.success("팀 이름 추천이 완료되었습니다!");
    } else {
      toast.error(response.error);
    }
  };

  const handleRegenerate = async () => {
    if (!teamNature.trim() || !teamGoal.trim() || tone.length === 0) return;

    setIsLoading(true);

    const input: TeamNameInput = {
      teamNature: teamNature.trim(),
      teamGoal: teamGoal.trim(),
      teamVibe: teamVibe.trim(),
      domain,
      tone,
      language,
      usage,
      includeKeywords: includeKeywords || undefined,
      excludeKeywords: excludeKeywords || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "team", data: input });

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
      title="팀 이름 추천"
      description="팀의 성격과 목표에 맞는 팀 이름을 추천해드려요."
      category="team"
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
          {/* Team nature */}
          <Field>
            <FieldLabel htmlFor="teamNature">팀 성격</FieldLabel>
            <Input
              id="teamNature"
              value={teamNature}
              onChange={(e) => setTeamNature(e.target.value)}
              placeholder="예: 스타트업 개발팀, 대학 동아리, 사내 TF팀"
              className="bg-background/50"
            />
          </Field>

          {/* Team goal */}
          <Field>
            <FieldLabel htmlFor="teamGoal">팀 목표</FieldLabel>
            <Textarea
              id="teamGoal"
              value={teamGoal}
              onChange={(e) => setTeamGoal(e.target.value)}
              placeholder="예: 혁신적인 제품 개발, 해커톤 우승, 사내 문화 개선"
              className="bg-background/50 min-h-[80px]"
            />
          </Field>

          {/* Team vibe */}
          <Field>
            <FieldLabel htmlFor="teamVibe">팀원 분위기</FieldLabel>
            <Input
              id="teamVibe"
              value={teamVibe}
              onChange={(e) => setTeamVibe(e.target.value)}
              placeholder="예: 열정적, 유쾌함, 전문가 집단"
              className="bg-background/50"
            />
          </Field>

          {/* Domain */}
          <Field>
            <FieldLabel>분야</FieldLabel>
            <ChipSelect
              options={domainOptions.map((d) => ({ value: d, label: d }))}
              value={[domain]}
              onChange={(v) => setDomain(v[0] || "IT/개발")}
              multiple={false}
            />
          </Field>

          {/* Tone */}
          <Field>
            <FieldLabel>원하는 톤 (복수 선택 가능)</FieldLabel>
            <ChipSelect
              options={toneOptions}
              value={tone}
              onChange={setTone}
              multiple
            />
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

          {/* Usage */}
          <Field>
            <FieldLabel>용도</FieldLabel>
            <RadioGroup
              value={usage}
              onValueChange={(v) => setUsage(v as "internal" | "external")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="internal" id="internal" />
                <Label htmlFor="internal" className="cursor-pointer">내부 팀명</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="external" id="external" />
                <Label htmlFor="external" className="cursor-pointer">대외 발표용</Label>
              </div>
            </RadioGroup>
          </Field>

          {/* Include keywords */}
          <Field>
            <FieldLabel htmlFor="includeKeywords">포함하고 싶은 키워드 (선택)</FieldLabel>
            <Input
              id="includeKeywords"
              value={includeKeywords}
              onChange={(e) => setIncludeKeywords(e.target.value)}
              placeholder="예: 혁신, 드림, 파이어"
              className="bg-background/50"
            />
          </Field>

          {/* Exclude keywords */}
          <Field>
            <FieldLabel htmlFor="excludeKeywords">피하고 싶은 키워드 (선택)</FieldLabel>
            <Input
              id="excludeKeywords"
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
              placeholder="예: 너무 흔한 단어"
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
            팀 이름 추천받기
          </Button>
        </form>
      )}
    </FormWrapper>
  );
}
