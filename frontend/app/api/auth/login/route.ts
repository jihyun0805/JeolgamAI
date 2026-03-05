import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { addAuditEvent, createSession, getAuthUserByLoginId } from "@/lib/store";
import { UserRole } from "@/lib/types";

const ALLOWED_ROLES: UserRole[] = [
  "system_admin",
  "company_admin",
  "company_operator",
];

function getSafeRole(raw: string | null): UserRole {
  if (!raw) return "company_admin";
  if (ALLOWED_ROLES.includes(raw as UserRole)) {
    return raw as UserRole;
  }
  return "company_admin";
}

function setSessionCookie(response: NextResponse, token: string, secure: boolean) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 60 * 60 * 8,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = getSafeRole(url.searchParams.get("role"));
  const next = url.searchParams.get("redirect") || "/dashboard";
  const name = url.searchParams.get("name") || "Admin User";

  const session = createSession({
    userId: `user_${role}`,
    name,
    role,
  });

  addAuditEvent({
    actor: session.userId,
    actorRole: session.role,
    action: "auth.login",
    targetType: "auth",
    targetId: session.token,
    result: "success",
    metadata: {
      redirect: next,
    },
  });

  const response = NextResponse.redirect(new URL(next, url.origin));
  setSessionCookie(response, session.token, url.protocol === "https:");

  return response;
}

interface LoginRequestBody {
  loginId?: string;
  password?: string;
  redirect?: string;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;

  const loginId = body?.loginId?.trim();
  const password = body?.password?.trim();
  const next = body?.redirect?.trim() || "/dashboard";

  if (!loginId || !password) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT", message: "아이디와 비밀번호를 입력해주세요." } },
      { status: 400 },
    );
  }

  const user = getAuthUserByLoginId(loginId);
  if (!user || user.password !== password) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_CREDENTIALS", message: "아이디 또는 비밀번호가 올바르지 않습니다." } },
      { status: 401 },
    );
  }

  const session = createSession({
    userId: user.userId,
    name: user.name,
    role: user.role,
  });

  addAuditEvent({
    actor: session.userId,
    actorRole: session.role,
    action: "auth.login",
    targetType: "auth",
    targetId: session.token,
    result: "success",
    metadata: {
      redirect: next,
    },
  });

  const response = NextResponse.json({ ok: true, data: { redirect: next } });
  setSessionCookie(response, session.token, url.protocol === "https:");
  return response;
}
