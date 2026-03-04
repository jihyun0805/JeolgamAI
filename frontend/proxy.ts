import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "jeolgamai_session";

const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/analysis",
  "/reports",
  "/execution-guide",
  "/integrations",
  "/chat",
  "/admin",
];

function isMockMode(): boolean {
  const value = process.env.MOCK_DATA_MODE?.trim().toLowerCase();
  if (!value) return true;
  return ["1", "true", "yes", "on"].includes(value);
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isMockMode() && !pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (isProtectedPath(pathname)) {
    const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!hasSessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analysis/:path*",
    "/reports/:path*",
    "/execution-guide/:path*",
    "/integrations/:path*",
    "/chat/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
