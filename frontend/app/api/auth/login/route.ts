import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { addAuditEvent, createSession } from "@/lib/store";
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
  const role = getSafeRole(url.searchParams.get("role"));
  const next = url.searchParams.get("redirect") || "/dashboard";
  const name = url.searchParams.get("name") || "Admin User";

  const session = createSession({
    userId: `user_${role}`,
    name,
    role,
  });

  addAuditEvent({
    actor: session.userId,
    actorRole: session.role,
    action: "auth.login",
    targetType: "auth",
    targetId: session.token,
    result: "success",
    metadata: {
      redirect: next,
    },
  });

  const response = NextResponse.redirect(new URL(next, url.origin));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.token,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
