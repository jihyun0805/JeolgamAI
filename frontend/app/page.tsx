import Link from "next/link";

function IconCloud({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 18h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 6.1 8.8 4.2 4.2 0 0 0 7 18Z" />
      <path d="m10 12 2-2 2 2" />
      <path d="M12 10v6" />
    </svg>
  );
}

function IconShieldCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v6c0 4.2 2.7 7.8 7 9 4.3-1.2 7-4.8 7-9V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.2-3.2" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function IconUnlock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="10" width="17" height="10" rx="2" />
      <path d="M8 10V8a4 4 0 0 1 8 0" />
    </svg>
  );
}

function IconShieldLock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v6c0 4.2 2.7 7.8 7 9 4.3-1.2 7-4.8 7-9V6l-7-3Z" />
      <rect x="9.2" y="11.5" width="5.6" height="4.2" rx="1" />
      <path d="M10.6 11.5V10.3a1.4 1.4 0 1 1 2.8 0v1.2" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f6f8] text-slate-900 dark:bg-[#0f172a] dark:text-slate-100">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between border-b border-slate-200 px-6 py-6 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="text-[#1c59f2]">
            <svg
              fill="none"
              height="32"
              viewBox="0 0 48 48"
              width="32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase dark:text-white">
            JeolgamAI
          </h1>
        </div>

        <nav className="hidden items-center gap-10 md:flex">
          <a
            className="text-sm font-medium text-slate-600 transition-colors hover:text-[#1c59f2] dark:text-slate-400"
            href="#"
          >
            서비스 소개
          </a>
          <a
            className="text-sm font-medium text-slate-600 transition-colors hover:text-[#1c59f2] dark:text-slate-400"
            href="#"
          >
            보안 정책
          </a>
          <a
            className="text-sm font-medium text-slate-600 transition-colors hover:text-[#1c59f2] dark:text-slate-400"
            href="#"
          >
            고객지원
          </a>
        </nav>

        <div>
          <button className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-bold text-slate-900 transition-all hover:bg-slate-300 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
            문의하기
          </button>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1c59f2]/10 blur-[120px]" />

        <div className="z-10 w-full max-w-[480px]">
          <div className="mb-10 text-center">
            <h2 className="mb-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              클라우드 비용 절감의 시작
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              JeolgamAI와 함께 효율적인 자원 관리를 시작하세요.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-800/70 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold tracking-widest text-[#1c59f2] uppercase">
                Enterprise SaaS Platform
              </p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                클라우드 계정 연결
              </h3>
            </div>

            <div className="mb-8 space-y-4">
              <Link
                className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#2563eb] text-lg font-bold text-white shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] hover:bg-blue-700"
                href="/api/auth/login?role=company_admin&redirect=/integrations"
              >
                <IconCloud className="h-5 w-5" />
                AWS 계정 연결
              </Link>

              <div className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <IconShieldCheck className="h-5 w-5 text-[#1c59f2]" />
                <p className="text-sm leading-relaxed text-slate-300">
                  보안 알고리즘을 통해 클라우드 데이터를 안전하게 분석합니다. 읽기
                  전용 권한으로 자원을 최적화합니다.
                </p>
              </div>
            </div>

            <div className="relative mb-6 flex items-center py-4">
              <div className="flex-grow border-t border-slate-700" />
              <span className="mx-4 flex-shrink text-xs font-bold tracking-widest text-slate-500 uppercase">
                OR CONTINUE WITH
              </span>
              <div className="flex-grow border-t border-slate-700" />
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4">
              <Link
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                href="/api/auth/login?role=company_admin&redirect=/dashboard"
              >
                <IconMail className="h-4 w-4" />
                이메일 로그인
              </Link>
              <Link
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                href="/api/auth/login?role=company_operator&redirect=/dashboard"
              >
                <IconUnlock className="h-4 w-4" />
                Azure SSO
              </Link>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-700 pt-6">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <IconShieldLock className="h-4 w-4 text-green-500" />
                  256비트 AES 암호화 적용
                </div>
                <a
                  className="flex items-center gap-1 transition-colors hover:text-white"
                  href="#"
                >
                  보안 기술서 보기
                  <IconArrowRight className="h-3 w-3" />
                </a>
              </div>
              <p className="text-center text-[13px] text-slate-500">
                데이터는 암호화되어 안전하게 보호됩니다.
                <br />
                귀하의 클라우드 인프라는 JeolgamAI의 최고 보안 등급으로
                관리됩니다.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-6 text-xs font-medium text-slate-500">
            <a className="transition-colors hover:text-[#1c59f2]" href="#">
              이용약관
            </a>
            <a className="transition-colors hover:text-[#1c59f2]" href="#">
              개인정보처리방침
            </a>
            <a className="transition-colors hover:text-[#1c59f2]" href="#">
              쿠키 정책
            </a>
            <span className="text-slate-700">|</span>
            <span>© 2024 JeolgamAI Inc.</span>
          </div>
        </div>
      </main>

      <div className="pointer-events-none fixed top-0 right-0 hidden h-full w-1/3 overflow-hidden opacity-20 select-none dark:opacity-30 lg:block">
        <div className="absolute top-1/2 left-0 h-full w-full -translate-y-1/2 bg-gradient-to-l from-[#1c59f2]/20 to-transparent" />
        <div className="absolute top-[20%] right-[-100px] h-[500px] w-[500px] rounded-full border border-slate-700" />
        <div className="absolute top-[40%] right-[-50px] h-[400px] w-[400px] rounded-full border border-[#1c59f2]/30" />
        <div className="absolute top-[30%] right-[100px] w-full">
          <div className="mb-4 w-64 rotate-[-6deg] rounded-xl border border-slate-700 bg-slate-800/40 p-6 shadow-2xl">
            <div className="mb-4 h-2 w-12 rounded bg-[#1c59f2]/40" />
            <div className="mb-2 h-4 w-full rounded bg-slate-700/50" />
            <div className="h-4 w-2/3 rounded bg-slate-700/50" />
          </div>
          <div className="ml-20 w-72 rotate-[3deg] rounded-xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-2 w-16 rounded bg-green-500/40" />
              <div className="h-6 w-6 rounded-full bg-[#1c59f2]/20" />
            </div>
            <div className="mb-2 h-4 w-full rounded bg-slate-700/50" />
            <div className="h-4 w-4/5 rounded bg-slate-700/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
