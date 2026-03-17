import { NextResponse } from "next/server";
import {
  getRequestOrigin,
  getSafeRedirectPath,
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { addAuditEvent, removeSessionByToken } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getSafeRedirectPath(url.searchParams.get("redirect"), "/");
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
      workspaceId: session.workspaceId,
      action: "auth.logout",
      targetType: "auth",
      targetId: session.token,
      result: "success",
    });
  }

  const response = NextResponse.redirect(new URL(next, getRequestOrigin(request)));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "strict",
    secure: url.protocol === "https:",
  });

  return response;
}
