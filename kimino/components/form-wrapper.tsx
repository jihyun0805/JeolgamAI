"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GradientBackground } from "@/components/gradient-background";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { RecommendationType } from "@/lib/types";

interface FormWrapperProps {
  children: React.ReactNode;
  title: string;
  description: string;
  category: RecommendationType;
}

export function FormWrapper({
  children,
  title,
  description,
}: FormWrapperProps) {
  return (
    <GradientBackground>
      <Header />

      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-3xl">
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
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {title}
              </h1>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {description}
            </p>
          </div>

          {/* Form content */}
          <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl p-6 md:p-8 shadow-lg">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </GradientBackground>
  );
}
