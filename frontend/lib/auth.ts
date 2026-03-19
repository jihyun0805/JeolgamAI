import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import {
  getAuthUserById,
  getProjectForUser,
  getProjectsForUser,
} from "@/lib/store";
import { payloadToUserSession, sealUserSession, unsealUserSession } from "@/lib/session-cookie";
import { UserRole, UserSession } from "@/lib/types";

export const SESSION_COOKIE_NAME = "jeolgamai_session";
const REDIRECT_BASE_ORIGIN = "http://localhost";

function normalizeRequestHost(rawHost: string | null, fallbackHost: string) {
  const host = (rawHost ?? fallbackHost).split(",")[0]?.trim() || fallbackHost;
  if (host.startsWith("0.0.0.0")) {
    return host.replace(/^0\.0\.0\.0/, "localhost");
  }
  return host;
}

function parseCookie(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split("=");
    if (rawName === key) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export interface GetSessionResult {
  session: UserSession | null;
  /** workspaceId fallback 적용 시 재발급용 암호화 쿠키 값(이 값으로 쿠키를 갱신하면 다음 요청부터 fallback 반복 없음) */
  sealedCookie?: string;
}

export function getSessionFromRequest(request: Request | NextRequest): GetSessionResult {
  const cookieRaw = parseCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!cookieRaw) return { session: null };

  let payload;
  try {
    payload = unsealUserSession(cookieRaw);
  } catch {
    return { session: null };
  }
  if (!payload) return { session: null };

  if (new Date(payload.expiresAt).getTime() < Date.now()) {
    return { session: null };
  }

  let session = payloadToUserSession(payload);
  const accessibleProjects = getProjectsForUser(session.userId);
  if (accessibleProjects.some((project) => project.id === session.workspaceId)) {
    return { session };
  }

  const user = getAuthUserById(session.userId);
  const fallbackProjectId = user?.defaultProjectId ?? accessibleProjects[0]?.id;
  if (!fallbackProjectId) {
    return { session: null };
  }

  session = { ...session, workspaceId: fallbackProjectId };
  return { session, sealedCookie: sealUserSession(session) };
}

/** 프로젝트 전환 시 동일 사용자·토큰으로 workspaceId만 바꾼 새 세션 객체를 만듭니다. */
export function selectSessionWorkspace(session: UserSession, workspaceId: string): UserSession | null {
  if (!getProjectForUser(session.userId, workspaceId)) {
    return null;
  }
  return { ...session, workspaceId };
}

export function requireSession(request: Request | NextRequest) {
  const { session } = getSessionFromRequest(request);

  if (!session) {
    return {
      ok: false as const,
      response: fail("UNAUTHORIZED", "로그인이 필요합니다.", 401),
    };
  }

  return {
    ok: true as const,
    session,
  };
}

export function requireRole(request: Request | NextRequest, allowedRoles: UserRole[]) {
  const auth = requireSession(request);
  if (!auth.ok) return auth;

  if (!allowedRoles.includes(auth.session.role)) {
    return {
      ok: false as const,
      response: fail("FORBIDDEN", "권한이 없습니다.", 403),
      session: auth.session,
    };
  }

  return auth;
}

export function requireBackendSession(request: Request | NextRequest) {
  const auth = requireSession(request);
  if (!auth.ok) return auth;

  if (!auth.session.backendAccessToken) {
    return {
      ok: false as const,
      response: fail("BACKEND_SESSION_MISSING", "백엔드 인증 세션이 없습니다. 다시 로그인해주세요.", 401),
      session: auth.session,
    };
  }

  return auth;
}

export function requireBackendRole(request: Request | NextRequest, allowedRoles: UserRole[]) {
  const auth = requireRole(request, allowedRoles);
  if (!auth.ok) return auth;

  if (!auth.session.backendAccessToken) {
    return {
      ok: false as const,
      response: fail("BACKEND_SESSION_MISSING", "백엔드 인증 세션이 없습니다. 다시 로그인해주세요.", 401),
      session: auth.session,
    };
  }

  return auth;
}

export function getSafeRedirectPath(
  rawRedirect: string | null | undefined,
  fallback = "/",
): string {
  if (!rawRedirect) return fallback;

  try {
    const url = new URL(rawRedirect, REDIRECT_BASE_ORIGIN);
    if (url.origin !== REDIRECT_BASE_ORIGIN) {
      return fallback;
    }

    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!path.startsWith("/") || path.startsWith("//")) {
      return fallback;
    }

    return path;
  } catch {
    return fallback;
  }
}

export function getRequestOrigin(request: Request | NextRequest) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");

  const protocol = forwardedProto ?? url.protocol.replace(/:$/, "");
  const fallbackHost =
    url.hostname === "0.0.0.0" ? `localhost${url.port ? `:${url.port}` : ""}` : url.host;
  const host = normalizeRequestHost(forwardedHost ?? hostHeader, fallbackHost);

  return `${protocol}://${host}`;
}

export function setEncryptedSessionCookie(
  response: NextResponse,
  session: UserSession,
  secure: boolean,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sealUserSession(session),
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: 60 * 60 * 8,
  });
}

/** 이미 암호화된 쿠키 값으로 세션 쿠키를 설정(workspaceId fallback 재발급용). */
export function setSessionCookieFromSealed(
  response: NextResponse,
  sealedValue: string,
  secure: boolean,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sealedValue,
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: 60 * 60 * 8,
  });
}

export function buildLogoutResponse(request: Request | NextRequest, redirectTo: string) {
  const response = NextResponse.redirect(
    new URL(getSafeRedirectPath(redirectTo, "/"), getRequestOrigin(request)),
    302,
  );
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "strict",
  });
  return response;
}
