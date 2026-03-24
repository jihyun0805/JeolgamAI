"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SignupField = "name" | "loginId" | "password" | "passwordConfirm";

function validateNameField(name: string): string | undefined {
  const t = name.trim();
  if (!t) return "이름을 입력해주세요.";
  if (t.length > 50) return "이름은 50자 이하로 입력해주세요.";
  return undefined;
}

function validateLoginIdField(loginId: string): string | undefined {
  const t = loginId.trim();
  if (!t) return "아이디를 입력해주세요.";
  if (t.length < 3) return "아이디는 3자 이상 입력해주세요.";
  if (t.length > 50) return "아이디는 50자 이하로 입력해주세요.";
  return undefined;
}

function validatePasswordField(password: string): string | undefined {
  if (!password) return "비밀번호를 입력해주세요.";
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (password.length > 100) return "비밀번호는 100자 이하로 입력해주세요.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return "비밀번호는 영문과 숫자를 모두 포함해야 합니다.";
  }
  return undefined;
}

function validatePasswordConfirmField(password: string, passwordConfirm: string): string | undefined {
  if (!passwordConfirm) return "비밀번호 확인을 입력해주세요.";
  if (password !== passwordConfirm) return "비밀번호가 일치하지 않습니다.";
  return undefined;
}

function computeAllSignupFieldErrors(input: {
  name: string;
  loginId: string;
  password: string;
  passwordConfirm: string;
}): Partial<Record<SignupField, string>> {
  const out: Partial<Record<SignupField, string>> = {};
  const n = validateNameField(input.name);
  if (n) out.name = n;
  const id = validateLoginIdField(input.loginId);
  if (id) out.loginId = id;
  const p = validatePasswordField(input.password);
  if (p) out.password = p;
  const c = validatePasswordConfirmField(input.password, input.passwordConfirm);
  if (c) out.passwordConfirm = c;
  return out;
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({
    name: false,
    loginId: false,
    password: false,
    passwordConfirm: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SignupField, string>>>({});

  function patchFieldError(field: SignupField, message: string | undefined) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    setTouched({
      name: true,
      loginId: true,
      password: true,
      passwordConfirm: true,
    });
    const allErr = computeAllSignupFieldErrors({
      name,
      loginId,
      password,
      passwordConfirm,
    });
    setFieldErrors(allErr);
    if (Object.keys(allErr).length > 0) return;

    const nameTrim = name.trim();
    const loginIdTrim = loginId.trim();

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameTrim,
          loginId: loginIdTrim,
          password,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? "회원가입에 실패했습니다.");
        return;
      }

      router.push(`/login?loginId=${encodeURIComponent(loginIdTrim)}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050a1f] px-5 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-blue-400/20 bg-[#101f4f]/70 p-7 shadow-[0_20px_80px_rgba(11,72,200,0.3)] backdrop-blur-xl">
        <h1 className="text-2xl font-extrabold">회원가입</h1>
        <p className="mt-2 text-sm text-blue-100/70">
          새 계정을 만들고 JeolgamAI를 시작하세요.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-400/60 bg-red-950/60 px-4 py-3 text-sm font-medium text-red-100 shadow-sm"
            >
              {error}
            </div>
          ) : null}

          <label className="block space-y-2 text-sm">
            <span className="text-blue-100/80">이름</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
                patchFieldError("name", validateNameField(event.target.value));
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, name: true }));
                patchFieldError("name", validateNameField(name));
              }}
              className="w-full rounded-xl border border-blue-300/30 bg-[#0a153c] px-4 py-3 outline-none ring-blue-400 transition focus:ring-2"
              placeholder="이름 입력"
            />
            {touched.name && fieldErrors.name ? (
              <p className="text-xs font-medium text-red-300">{fieldErrors.name}</p>
            ) : null}
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-blue-100/80">아이디</span>
            <input
              value={loginId}
              onChange={(event) => {
                setLoginId(event.target.value);
                setError("");
                patchFieldError("loginId", validateLoginIdField(event.target.value));
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, loginId: true }));
                patchFieldError("loginId", validateLoginIdField(loginId));
              }}
              className="w-full rounded-xl border border-blue-300/30 bg-[#0a153c] px-4 py-3 outline-none ring-blue-400 transition focus:ring-2"
              placeholder="아이디 입력"
            />
            {touched.loginId && fieldErrors.loginId ? (
              <p className="text-xs font-medium text-red-300">{fieldErrors.loginId}</p>
            ) : null}
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-blue-100/80">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                const next = event.target.value;
                setPassword(next);
                setError("");
                patchFieldError("password", validatePasswordField(next));
                if (touched.passwordConfirm) {
                  patchFieldError(
                    "passwordConfirm",
                    validatePasswordConfirmField(next, passwordConfirm),
                  );
                }
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, password: true }));
                patchFieldError("password", validatePasswordField(password));
                if (touched.passwordConfirm) {
                  patchFieldError(
                    "passwordConfirm",
                    validatePasswordConfirmField(password, passwordConfirm),
                  );
                }
              }}
              autoComplete="new-password"
              className="w-full rounded-xl border border-blue-300/30 bg-[#0a153c] px-4 py-3 outline-none ring-blue-400 transition focus:ring-2"
              placeholder="8자 이상, 영문·숫자 포함"
            />
            <p className="text-xs text-blue-100/50">
              8자 이상, 영문과 숫자를 모두 포함해야 합니다.
            </p>
            {touched.password && fieldErrors.password ? (
              <p className="text-xs font-medium text-red-300">{fieldErrors.password}</p>
            ) : null}
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-blue-100/80">비밀번호 확인</span>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => {
                const next = event.target.value;
                setPasswordConfirm(next);
                setError("");
                patchFieldError(
                  "passwordConfirm",
                  validatePasswordConfirmField(password, next),
                );
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, passwordConfirm: true }));
                patchFieldError(
                  "passwordConfirm",
                  validatePasswordConfirmField(password, passwordConfirm),
                );
              }}
              autoComplete="new-password"
              className="w-full rounded-xl border border-blue-300/30 bg-[#0a153c] px-4 py-3 outline-none ring-blue-400 transition focus:ring-2"
              placeholder="비밀번호 다시 입력"
            />
            {touched.passwordConfirm && fieldErrors.passwordConfirm ? (
              <p className="text-xs font-medium text-red-300">{fieldErrors.passwordConfirm}</p>
            ) : null}
          </label>

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
