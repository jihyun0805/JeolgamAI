"use client";

import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultCard } from "@/components/result-card";
import type { RecommendationResult } from "@/lib/types";

interface ResultsContainerProps {
  result: RecommendationResult;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function ResultsContainer({
  result,
  onRegenerate,
  isRegenerating,
}: ResultsContainerProps) {
  const handleDownload = () => {
    const text = result.recommendations
      .map(
        (r, i) => `${i + 1}. ${r.name}\n   ${r.tag}\n   ${r.reason}${r.details ? `\n   ${r.details}` : ""}`
      )
      .join("\n\n");

    const blob = new Blob(
      [`너의 이름은 - 추천 결과\n\n${result.summary}\n\n${text}`],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `이름추천_${new Date().toLocaleDateString("ko-KR")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            추천 결과
          </h2>
          <p className="text-sm text-muted-foreground">
            {result.summary}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="bg-card/80 border-border/50"
          >
            <Download className="h-4 w-4 mr-2" />
            저장
          </Button>
          {onRegenerate && (
            <Button
              variant="default"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="bg-primary hover:bg-primary/90"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`}
              />
              다시 추천받기
            </Button>
          )}
        </div>
      </div>

      {/* Results grid */}
      <div className="grid gap-4">
        {result.recommendations.map((recommendation, index) => (
          <ResultCard
            key={`${recommendation.name}-${index}`}
            recommendation={recommendation}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
