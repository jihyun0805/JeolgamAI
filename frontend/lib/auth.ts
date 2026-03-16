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

export function buildLogoutResponse(redirectTo: string) {
  const response = NextResponse.redirect(
    new URL(getSafeRedirectPath(redirectTo, "/"), REDIRECT_BASE_ORIGIN),
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
