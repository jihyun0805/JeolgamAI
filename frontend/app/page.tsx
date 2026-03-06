"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const featureCards = [
  { title: "비용 절감 분석", desc: "클라우드 리소스 사용량을 분석해 \n 불필요한 지출을 빠르게 찾아냅니다.", metric: "예상 절감률 분석" },
  { title: "실시간 모니터링", desc: "AWS, Kubernetes, Prometheus \n 데이터를 통합해 성능과 비용을 \n 한 화면에서 확인합니다.", metric: "통합 비용·성능 모니터링" },
  { title: "리스크 탐지", desc: "운영, 보안, 신뢰성 기준으로 \n 리스크 항목을 자동 분류해 우선순위를 제시합니다.", metric: "위험 리소스 자동 식별" },
  { title: "실행 가이드", desc: "권장 액션과 롤백 명령까지 함께 제공해 운영팀이 바로 적용할 수 있습니다.", metric: "명령 템플릿 즉시 복사" },
];

const processSteps = [
  { title: "Collect", desc: "AWS/Prometheus 데이터를 배치로 수집하고 \n 최신성을 관리합니다." },
  { title: "Detect", desc: "Idle/Over-provision을 규칙 기반으로 탐지하고 리스크를 분류합니다." },
  { title: "Decide", desc: "절감액·리스크·노력도를 비교하고 실행 커맨드를 제공합니다." },
];

const easeOut = [0.16, 1, 0.3, 1] as const;

function useMotionPreset() {
  const reduce = useReducedMotion();
  const dur = reduce ? 0.01 : 0.72;
  const durFast = reduce ? 0.01 : 0.4;

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: reduce ? 0 : 0.6 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, x: reduce ? 0 : -28, filter: reduce ? "blur(0px)" : "blur(8px)" },
    show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: dur, ease: easeOut } },
  };
  const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: durFast, ease: easeOut } },
  };
  const grid = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.1 } } };
  const card = {
    hidden: { opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.98, filter: reduce ? "blur(0px)" : "blur(10px)" },
    show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: dur, ease: easeOut } },
  };
  return { reduce, container, fadeUp, fadeIn, grid, card };
}

function MotionButton({ href, variant, children }: { href: string; variant: "primary" | "secondary"; children: React.ReactNode }) {
  const { reduce } = useMotionPreset();
  const common = variant === "primary"
    ? "group relative inline-flex overflow-hidden rounded-full bg-blue-500 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-400"
    : "group relative inline-flex overflow-hidden rounded-full border border-blue-300/40 px-8 py-3 text-sm font-bold text-blue-100 transition-colors hover:bg-blue-400/10";
  return (
    <motion.div whileHover={reduce ? undefined : { y: -2, scale: 1.01 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ duration: 0.22, ease: easeOut }}>
      <Link href={href} className={common}>
        <span className="relative z-10">{children}</span>
        <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Link>
    </motion.div>
  );
}

