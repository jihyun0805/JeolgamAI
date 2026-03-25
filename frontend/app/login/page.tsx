"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import ThemeToggle from "@/app/components/theme-toggle";
import { storeSession } from "@/lib/jwt-store";
import { TEST_ACCOUNT } from "@/lib/test-users";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loginId, setLoginId] = useState(searchParams.get("loginId") ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  /** 서버/네트워크 오류만 (폼 상단 배너) */
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ loginId: false, password: false });
  const [fieldErrors, setFieldErrors] = useState<{ loginId?: string; password?: string }>({});

  const redirect = useMemo(
    () => searchParams.get("redirect") || "/dashboard",
    [searchParams],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    setTouched({ loginId: true, password: true });
    const nextFieldErrors: { loginId?: string; password?: string } = {};
    if (!loginId.trim()) nextFieldErrors.loginId = "아이디를 입력해주세요.";
    if (!password) nextFieldErrors.password = "비밀번호를 입력해주세요.";
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password, redirect }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? "로그인에 실패했습니다.");
        return;
      }

      const { token, userId, name, role, workspaceId, expiresAt } = payload.data;
      storeSession({ token, userId, name, role, workspaceId, expiresAt });

      router.push(payload.data?.redirect || "/dashboard");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-10 text-foreground">
      <div className="absolute right-4 top-4 z-10 md:right-8 md:top-8">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-7 shadow-[0_20px_80px_color-mix(in_srgb,var(--brand)_16%,transparent)] backdrop-blur-xl dark:border-blue-400/20 dark:bg-[#101f4f]/70 dark:shadow-[0_20px_80px_rgba(11,72,200,0.3)]">
        <h1 className="text-2xl font-extrabold">로그인</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-blue-100/70">
          계정으로 로그인하고 대시보드로 이동하세요.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-sm dark:border-red-400/60 dark:bg-red-950/60 dark:text-red-100"
            >
              {error}
            </div>
          ) : null}

          <label className="block space-y-2 text-sm">
            <span className="text-slate-600 dark:text-blue-100/80">아이디</span>
            <input
              value={loginId}
              onChange={(event) => {
                const v = event.target.value;
                setLoginId(v);
                setError("");
                setFieldErrors((fe) => {
                  const next = { ...fe };
                  const msg = !v.trim() ? "아이디를 입력해주세요." : undefined;
                  if (msg) next.loginId = msg;
                  else delete next.loginId;
                  return next;
                });
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, loginId: true }));
                setFieldErrors((fe) => {
                  const next = { ...fe };
                  if (!loginId.trim()) next.loginId = "아이디를 입력해주세요.";
                  else delete next.loginId;
                  return next;
                });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-foreground outline-none ring-brand/40 transition focus:border-brand focus:ring-2 dark:border-blue-300/30 dark:bg-[#0a153c] dark:ring-blue-400"
              placeholder="아이디 입력"
            />
            {touched.loginId && fieldErrors.loginId ? (
              <p className="text-xs font-medium text-red-600 dark:text-red-300">{fieldErrors.loginId}</p>
            ) : null}
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-slate-600 dark:text-blue-100/80">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                const v = event.target.value;
                setPassword(v);
                setError("");
                setFieldErrors((fe) => {
                  const next = { ...fe };
                  if (!v) next.password = "비밀번호를 입력해주세요.";
                  else delete next.password;
                  return next;
                });
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, password: true }));
                setFieldErrors((fe) => {
                  const next = { ...fe };
                  if (!password) next.password = "비밀번호를 입력해주세요.";
                  else delete next.password;
                  return next;
                });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-foreground outline-none ring-brand/40 transition focus:border-brand focus:ring-2 dark:border-blue-300/30 dark:bg-[#0a153c] dark:ring-blue-400"
              placeholder="비밀번호 입력"
            />
            {touched.password && fieldErrors.password ? (
              <p className="text-xs font-medium text-red-600 dark:text-red-300">{fieldErrors.password}</p>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-brand/25 bg-brand-muted px-4 py-3 text-xs text-slate-700 dark:border-blue-300/20 dark:bg-[#0a163f] dark:text-blue-100/80">
          <p className="font-semibold text-brand dark:text-blue-100">테스트 계정</p>
          <p className="mt-1">아이디: {TEST_ACCOUNT.loginId}</p>
          <p>비밀번호: {TEST_ACCOUNT.password}</p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-blue-100/70">
          계정이 없나요?{" "}
          <Link
            className="font-semibold text-brand hover:text-brand-hover dark:text-blue-300 dark:hover:text-blue-200"
            href="/signup"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background" />
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
