"use client";

import { Heart, Lightbulb, Zap, Shield } from "lucide-react";

const reasons = [
  {
    icon: Heart,
    title: "맞춤형 추천",
    description: "당신이 입력한 정보를 바탕으로 개인화된 이름을 추천합니다.",
  },
  {
    icon: Lightbulb,
    title: "다양한 아이디어",
    description: "혼자서는 생각하기 어려운 창의적인 이름을 제안해드립니다.",
  },
  {
    icon: Zap,
    title: "빠른 결과",
    description: "몇 초 안에 여러 개의 이름 후보를 확인할 수 있습니다.",
  },
  {
    icon: Shield,
    title: "신뢰할 수 있는 AI",
    description: "문화적으로 적절하고 자연스러운 이름만 추천합니다.",
  },
];

export function WhySection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Section title */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            왜 너의 이름은?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            이름 짓기가 고민될 때, AI가 도와드립니다
          </p>
        </div>

        {/* Reasons grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {reasons.map((reason, index) => (
            <div
              key={reason.title}
              className="relative p-6 rounded-2xl backdrop-blur-xl bg-card/60 border border-border/50 text-center group hover:bg-card/80 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 mb-4 group-hover:scale-110 transition-transform duration-300">
                <reason.icon className="h-7 w-7 text-primary" />
              </div>

              {/* Text */}
              <h3 className="font-semibold text-foreground mb-2">
                {reason.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
