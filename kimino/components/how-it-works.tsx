"use client";

import { ClipboardList, Brain, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "정보 입력",
    description: "원하는 이름의 분위기, 용도, 선호도 등을 입력해주세요.",
  },
  {
    icon: Brain,
    title: "AI 분석",
    description: "AI가 입력한 정보를 분석하여 최적의 이름을 찾습니다.",
  },
  {
    icon: CheckCircle2,
    title: "결과 확인",
    description: "추천된 이름 중 마음에 드는 이름을 선택하세요.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Section title */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            이렇게 이용하세요
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            간단한 3단계로 나에게 딱 맞는 이름을 찾아보세요
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center group">
              {/* Connector line (hidden on last item and mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-primary/30 to-primary/10" />
              )}

              {/* Icon circle */}
              <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-colors" />
                <div className="absolute inset-2 rounded-full bg-card/80 backdrop-blur-sm" />
                <step.icon className="relative h-10 w-10 text-primary" />

                {/* Step number badge */}
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>
              </div>

              {/* Text */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
