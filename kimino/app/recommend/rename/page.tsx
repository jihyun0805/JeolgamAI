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
import type { RenameInput, RecommendationResult } from "@/lib/types";

const imageOptions = [
  { value: "professional", label: "전문적인" },
  { value: "friendly", label: "친근한" },
  { value: "charismatic", label: "카리스마" },
  { value: "gentle", label: "부드러운" },
  { value: "intellectual", label: "지적인" },
  { value: "creative", label: "창의적인" },
  { value: "trustworthy", label: "신뢰감있는" },
  { value: "modern", label: "현대적인" },
];

const pronunciationOptions = [
  { value: "soft", label: "부드러운 발음" },
  { value: "clear", label: "또렷한 발음" },
  { value: "rare", label: "희귀한 느낌" },
  { value: "common", label: "대중적인 느낌" },
];

const ageGroups = [
  "10대",
  "20대",
  "30대",
  "40대",
  "50대 이상",
];

export default function RenamePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);

  // Form state
  const [currentName, setCurrentName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "neutral">("male");
  const [ageGroup, setAgeGroup] = useState("20대");
  const [changeReason, setChangeReason] = useState("");
  const [desiredImage, setDesiredImage] = useState<string[]>([]);
  const [nameLength, setNameLength] = useState<"2" | "3">("2");
  const [pronunciationStyle, setPronunciationStyle] = useState("soft");
  const [avoidChars, setAvoidChars] = useState("");
  const [additionalRequests, setAdditionalRequests] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentName.trim()) {
      toast.error("현재 이름을 입력해 주세요.");
      return;
    }

    if (!changeReason.trim()) {
      toast.error("개명하고 싶은 이유를 입력해 주세요.");
      return;
    }

    if (desiredImage.length === 0) {
      toast.error("원하는 이미지를 하나 이상 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    const input: RenameInput = {
      currentName: currentName.trim(),
      gender,
      ageGroup,
      changeReason: changeReason.trim(),
      desiredImage,
      nameLength,
      pronunciationStyle,
      avoidChars: avoidChars || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "rename", data: input });

    setIsLoading(false);

    if (response.success) {
      setResult(response.result);
      addToHistory({
        ...response.result,
        inputSummary: `${currentName} -> 새 이름 | ${desiredImage.join(", ")}`,
      });
      toast.success("새 이름 추천이 완료되었습니다!");
    } else {
      toast.error(response.error);
    }
  };

  const handleRegenerate = async () => {
    if (!currentName.trim() || !changeReason.trim() || desiredImage.length === 0) return;

    setIsLoading(true);

    const input: RenameInput = {
      currentName: currentName.trim(),
      gender,
      ageGroup,
      changeReason: changeReason.trim(),
      desiredImage,
      nameLength,
      pronunciationStyle,
      avoidChars: avoidChars || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "rename", data: input });

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
      title="개명 추천"
      description="새로운 시작을 위한 당신만의 새 이름을 찾아보세요."
      category="rename"
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
          {/* Current name */}
          <Field>
            <FieldLabel htmlFor="currentName">현재 이름</FieldLabel>
            <Input
              id="currentName"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              placeholder="예: 김영희"
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

          {/* Age group */}
          <Field>
            <FieldLabel>나이대</FieldLabel>
            <Select value={ageGroup} onValueChange={setAgeGroup}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="나이대 선택" />
              </SelectTrigger>
              <SelectContent>
                {ageGroups.map((age) => (
                  <SelectItem key={age} value={age}>
                    {age}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Change reason */}
          <Field>
            <FieldLabel htmlFor="changeReason">개명하고 싶은 이유</FieldLabel>
            <Textarea
              id="changeReason"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="예: 현재 이름이 너무 평범해서 특별한 느낌의 이름을 원해요."
              className="bg-background/50 min-h-[100px]"
            />
          </Field>

          {/* Desired image */}
          <Field>
            <FieldLabel>원하는 이미지/인상 (복수 선택 가능)</FieldLabel>
            <ChipSelect
              options={imageOptions}
              value={desiredImage}
              onChange={setDesiredImage}
              multiple
            />
          </Field>

          {/* Name length */}
          <Field>
            <FieldLabel>이름 길이</FieldLabel>
            <RadioGroup
              value={nameLength}
              onValueChange={(v) => setNameLength(v as "2" | "3")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="2" id="length2" />
                <Label htmlFor="length2" className="cursor-pointer">2글자</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="3" id="length3" />
                <Label htmlFor="length3" className="cursor-pointer">3글자</Label>
              </div>
            </RadioGroup>
          </Field>

          {/* Pronunciation style */}
          <Field>
            <FieldLabel>발음 스타일</FieldLabel>
            <ChipSelect
              options={pronunciationOptions}
              value={[pronunciationStyle]}
              onChange={(v) => setPronunciationStyle(v[0] || "soft")}
              multiple={false}
            />
          </Field>

          {/* Avoid chars */}
          <Field>
            <FieldLabel htmlFor="avoidChars">피하고 싶은 글자/느낌 (선택)</FieldLabel>
            <Input
              id="avoidChars"
              value={avoidChars}
              onChange={(e) => setAvoidChars(e.target.value)}
              placeholder="예: 수, 지, 너무 흔한 이름"
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
            새 이름 추천받기
          </Button>
        </form>
      )}
    </FormWrapper>
  );
}
