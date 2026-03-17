"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-4 group">
            <Sparkles className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            <span className="font-semibold text-foreground">너의 이름은</span>
          </Link>

          {/* Tagline */}
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            당신의 정체성, 목적, 분위기에 맞는 완벽한 이름을 AI가 추천해드립니다.
          </p>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/70">
            {new Date().getFullYear()} 너의 이름은. AI 기반 이름 추천 서비스.
          </p>
        </div>
      </div>
    </footer>
  );
}
