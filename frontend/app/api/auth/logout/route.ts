import { NextResponse } from "next/server";
import {
  getRequestOrigin,
  getSafeRedirectPath,
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { addAuditEvent } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getSafeRedirectPath(url.searchParams.get("redirect"), "/");
  const { session } = getSessionFromRequest(request);

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
