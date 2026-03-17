"use client";

import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <span className="text-lg font-medium text-foreground">
            AI가 이름을 추천하고 있어요
          </span>
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">잠시만 기다려 주세요...</p>
      </div>

      {/* Skeleton cards */}
      <div className="grid gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl backdrop-blur-xl bg-card/60 border border-border/50"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
