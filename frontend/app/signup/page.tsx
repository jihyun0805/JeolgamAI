"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, loginId, password }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? "회원가입에 실패했습니다.");
        return;
      }

      router.push(`/login?loginId=${encodeURIComponent(loginId)}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050a1f] px-5 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-blue-400/20 bg-[#101f4f]/70 p-7 shadow-[0_20px_80px_rgba(11,72,200,0.3)] backdrop-blur-xl">
        <h1 className="text-2xl font-extrabold">회원가입</h1>
        <p className="mt-2 text-sm text-blue-100/70">
          새 계정을 만들고 JeolgamAI를 시작하세요.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-2 text-sm">
            <span className="text-blue-100/80">이름</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-blue-300/30 bg-[#0a153c] px-4 py-3 outline-none ring-blue-400 transition focus:ring-2"
              placeholder="이름 입력"
              required
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-blue-100/80">아이디</span>
            <input
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              className="w-full rounded-xl border border-blue-300/30 bg-[#0a153c] px-4 py-3 outline-none ring-blue-400 transition focus:ring-2"
              placeholder="아이디 입력"
              required
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-blue-100/80">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-blue-300/30 bg-[#0a153c] px-4 py-3 outline-none ring-blue-400 transition focus:ring-2"
              placeholder="비밀번호 입력"
              required
            />
          </label>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-100/70">
          이미 계정이 있나요?{" "}
          <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/login">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
