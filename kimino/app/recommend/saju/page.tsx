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
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";
import { generateNames } from "@/app/actions/generate";
import { addToHistory } from "@/lib/history";
import type { SajuNamingInput, RecommendationResult } from "@/lib/types";

const vibeOptions = [
  { value: "soft", label: "부드러운" },
  { value: "intellectual", label: "지적인" },
  { value: "elegant", label: "고급스러운" },
  { value: "bright", label: "밝은" },
  { value: "graceful", label: "단아한" },
  { value: "strong", label: "강인한" },
  { value: "unique", label: "독특한" },
  { value: "modern", label: "현대적인" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

export default function SajuNamingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);

  // Form state
  const [gender, setGender] = useState<"male" | "female" | "neutral">("male");
  const [lastName, setLastName] = useState("");
  const [birthYear, setBirthYear] = useState<number>(2000);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthTime, setBirthTime] = useState("");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [vibes, setVibes] = useState<string[]>([]);
  const [nameLength, setNameLength] = useState<"2" | "3">("2");
  const [avoidChars, setAvoidChars] = useState("");
  const [additionalRequests, setAdditionalRequests] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lastName.trim()) {
      toast.error("성씨를 입력해 주세요.");
      return;
    }

    if (vibes.length === 0) {
      toast.error("원하는 이름 분위기를 하나 이상 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    const input: SajuNamingInput = {
      gender,
      lastName: lastName.trim(),
      birthYear,
      birthMonth,
      birthDay,
      birthTime: birthTime || undefined,
      calendarType,
      vibes,
      nameLength,
      avoidChars: avoidChars || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "saju", data: input });

    setIsLoading(false);

    if (response.success) {
      setResult(response.result);
      addToHistory({
        ...response.result,
        inputSummary: `${lastName}씨 ${gender === "male" ? "남성" : gender === "female" ? "여성" : "중성"} | ${birthYear}년생 | ${vibes.join(", ")}`,
      });
      toast.success("이름 추천이 완료되었습니다!");
    } else {
      toast.error(response.error);
    }
  };

  const handleRegenerate = async () => {
    if (!lastName.trim() || vibes.length === 0) return;

    setIsLoading(true);

    const input: SajuNamingInput = {
      gender,
      lastName: lastName.trim(),
      birthYear,
      birthMonth,
      birthDay,
      birthTime: birthTime || undefined,
      calendarType,
      vibes,
      nameLength,
      avoidChars: avoidChars || undefined,
      additionalRequests: additionalRequests || undefined,
    };

    const response = await generateNames({ type: "saju", data: input });

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
      title="사주 기반 작명"
      description="입력한 생년월일과 원하는 분위기를 바탕으로 AI가 이름 방향성을 제안합니다."
      category="saju"
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

          {/* Last name */}
          <Field>
            <FieldLabel htmlFor="lastName">성씨</FieldLabel>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="예: 김, 이, 박"
              className="bg-background/50"
              maxLength={3}
            />
          </Field>

          {/* Birth date */}
          <FieldGroup>
            <FieldLabel>생년월일</FieldLabel>
            <div className="grid grid-cols-3 gap-3">
              <Select
                value={String(birthYear)}
                onValueChange={(v) => setBirthYear(Number(v))}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="년" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(birthMonth)}
                onValueChange={(v) => setBirthMonth(Number(v))}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="월" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(birthDay)}
                onValueChange={(v) => setBirthDay(Number(v))}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="일" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}일
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FieldGroup>

          {/* Birth time (optional) */}
          <Field>
            <FieldLabel htmlFor="birthTime">출생시간 (선택)</FieldLabel>
            <Input
              id="birthTime"
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="bg-background/50"
            />
          </Field>

          {/* Calendar type */}
          <Field>
            <FieldLabel>양력/음력</FieldLabel>
            <RadioGroup
              value={calendarType}
              onValueChange={(v) => setCalendarType(v as "solar" | "lunar")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="solar" id="solar" />
                <Label htmlFor="solar" className="cursor-pointer">양력</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lunar" id="lunar" />
                <Label htmlFor="lunar" className="cursor-pointer">음력</Label>
              </div>
            </RadioGroup>
          </Field>

          {/* Vibes */}
          <Field>
            <FieldLabel>원하는 이름 분위기 (복수 선택 가능)</FieldLabel>
            <ChipSelect
              options={vibeOptions}
              value={vibes}
              onChange={setVibes}
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

          {/* Avoid chars */}
          <Field>
            <FieldLabel htmlFor="avoidChars">피하고 싶은 글자/느낌 (선택)</FieldLabel>
            <Input
              id="avoidChars"
              value={avoidChars}
              onChange={(e) => setAvoidChars(e.target.value)}
              placeholder="예: 수, 지, 너무 평범한"
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
            이름 추천받기
          </Button>
        </form>
      )}
    </FormWrapper>
  );
}
