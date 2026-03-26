"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const featureCards = [
  { title: "비용 분석", desc: "AWS Cost Explorer 데이터를 서비스·리전별로 분석해 낭비 항목과 절감 가능 금액을 산출합니다.", metric: "AWS Cost Explorer 연동" },
  { title: "인프라 모니터링", desc: "AWS EC2·RDS·S3, Kubernetes 클러스터, Prometheus 메트릭을 \n 통합 대시보드에서 관리합니다.", metric: "AWS · K8s · Prometheus" },
  { title: "AI 최적화 권고", desc: "AI가 리스크 수준별로 최적화 권고를 제시하고, 채팅으로 상세 근거와 \n 실행 방법을 설명합니다.", metric: "AI 채팅 Q&A" },
  { title: "통합 리포트", desc: "실행 계획, 롤백 커맨드, 비용 예측이 담긴 리포트를 생성해 팀과 공유할 수 있습니다.", metric: "PDF 내보내기" },
];

const processSteps = [
  { step: "01", title: "Connect", desc: "AWS, Kubernetes, Prometheus 연동을 설정하고 \n 인프라 데이터 수집을 시작합니다." },
  { step: "02", title: "Analyze", desc: "수집된 데이터를 분석해 낭비 비용과 리스크 항목을 자동으로 탐지하고 점수화합니다." },
  { step: "03", title: "Optimize", desc: "AI 권고에 따라 커맨드를 실행하고, 통합 리포트로 팀에 공유합니다." },
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
    ? "group relative inline-flex overflow-hidden rounded-full bg-orange-500 px-8 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
    : "group relative inline-flex overflow-hidden rounded-full border border-orange-300 bg-white px-8 py-3 text-sm font-bold text-orange-600 transition-colors hover:bg-orange-50";
  return (
    <motion.div whileHover={reduce ? undefined : { y: -2, scale: 1.01 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ duration: 0.22, ease: easeOut }}>
      <Link href={href} className={common}>
        <span className="relative z-10">{children}</span>
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
        className="absolute inset-x-0 top-0 h-24"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)", filter: "blur(8px)" }}
        animate={reduce ? undefined : { opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
      />
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#fffbf5] text-gray-900">
      {/* Soft background tints */}
      <motion.div variants={fadeIn} initial="hidden" animate="show"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,140,0,0.10),transparent_45%),radial-gradient(circle_at_85%_5%,rgba(255,180,50,0.12),transparent_40%)]" />

      {/* Header */}
      <motion.header
        initial={reduce ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.45, ease: easeOut }}
        className="relative z-10 w-full shrink-0 border-b border-orange-100 bg-white/80 py-4 backdrop-blur-lg"
      >
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <motion.div whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.2, ease: easeOut }} className="flex h-9 w-9 shrink-0 items-center justify-center">
              <Image src="/gammeongi.png" alt="JeolgamAI" width={40} height={40} className="h-9 w-9 object-contain" />
            </motion.div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900 md:text-2xl">JeolgamAI</span>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <Link href="/login" className="rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50">로그인</Link>
            <Link href="/signup" className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600">회원가입</Link>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-12">
          <motion.main variants={container} initial="hidden" animate="show" className="pt-4 text-center md:pt-8">
            <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-100 px-5 py-2 text-sm font-medium text-orange-700">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              Cloud Cost Intelligence
            </motion.span>
            <motion.h1 variants={fadeUp} className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight text-gray-900 md:text-6xl">
              클라우드 비용을 줄이고<br />
              <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">팀 생산성을 높이세요</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-sm text-gray-500 md:text-base">
              JeolgamAI는 인프라 비용, 리스크, 실행 가이드를 한 번에 제공합니다.<br />
              로그인 후 대시보드에서 최적화 현황을 확인하고, 리포트 메뉴에서 상세 리포트를 생성할 수 있습니다.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <MotionButton href="/login" variant="primary">지금 로그인하기</MotionButton>
              <MotionButton href="/signup" variant="secondary">무료 회원가입</MotionButton>
            </motion.div>

            {/* Dashboard preview */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: reduce ? 0 : 60, filter: reduce ? "blur(0px)" : "blur(12px)" },
                show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: reduce ? 0.01 : 0.9, ease: easeOut } },
              }}
              className="relative mx-auto mt-14 max-w-6xl"
              style={{ zIndex: 1 }}
            >
              <div className="relative overflow-hidden rounded-[32px] border border-orange-200/70 bg-white/60 p-3 shadow-[0_24px_80px_rgba(200,100,0,0.12)] backdrop-blur-xl">
                <div className="relative overflow-hidden rounded-[28px] border border-orange-100">
                  <Image src="/dashboard_mockup.png" alt="JeolgamAI dashboard preview" width={1400} height={860} priority className="h-auto w-full object-cover" />
                  <DashboardBeamOverlay />
                </div>
              </div>
            </motion.div>
          </motion.main>

          {/* Feature Cards */}
          <motion.section variants={grid} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((c) => (
              <motion.article key={c.title} variants={card}
                whileHover={reduce ? undefined : { y: -4, scale: 1.01, boxShadow: "0 16px_48px_rgba(200,80,0,0.10)" }}
                transition={{ duration: 0.22, ease: easeOut }}
                className="flex flex-col rounded-2xl border border-orange-100 bg-white p-6 text-left shadow-sm"
              >
                <h2 className="text-xl font-bold text-gray-900">{c.title}</h2>
                <p className="mt-3 mb-10 flex-1 min-h-0 whitespace-pre-line text-sm leading-relaxed text-gray-500">{c.desc}</p>
                <div className="mt-auto flex w-fit shrink-0 items-center rounded-full bg-orange-100 px-4 pt-2 pb-2.5 text-sm font-semibold leading-none text-orange-700">{c.metric}</div>
              </motion.article>
            ))}
          </motion.section>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-5 pb-20">
        {/* Decision UI Section */}
        <motion.section ref={previewRef} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="mt-24">
          <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center">
            <h3 className="text-2xl font-extrabold text-gray-900 md:text-3xl">권고를 &quot;결정&quot;으로 바꾸는 UI</h3>
            <p className="mt-3 text-sm text-gray-500 md:text-base">절감액과 리스크를 한 화면에서 비교하고, 실행 커맨드까지 바로 확인하세요.</p>
          </motion.div>
          <div className="relative mt-8">
            <motion.div style={{ y: previewGlowY }} className="absolute inset-0 rounded-[32px] bg-orange-300/20 blur-3xl" />
            <motion.div style={{ y: previewCardY }} className="relative">
              <motion.div variants={fadeUp} className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_12px_48px_rgba(200,80,0,0.08)]">
                {/* Stats Grid */}
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: "Total Cost", value: "$4,820/mo", bar: "w-3/4", color: "bg-orange-400" },
                    { label: "Estimated Savings", value: "$1,340/mo", bar: "w-1/2", color: "bg-green-400" },
                    { label: "Risk Items", value: "7 detected", bar: "w-1/3", color: "bg-red-400" },
                  ].map((t) => (
                    <div key={t.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="text-xs font-medium text-gray-400">{t.label}</div>
                      <div className="mt-2 text-lg font-bold text-gray-900">{t.value}</div>
                      <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200">
                        <div className={`h-full rounded-full ${t.color} ${t.bar}`} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Recommendation List */}
                <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recommendations</div>
                    <div className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">3 actions</div>
                  </div>
                  <div className="grid gap-2">
                    {[
                      { label: "EC2 t3.large → t3.medium 다운사이징", save: "-$320", risk: "Low", effort: "Easy" },
                      { label: "미사용 EBS 볼륨 3개 삭제 권고", save: "-$84", risk: "Med", effort: "Easy" },
                      { label: "RDS Multi-AZ 단일 가용 영역 전환", save: "-$210", risk: "High", effort: "Hard" },
                    ].map((item, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        transition={{ duration: reduce ? 0.01 : 0.45, delay: reduce ? 0 : i * 0.08, ease: easeOut }}
                        className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm border border-gray-100"
                      >
                        <div className="text-sm text-gray-700 truncate mr-4">{item.label}</div>
                        <div className="flex shrink-0 gap-2">
                          <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">{item.save}</div>
                          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${item.risk === "Low" ? "bg-green-100 text-green-700" : item.risk === "Med" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{item.risk}</div>
                          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${item.effort === "Easy" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>{item.effort}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Process Steps Section */}
        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="mt-20">
          <motion.div variants={fadeUp} className="mx-auto max-w-4xl text-center">
            <h3 className="text-2xl font-extrabold text-gray-900 md:text-3xl">3단계로 끝나는 최적화</h3>
            <p className="mt-3 text-sm text-gray-500 md:text-base">연동 → 분석 → AI 권고·리포트까지, 운영팀이 바로 움직일 수 있도록.</p>
          </motion.div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {processSteps.map((s, idx) => (
              <motion.div key={s.title} variants={card} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: reduce ? 0 : idx * 0.1 }}
                whileHover={reduce ? undefined : { y: -5, boxShadow: "0 16px 48px rgba(200,80,0,0.10)" }}
                className="relative rounded-2xl border border-orange-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-sm font-extrabold text-white shadow-sm">
                  {s.step}
                </div>
                <div className="text-lg font-extrabold text-gray-900">{s.title}</div>
                <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-500">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="mt-16">
          <motion.div variants={fadeUp}
            className="relative overflow-hidden flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 p-8 text-center shadow-[0_16px_48px_rgba(220,80,0,0.25)] md:flex-row md:text-left"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.12),transparent_55%)]" />
            <div className="relative">
              <div className="text-2xl font-extrabold text-white">지금 바로 JeolgamAI로 시작하세요</div>
              <div className="mt-2 text-sm text-orange-100">연결 → 분석 → 권고 확인까지 3분이면 충분합니다.</div>
            </div>
            <div className="relative flex gap-3 shrink-0">
              <motion.div whileHover={reduce ? undefined : { y: -2, scale: 1.01 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ duration: 0.22, ease: easeOut }}>
                <Link href="/signup" className="inline-flex rounded-full bg-white px-8 py-3 text-sm font-bold text-orange-600 shadow-sm transition-colors hover:bg-orange-50">
                  무료로 시작하기
                </Link>
              </motion.div>
              <motion.div whileHover={reduce ? undefined : { y: -2, scale: 1.01 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ duration: 0.22, ease: easeOut }}>
                <Link href="/login" className="inline-flex rounded-full border border-white/50 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">
                  대시보드 보기
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}
