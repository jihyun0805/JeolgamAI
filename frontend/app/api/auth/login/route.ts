import { NextResponse } from "next/server";
import { getSafeRedirectPath, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  clearLoginFailures,
  getLoginRateLimitStatus,
  recordLoginFailure,
} from "@/lib/rate-limit";
import { isDemoAuthEnabled } from "@/lib/runtime-mode";
import { verifyPassword } from "@/lib/security";
import {
  addAuditEvent,
  createAuthUser,
  createSession,
  getAuthUserByLoginId,
  getProjectsForUser,
} from "@/lib/store";
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
    sameSite: "strict",
    secure,
    maxAge: 60 * 60 * 8,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isDemoAuthEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DEMO_AUTH_DISABLED",
          message: "데모 자동 로그인은 비활성화되어 있습니다.",
        },
      },
      { status: 403 },
    );
  }

  const role = getSafeRole(url.searchParams.get("role"));
  const next = getSafeRedirectPath(url.searchParams.get("redirect"), "/dashboard");
  const name = url.searchParams.get("name") || "Admin User";

  const loginId = `demo_${role}`;
  const user =
    getAuthUserByLoginId(loginId) ??
    createAuthUser({
      loginId,
      password: `demo_${role}_password`,
      name,
      role,
    });

  const session = createSession({
    userId: user.userId,
    name: user.name,
    role: user.role,
  });

  addAuditEvent({
    actor: session.userId,
    actorRole: session.role,
    workspaceId: session.workspaceId,
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
  const next = getSafeRedirectPath(body?.redirect?.trim(), "/dashboard");

  if (!loginId || !password) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT", message: "아이디와 비밀번호를 입력해주세요." } },
      { status: 400 },
    );
  }

  const rateLimit = getLoginRateLimitStatus(request, loginId);
  if (rateLimit.blocked) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: `로그인 시도가 너무 많습니다. ${rateLimit.retryAfterSec}초 후 다시 시도해주세요.`,
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSec),
        },
      },
    );
  }

  const user = getAuthUserByLoginId(loginId);
  if (
    !user ||
    !verifyPassword({
      password,
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
    })
  ) {
    const throttled = recordLoginFailure(request, loginId);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: throttled.blocked ? "TOO_MANY_ATTEMPTS" : "INVALID_CREDENTIALS",
          message: throttled.blocked
            ? `로그인 시도가 너무 많습니다. ${throttled.retryAfterSec}초 후 다시 시도해주세요.`
            : "아이디 또는 비밀번호가 올바르지 않습니다.",
        },
      },
      {
        status: throttled.blocked ? 429 : 401,
        headers: throttled.blocked
          ? {
              "Retry-After": String(throttled.retryAfterSec),
            }
          : undefined,
      },
    );
  }

  clearLoginFailures(request, loginId);

  const session = createSession({
    userId: user.userId,
    name: user.name,
    role: user.role,
  });

  addAuditEvent({
    actor: session.userId,
    actorRole: session.role,
    workspaceId: session.workspaceId,
    action: "auth.login",
    targetType: "auth",
    targetId: session.token,
    result: "success",
    metadata: {
      redirect: next,
    },
  });

  const projects = getProjectsForUser(user.userId);
  const response = NextResponse.json({
    ok: true,
    data: {
      redirect: next,
      activeProjectId: session.workspaceId,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        awsRegion: project.awsRegion,
      })),
    },
  });
  setSessionCookie(response, session.token, url.protocol === "https:");
  return response;
}
