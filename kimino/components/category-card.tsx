"use client";

import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Globe,
  Gamepad2,
  Rocket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryInfo } from "@/lib/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  refresh: RefreshCw,
  globe: Globe,
  gamepad: Gamepad2,
  rocket: Rocket,
  users: Users,
};

interface CategoryCardProps {
  category: CategoryInfo;
  index: number;
}

export function CategoryCard({ category, index }: CategoryCardProps) {
  const Icon = iconMap[category.icon] || Sparkles;

  return (
    <Link href={category.href} className="block group">
      <div
        className="relative h-full p-6 rounded-2xl backdrop-blur-xl bg-card/80 border border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:bg-card/90"
        style={{
          animationDelay: `${index * 100}ms`,
        }}
      >
        {/* Subtle glow on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-accent/5" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-6 w-6 text-primary" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground mb-2 text-balance">
            {category.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 flex-grow leading-relaxed">
            {category.description}
          </p>

          {/* CTA */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border-0"
          >
            시작하기
          </Button>
        </div>
      </div>
    </Link>
  );
}