function DashboardBeamOverlay() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-32"
        style={{ background: "linear-gradient(180deg, rgba(120,170,255,0.18) 0%, rgba(100,150,255,0.06) 60%, transparent 100%)", filter: "blur(12px)" }}
        animate={reduce ? undefined : { opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-[#040b20]/10" />
    </div>
  );
}

export default function Home() {
  const { container, fadeUp, fadeIn, grid, card, reduce } = useMotionPreset();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: previewRef, offset: ["start end", "end start"] });
  const previewGlowY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [20, -20]);
  const previewCardY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [10, -10]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#040b20] text-white">
      <motion.div variants={fadeIn} initial="hidden" animate="show"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,103,255,0.2),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(40,95,225,0.28),transparent_40%)]" />

      <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-80"
        animate={reduce ? undefined : { scale: [1, 1.05, 1], x: [0, 18, -10, 0], y: [0, -14, 8, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: "radial-gradient(circle at 18% 18%, rgba(56,103,255,0.16), transparent 30%), radial-gradient(circle at 80% 8%, rgba(72,122,255,0.16), transparent 28%), radial-gradient(circle at 50% 65%, rgba(0,170,255,0.08), transparent 35%)", filter: "blur(36px)" }}
      />

      <motion.header
        initial={reduce ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.45, ease: easeOut }}
        className="relative z-10 w-full shrink-0 border-b border-blue-300/20 bg-[#0a153a]/70 py-4 backdrop-blur-lg"
      >
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <motion.div whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.2, ease: easeOut }} className="flex h-9 w-9 shrink-0 items-center justify-center">
              <Image src="/logo.png" alt="JeolgamAI" width={40} height={40} className="h-9 w-9 object-contain" />
            </motion.div>
            <span className="text-xl font-extrabold tracking-tight text-white md:text-2xl">JeolgamAI</span>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <Link href="/login" className="rounded-full border border-blue-300/40 px-4 py-2 text-sm font-semibold text-blue-100 transition-colors hover:bg-blue-400/10">로그인</Link>
            <Link href="/signup" className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-400">회원가입</Link>
          </div>
        </div>
      </motion.header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-12">
          <motion.main variants={container} initial="hidden" animate="show" className="pt-4 text-center md:pt-8">
            <motion.span variants={fadeUp} className="inline-flex rounded-full border border-blue-300/30 bg-blue-500/15 px-5 py-2 text-sm text-blue-100">
              Cloud Cost Intelligence
            </motion.span>
            <motion.h1 variants={fadeUp} className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">
              클라우드 비용을 줄이고<br />팀 생산성을 높이세요
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-sm text-blue-100/80 md:text-base">
              JeolgamAI는 인프라 비용, 리스크, 실행 가이드를 한 번에 제공합니다.<br />
              로그인 후 대시보드에서 최적화 현황을 확인하고, 리포트 메뉴에서 상세 리포트를 생성할 수 있습니다.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <MotionButton href="/login" variant="primary">지금 로그인하기</MotionButton>
              <MotionButton href="/signup" variant="secondary">무료 회원가입</MotionButton>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: reduce ? 0 : 60, filter: reduce ? "blur(0px)" : "blur(12px)" },
                show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: reduce ? 0.01 : 0.9, ease: easeOut } },
              }}
              className="relative mx-auto mt-14 max-w-6xl"
              style={{ zIndex: 1 }}
            >
              <div className="relative overflow-hidden rounded-[32px] border border-blue-300/20 bg-[#0a153a]/60 p-3 shadow-[0_24px_90px_rgba(7,23,80,0.5)] backdrop-blur-xl">
                <div className="relative overflow-hidden rounded-[28px] border border-blue-300/10 bg-[#09122f]">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
                  <Image src="/dashboard-preview.png" alt="JeolgamAI dashboard preview" width={1400} height={860} priority className="h-auto w-full object-cover" />
                  <DashboardBeamOverlay />
                </div>
              </div>
            </motion.div>
          </motion.main>

          <motion.section variants={grid} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((c) => (
              <motion.article key={c.title} variants={card}
                whileHover={reduce ? undefined : { y: -4, scale: 1.01, boxShadow: "0 20px 60px rgba(20,80,255,0.18)" }}
                transition={{ duration: 0.22, ease: easeOut }}
                className="flex flex-col rounded-2xl border border-blue-300/20 bg-[#15245b]/90 p-6 text-left shadow-[0_12px_40px_rgba(7,23,80,0.5)]"
              >
                <h2 className="text-xl font-bold text-blue-50">{c.title}</h2>
                <p className="mt-3 mb-10 flex-1 min-h-0 whitespace-pre-line text-sm leading-relaxed text-blue-100/75">{c.desc}</p>
                <div className="mt-auto flex w-fit shrink-0 items-center rounded-full bg-blue-500/20 px-4 pt-2 pb-2.5 text-sm font-semibold leading-none text-blue-200">{c.metric}</div>
              </motion.article>
            ))}
          </motion.section>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-5 pb-20">
        <motion.section ref={previewRef} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="mt-24">
          <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center">
            <h3 className="text-2xl font-extrabold text-white md:text-3xl">권고를 &quot;결정&quot;으로 바꾸는 UI</h3>
            <p className="mt-3 text-sm text-blue-100/75 md:text-base">절감액과 리스크를 한 화면에서 비교하고, 실행 커맨드까지 바로 확인하세요.</p>
          </motion.div>
          <div className="relative mx-auto mt-8 max-w-5xl">
            <motion.div style={{ y: previewGlowY }} className="absolute inset-0 rounded-[32px] bg-blue-500/10 blur-3xl" />
            <motion.div style={{ y: previewCardY }} className="relative">
              <motion.div variants={fadeUp} className="rounded-3xl border border-blue-300/20 bg-[#0a153a]/60 p-5 shadow-[0_18px_60px_rgba(7,23,80,0.55)] backdrop-blur">
                <div className="grid gap-3 md:grid-cols-3">
                  {["Total Cost", "Estimated Savings", "Risk Items"].map((t) => (
                    <div key={t} className="rounded-2xl border border-blue-300/15 bg-[#15245b]/70 p-4">
                      <div className="text-xs text-blue-100/70">{t}</div>
                      <div className="mt-2 h-6 w-32 rounded bg-blue-500/20" />
                      <div className="mt-3 h-2 w-full rounded bg-blue-500/10" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-blue-300/15 bg-[#15245b]/70 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-blue-100/70">Recommendation</div>
                    <div className="h-6 w-24 rounded-full bg-blue-500/15" />
                  </div>
                  <div className="mt-3 grid gap-2">
                    {[1, 2, 3].map((i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        transition={{ duration: reduce ? 0.01 : 0.45, delay: reduce ? 0 : i * 0.08, ease: easeOut }}
                        className="flex items-center justify-between rounded-xl bg-[#0a153a]/50 p-3"
                      >
                        <div className="h-3 w-40 rounded bg-blue-500/20" />
                        <div className="flex gap-2">
                          <div className="h-6 w-16 rounded-full bg-green-500/15" />
                          <div className="h-6 w-16 rounded-full bg-red-500/15" />
                          <div className="h-6 w-16 rounded-full bg-blue-500/15" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="mt-14">
          <motion.div variants={fadeUp} className="mx-auto max-w-4xl text-center">
            <h3 className="text-2xl font-extrabold text-white md:text-3xl">3단계로 끝나는 최적화</h3>
            <p className="mt-3 text-sm text-blue-100/75 md:text-base">수집 → 탐지 → 권고/실행가이드까지, 운영팀이 바로 움직일 수 있도록.</p>
          </motion.div>
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 whitespace-pre-line md:grid-cols-3">
            {processSteps.map((s, idx) => (
              <motion.div key={s.title} variants={card} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: reduce ? 0 : idx * 0.08 }}
                whileHover={reduce ? undefined : { y: -4 }}
                className="rounded-2xl border border-blue-300/20 bg-[#15245b]/70 p-6"
              >
                <div className="text-sm font-extrabold text-blue-100">{s.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-blue-100/70">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="mt-16">
          <motion.div variants={fadeUp}
            className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 rounded-3xl border border-blue-300/20 bg-[#0a153a]/60 p-8 text-center backdrop-blur md:flex-row md:text-left"
          >
            <div>
              <div className="text-2xl font-extrabold">지금 바로 JeolgamAI로 시작하세요</div>
              <div className="mt-2 text-sm text-blue-100/70">연결 → 분석 → 권고 확인까지 3분이면 충분합니다.</div>
            </div>
            <div className="flex gap-3">
              <MotionButton href="/signup" variant="primary">무료로 시작하기</MotionButton>
              <MotionButton href="/login" variant="secondary">대시보드 보기</MotionButton>
            </div>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}