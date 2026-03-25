import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  getRequestOrigin,
  getSafeRedirectPath,
} from "@/lib/auth";
import { getBackendBaseUrl } from "@/lib/backend-client";
import {
  clearLoginFailures,
  getLoginRateLimitStatus,
  recordLoginFailure,
} from "@/lib/rate-limit";
import { isDemoAuthEnabled } from "@/lib/runtime-mode";
import {
  addAuditEvent,
  createAuthUser,
  createSession,
  getAuthUserByLoginId,
  getProjectsForUser,
  syncProjectsForUser,
} from "@/lib/store";
import { getBackendJson } from "@/lib/backend-client";
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

  return NextResponse.redirect(new URL(next, getRequestOrigin(request)));
}

interface LoginRequestBody {
  loginId?: string;
  password?: string;
  redirect?: string;
}

interface BackendAuthResponse {
  userId: number;
  loginId: string;
  email: string;
  name: string;
  accessToken: string;
  tokenType: string;
}

interface BackendProject {
  id: string;
  name: string;
  ownerUserId: string;
  awsRegion: string;
  createdAt: string;
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

  let backendUser: BackendAuthResponse;
  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        loginId,
        password,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          isSuccess?: boolean;
          message?: string;
          data?: BackendAuthResponse;
        }
      | null;

    if (!response.ok || !payload?.isSuccess || !payload.data?.accessToken) {
      throw new Error(payload?.message ?? "backend 로그인에 실패했습니다.");
    }

    backendUser = payload.data;
  } catch (error) {
    const throttled = recordLoginFailure(request, loginId);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: throttled.blocked ? "TOO_MANY_ATTEMPTS" : "INVALID_CREDENTIALS",
          message: throttled.blocked
            ? `로그인 시도가 너무 많습니다. ${throttled.retryAfterSec}초 후 다시 시도해주세요.`
            : error instanceof Error
              ? error.message
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

  const existing = getAuthUserByLoginId(loginId);
  const user = createAuthUser({
    userId: existing?.userId ?? `backend_user_${backendUser.userId}`,
    loginId,
    password,
    name: backendUser.name,
    role: existing?.role ?? "company_admin",
    backendUserId: String(backendUser.userId),
    email: backendUser.email,
  });

  let projects = getProjectsForUser(user.userId);
  try {
    const backendProjects = await getBackendJson<BackendProject[]>("/api/projects", {
      accessToken: backendUser.accessToken,
    });
    projects = syncProjectsForUser({
      userId: user.userId,
      role: user.role,
      projects: backendProjects,
    });
  } catch {
    projects = getProjectsForUser(user.userId);
  }

  const session = createSession({
    userId: user.userId,
    name: user.name,
    role: user.role,
    workspaceId: projects[0]?.id,
    backendUserId: String(backendUser.userId),
    backendLoginId: backendUser.loginId,
    backendEmail: backendUser.email,
    backendAccessToken: backendUser.accessToken,
    backendTokenType: backendUser.tokenType,
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

  const response = NextResponse.json({
    ok: true,
    data: {
      token: backendUser.accessToken,
      tokenType: backendUser.tokenType,
      userId: user.userId,
      name: user.name,
      role: user.role,
      workspaceId: session.workspaceId,
      expiresAt: session.expiresAt,
      redirect: next,
      activeProjectId: session.workspaceId,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        awsRegion: project.awsRegion,
      })),
    },
  });

  return attachSessionCookie(response, request, session);
}
