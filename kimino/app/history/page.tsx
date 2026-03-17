"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Clock, ChevronRight, Sparkles } from "lucide-react";
import { GradientBackground } from "@/components/gradient-background";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Empty } from "@/components/ui/empty";
import { toast } from "sonner";
import { getHistory, clearHistory, removeFromHistory } from "@/lib/history";
import { CATEGORIES, type HistoryItem } from "@/lib/types";

const categoryLabels: Record<string, string> = {
  saju: "사주 기반 작명",
  rename: "개명 추천",
  foreign: "외국어 이름",
  game: "게임 캐릭터",
  project: "프로젝트 이름",
  team: "팀 이름",
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHistory(getHistory());
  }, []);

  const handleClearAll = () => {
    clearHistory();
    setHistory([]);
    toast.success("모든 기록이 삭제되었습니다.");
  };

  const handleRemoveItem = (id: string) => {
    removeFromHistory(id);
    setHistory(getHistory());
    toast.success("기록이 삭제되었습니다.");
  };

  if (!mounted) {
    return null;
  }

  return (
    <GradientBackground>
      <Header />

      <main className="py-8 md:py-12 min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back button */}
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 hover:bg-white/20 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              홈으로
            </Button>
          </Link>

          {/* Page header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                최근 결과
              </h1>
            </div>

            {history.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-card/80 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    전체 삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
                  <AlertDialogHeader>
                    <AlertDialogTitle>전체 기록 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      모든 추천 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* History list */}
          {history.length === 0 ? (
            <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl p-8 md:p-12">
              <Empty
                icon={<Sparkles className="h-12 w-12 text-primary/50" />}
                title="아직 추천 기록이 없어요"
                description="이름 추천을 받으면 여기에 기록이 저장됩니다."
              >
                <Link href="/">
                  <Button className="mt-4 bg-primary hover:bg-primary/90">
                    이름 추천받기
                  </Button>
                </Link>
              </Empty>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="group backdrop-blur-xl bg-card/80 border border-border/50 rounded-2xl p-5 hover:bg-card/90 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Category and date */}
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-0"
                        >
                          {categoryLabels[item.category] || item.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.timestamp)}
                        </span>
                      </div>

                      {/* Input summary */}
                      <p className="text-sm text-muted-foreground mb-3">
                        {item.inputSummary}
                      </p>

                      {/* Preview of recommendations */}
                      <div className="flex flex-wrap gap-2">
                        {item.recommendations.slice(0, 5).map((rec, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-muted/50 text-foreground text-sm rounded-full"
                          >
                            {rec.name}
                          </span>
                        ))}
                        {item.recommendations.length > 5 && (
                          <span className="px-3 py-1 text-muted-foreground text-sm">
                            +{item.recommendations.length - 5}개 더
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">삭제</span>
                      </Button>
                      <Link href={CATEGORIES.find(c => c.id === item.category)?.href || "/"}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10"
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">다시 추천받기</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </GradientBackground>
  );
}
