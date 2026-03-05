import Link from "next/link";

const featureCards = [
  {
    title: "비용 절감 분석",
    desc: "클라우드 리소스 사용량을 분석해 불필요한 지출을 빠르게 찾아냅니다.",
    metric: "예상 절감률 23%",
  },
  {
    title: "실시간 모니터링",
    desc: "AWS, Kubernetes, Prometheus 데이터를 통합해 성능과 비용을 한 화면에서 확인합니다.",
    metric: "월간 알림 정확도 97%",
  },
  {
    title: "리스크 탐지",
    desc: "운영, 보안, 신뢰성 기준으로 리스크 항목을 자동 분류해 우선순위를 제시합니다.",
    metric: "위험 리소스 자동 식별",
  },
  {
    title: "실행 가이드",
    desc: "권장 액션과 롤백 명령까지 함께 제공해 운영팀이 바로 적용할 수 있습니다.",
    metric: "명령 템플릿 즉시 복사",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#040b20] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,103,255,0.2),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(40,95,225,0.28),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,#1e3a8a_1px,transparent_1px),linear-gradient(to_bottom,#1e3a8a_1px,transparent_1px)] [background-size:130px_130px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-5 pb-14 pt-8">
        <header className="flex items-center justify-between rounded-2xl border border-blue-300/20 bg-[#0a153a]/70 px-5 py-4 backdrop-blur-lg">
          <div className="text-3xl font-extrabold tracking-tight">JeolgamAI</div>

          <nav className="hidden items-center gap-3 text-sm md:flex">
            <span className="rounded-full bg-blue-500/90 px-4 py-2 font-semibold">Home</span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-blue-100/80">Features</span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-blue-100/80">Pricing</span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-blue-100/80">Team</span>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-blue-300/40 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-400/10"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
            >
              회원가입
            </Link>
          </div>
        </header>

        <main className="pt-12 text-center">
          <span className="inline-flex rounded-full border border-blue-300/30 bg-blue-500/15 px-5 py-2 text-sm text-blue-100">
            Bank-Level Data Encryption
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">
            클라우드 비용을 줄이고
            <br />
            팀 생산성을 높이세요
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-blue-100/80 md:text-base">
            JeolgamAI는 인프라 비용, 리스크, 실행 가이드를 한 번에 제공합니다.
            로그인 후 바로 대시보드에서 최적화 리포트를 확인할 수 있습니다.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-full bg-blue-500 px-8 py-3 text-sm font-bold text-white hover:bg-blue-400"
            >
              지금 로그인하기
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-blue-300/40 px-8 py-3 text-sm font-bold text-blue-100 hover:bg-blue-400/10"
            >
              무료 회원가입
            </Link>
          </div>
        </main>

        <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-blue-300/20 bg-[#15245b]/90 p-6 text-left shadow-[0_12px_40px_rgba(7,23,80,0.5)]"
            >
              <h2 className="text-xl font-bold text-blue-50">{card.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-blue-100/75">{card.desc}</p>
              <div className="mt-6 rounded-full bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200">
                {card.metric}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
