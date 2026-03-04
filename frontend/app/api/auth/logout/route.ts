import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getSessionFromRequest } from "@/lib/auth";
import { addAuditEvent, removeSessionByToken } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("redirect") || "/";
  const session = getSessionFromRequest(request);

  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split("=")[1];

  if (token) {
    removeSessionByToken(decodeURIComponent(token));
  }

  if (session) {
    addAuditEvent({
      actor: session.userId,
      actorRole: session.role,
      action: "auth.logout",
      targetType: "auth",
      targetId: session.token,
      result: "success",
    });
  }

  const response = NextResponse.redirect(new URL(next, url.origin));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
  });

  return response;
}
