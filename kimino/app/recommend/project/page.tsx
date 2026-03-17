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
import type { ProjectNameInput, RecommendationResult } from "@/lib/types";

const toneOptions = [
  { value: "professional", label: "전문적" },
  { value: "innovative", label: "혁신적" },
  { value: "friendly", label: "친근한" },
  { value: "emotional", label: "감성적" },
  { value: "global", label: "글로벌" },
  { value: "playful", label: "재미있는" },
  { value: "minimalist", label: "미니멀" },
  { value: "luxury", label: "프리미엄" },
];

const domainOptions = [
  "IT/소프트웨어",
  "이커머스",
  "핀테크",
  "헬스케어",
  "교육",
  "엔터테인먼트",
  "소셜미디어",
  "생산성",
  "라이프스타일",
  "기타",
];

export default function ProjectNamePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);

  // Form state
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("IT/소프트웨어");
  const [coreFeatures, setCoreFeatures] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [tone, setTone] = useState<string[]>([]);
  const [language, setLanguage] = useState<"korean" | "english" | "mixed">("english");
  const [nameStyle, setNameStyle] = useState<"short" | "descriptive">("short");
  const [includeKeywords, setIncludeKeywords] = useState("");
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [additionalRequests, setAdditionalRequests] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("프로젝트 설명을 입력해 주세요.");
      return;
    }

    if (!coreFeatures.trim()) {
      toast.error("핵심 기능을 입력해 주세요.");
      return;
    }

    if (tone.length === 0) {
      toast.error("원하는 톤을 하나 이상 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    const input: ProjectNameInput = {
      description: description.trim(),
      domain,
      coreFeatures: coreFeatures.trim(),
      targetUsers: targetUsers.trim(),
      tone,
      language,
      nameStyle,
      includeKeywords: includeKeywords || undefined,
      excludeKeywords: excludeKeywords || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "project", data: input });

    setIsLoading(false);

    if (response.success) {
      setResult(response.result);
      addToHistory({
        ...response.result,
        inputSummary: `${domain} | ${tone.join(", ")} | ${language}`,
      });
      toast.success("프로젝트 이름 추천이 완료되었습니다!");
    } else {
      toast.error(response.error);
    }
  };

  const handleRegenerate = async () => {
    if (!description.trim() || !coreFeatures.trim() || tone.length === 0) return;

    setIsLoading(true);

    const input: ProjectNameInput = {
      description: description.trim(),
      domain,
      coreFeatures: coreFeatures.trim(),
      targetUsers: targetUsers.trim(),
      tone,
      language,
      nameStyle,
      includeKeywords: includeKeywords || undefined,
      excludeKeywords: excludeKeywords || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "project", data: input });

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
      title="프로젝트 이름 추천"
      description="당신의 프로젝트에 어울리는 브랜드 이름을 찾아보세요."
      category="project"
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
          {/* Description */}
          <Field>
            <FieldLabel htmlFor="description">프로젝트 한줄 설명</FieldLabel>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: AI 기반 일정 관리 앱"
              className="bg-background/50"
            />
          </Field>

          {/* Domain */}
          <Field>
            <FieldLabel>분야/도메인</FieldLabel>
            <ChipSelect
              options={domainOptions.map((d) => ({ value: d, label: d }))}
              value={[domain]}
              onChange={(v) => setDomain(v[0] || "IT/소프트웨어")}
              multiple={false}
            />
          </Field>

          {/* Core features */}
          <Field>
            <FieldLabel htmlFor="coreFeatures">핵심 기능</FieldLabel>
            <Textarea
              id="coreFeatures"
              value={coreFeatures}
              onChange={(e) => setCoreFeatures(e.target.value)}
              placeholder="예: 스마트 일정 추천, 팀 협업, 리마인더"
              className="bg-background/50 min-h-[80px]"
            />
          </Field>

          {/* Target users */}
          <Field>
            <FieldLabel htmlFor="targetUsers">타겟 사용자</FieldLabel>
            <Input
              id="targetUsers"
              value={targetUsers}
              onChange={(e) => setTargetUsers(e.target.value)}
              placeholder="예: 바쁜 직장인, 스타트업 팀"
              className="bg-background/50"
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

          {/* Name style */}
          <Field>
            <FieldLabel>이름 스타일</FieldLabel>
            <RadioGroup
              value={nameStyle}
              onValueChange={(v) => setNameStyle(v as "short" | "descriptive")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="short" id="short" />
                <Label htmlFor="short" className="cursor-pointer">짧고 강렬한</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="descriptive" id="descriptive" />
                <Label htmlFor="descriptive" className="cursor-pointer">설명적인</Label>
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
              placeholder="예: AI, 스마트, 플로우"
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
              placeholder="예: 너무 흔한 단어, 특정 브랜드명"
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
            프로젝트 이름 추천받기
          </Button>
        </form>
      )}
    </FormWrapper>
  );
}
