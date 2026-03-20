import { NextResponse } from "next/server";
import { getRequestOrigin, getSafeRedirectPath } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getSafeRedirectPath(url.searchParams.get("redirect"), "/");
  return NextResponse.redirect(new URL(next, getRequestOrigin(request)));
}
