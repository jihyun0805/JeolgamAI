"use client";

import { useEffect, useState } from "react";

export function GradientBackground({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            linear-gradient(
              180deg,
              oklch(0.92 0.05 230) 0%,
              oklch(0.94 0.06 290) 30%,
              oklch(0.9 0.08 330) 60%,
              oklch(0.88 0.1 20) 100%
            )
          `,
        }}
      />

      {/* Subtle animated glow effects */}
      {mounted && (
        <>
          <div
            className="fixed top-0 left-1/4 w-[600px] h-[600px] -z-5 opacity-40 animate-pulse"
            style={{
              background:
                "radial-gradient(circle, oklch(0.85 0.1 330 / 0.4) 0%, transparent 70%)",
              animationDuration: "8s",
            }}
          />
          <div
            className="fixed top-1/3 right-0 w-[500px] h-[500px] -z-5 opacity-30 animate-pulse"
            style={{
              background:
                "radial-gradient(circle, oklch(0.9 0.08 50 / 0.4) 0%, transparent 70%)",
              animationDuration: "10s",
              animationDelay: "2s",
            }}
          />
          <div
            className="fixed bottom-0 left-0 w-[700px] h-[400px] -z-5 opacity-25 animate-pulse"
            style={{
              background:
                "radial-gradient(ellipse, oklch(0.88 0.06 230 / 0.4) 0%, transparent 70%)",
              animationDuration: "12s",
              animationDelay: "4s",
            }}
          />
        </>
      )}

      {/* Sparkle/star effects */}
      {mounted && (
        <div className="fixed inset-0 -z-5 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/60 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                animationDuration: `${2 + Math.random() * 3}s`,
                animationDelay: `${Math.random() * 2}s`,
                transform: `scale(${0.5 + Math.random() * 1})`,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
