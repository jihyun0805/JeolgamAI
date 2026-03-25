import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import {
  getAuthUserById,
  getProjectForUser,
  getProjectsForUser,
} from "@/lib/store";
import {
  payloadToUserSession,
  sealUserSession,
  unsealUserSession,
} from "@/lib/session-cookie";
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

const ALLOWED_ROLES: UserRole[] = ["system_admin", "company_admin", "company_operator"];

function parseSafeRole(raw: string | null): UserRole {
  if (raw && ALLOWED_ROLES.includes(raw as UserRole)) return raw as UserRole;
  return "company_admin";
}

export interface GetSessionResult {
  session: UserSession | null;
  sealedCookie?: string;
}

function getRequestHeader(
  request: Request | NextRequest,
  name: string,
): string | null {
  return request.headers.get(name);
}

function getCookieValue(
  request: Request | NextRequest,
  cookieName: string,
): string | null {
  const cookieHeader = getRequestHeader(request, "cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === cookieName) {
      return valueParts.join("=") || null;
    }
  }

  return null;
}

function resolveWorkspaceForUser(userId: string, workspaceId: string): string | null {
  const accessibleProjects = getProjectsForUser(userId);
  if (accessibleProjects.some((p) => p.id === workspaceId)) {
    return workspaceId;
  }

  const user = getAuthUserById(userId);
  return user?.defaultProjectId ?? accessibleProjects[0]?.id ?? null;
}

function resolveWorkspaceForSession(params: {
  userId: string;
  workspaceId: string;
  backendAccessToken?: string;
}): string | null {
  if (params.backendAccessToken) {
    return params.workspaceId;
  }

  return resolveWorkspaceForUser(params.userId, params.workspaceId);
}

function isSessionExpired(expiresAt: string | undefined): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

function buildSessionFromHeaders(
  request: Request | NextRequest,
): GetSessionResult {
  const authHeader = getRequestHeader(request, "authorization");
  if (!authHeader?.startsWith("Bearer ")) return { session: null };

  const token = authHeader.slice(7);
  const userId = getRequestHeader(request, "x-user-id");
  const workspaceId = getRequestHeader(request, "x-workspace-id");
  const expiresAt = getRequestHeader(request, "x-expires-at");

  if (!token || !userId || !workspaceId || isSessionExpired(expiresAt ?? undefined)) {
    return { session: null };
  }

  const resolvedWorkspaceId = resolveWorkspaceForSession({
    userId,
    workspaceId,
    backendAccessToken: token,
  });
  if (!resolvedWorkspaceId) {
    return { session: null };
  }

  const session: UserSession = {
    token: userId,
    userId,
    name: decodeURIComponent(getRequestHeader(request, "x-user-name") ?? ""),
    role: parseSafeRole(getRequestHeader(request, "x-user-role")),
    workspaceId: resolvedWorkspaceId,
    backendAccessToken: token,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt ?? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };

  return { session };
}

function buildSessionFromCookie(
  request: Request | NextRequest,
): GetSessionResult {
  const sealedCookie = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!sealedCookie) return { session: null };

  const payload = unsealUserSession(sealedCookie);
  if (!payload || isSessionExpired(payload.expiresAt)) {
    return { session: null };
  }

  const resolvedWorkspaceId = resolveWorkspaceForSession({
    userId: payload.userId,
    workspaceId: payload.workspaceId,
    backendAccessToken: payload.backendAccessToken,
  });
  if (!resolvedWorkspaceId) {
    return { session: null };
  }

  const session = payloadToUserSession({
    ...payload,
    workspaceId: resolvedWorkspaceId,
  });

  return { session, sealedCookie };
}

export function getSessionFromRequest(request: Request | NextRequest): GetSessionResult {
  const headerSession = buildSessionFromHeaders(request);
  if (headerSession.session) {
    return headerSession;
  }

  return buildSessionFromCookie(request);
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

export function buildLogoutResponse(request: Request | NextRequest, redirectTo: string) {
  return NextResponse.redirect(
    new URL(getSafeRedirectPath(redirectTo, "/"), getRequestOrigin(request)),
    302,
  );
}

function shouldUseSecureCookies(request: Request | NextRequest) {
  const forwardedProto = getRequestHeader(request, "x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export function attachSessionCookie(
  response: NextResponse,
  request: Request | NextRequest,
  session: UserSession,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sealUserSession(session),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    expires: new Date(session.expiresAt),
  });

  return response;
}

export function clearSessionCookie(
  response: NextResponse,
  request: Request | NextRequest,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    expires: new Date(0),
  });

  return response;
}
