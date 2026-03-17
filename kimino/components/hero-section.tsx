"use client";

import { Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-white/50 rounded-full animate-pulse" />
        <div
          className="absolute top-32 right-20 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-16 right-1/3 w-1 h-1 bg-white/60 rounded-full animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container mx-auto px-4 text-center">
        {/* Main title */}
        <div className="relative inline-block mb-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight text-balance">
            <span className="relative">
              너의 이름은
              <Sparkles className="absolute -top-4 -right-6 md:-right-8 h-6 w-6 md:h-8 md:w-8 text-primary animate-pulse" />
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto mb-8 leading-relaxed text-pretty">
          당신의 정체성, 목적, 분위기에 맞는 이름을 AI가 추천해드립니다.
          <br className="hidden md:block" />
          새로운 시작을 위한 완벽한 이름을 찾아보세요.
        </p>

        {/* Decorative line */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50" />
          <Sparkles className="h-4 w-4 text-primary/60" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50" />
        </div>
      </div>
    </section>
  );
}
