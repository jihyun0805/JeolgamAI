import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import {
  getAuthUserById,
  getProjectsForUser,
  getSessionByToken,
  setSessionWorkspace,
} from "@/lib/store";
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

export function getSessionFromRequest(request: Request | NextRequest): UserSession | null {
  const token = parseCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token) return null;
  const session = getSessionByToken(token);
  if (!session) return null;

  const accessibleProjects = getProjectsForUser(session.userId);
  if (accessibleProjects.some((project) => project.id === session.workspaceId)) {
    return session;
  }

  const user = getAuthUserById(session.userId);
  const fallbackProjectId = user?.defaultProjectId ?? accessibleProjects[0]?.id;
  if (!fallbackProjectId) {
    return null;
  }

  return setSessionWorkspace(token, fallbackProjectId) ?? null;
}

export function requireSession(request: Request | NextRequest) {
  const session = getSessionFromRequest(request);

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
