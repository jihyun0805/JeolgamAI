"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { NameRecommendation } from "@/lib/types";

interface ResultCardProps {
  recommendation: NameRecommendation;
  index: number;
}

export function ResultCard({ recommendation, index }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recommendation.name);
      setCopied(true);
      toast.success("이름이 복사되었습니다");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  return (
    <div
      className="group relative p-5 rounded-2xl backdrop-blur-xl bg-card/80 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Name and tag */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-xl font-bold text-foreground">
              {recommendation.name}
            </h3>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-0 text-xs"
            >
              {recommendation.tag}
            </Badge>
          </div>

          {/* Reason */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {recommendation.reason}
          </p>

          {/* Details (expandable) */}
          {recommendation.details && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    접기
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    자세히 보기
                  </>
                )}
              </button>
              {expanded && (
                <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {recommendation.details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:bg-primary/10"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">이름 복사</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
