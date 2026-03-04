import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { getSessionByToken } from "@/lib/store";
import { UserRole, UserSession } from "@/lib/types";

export const SESSION_COOKIE_NAME = "jeolgamai_session";

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
  return getSessionByToken(token);
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

export function buildLogoutResponse(redirectTo: string) {
  const response = NextResponse.redirect(new URL(redirectTo, "http://localhost"), 302);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
