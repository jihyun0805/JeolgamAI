import {
  buildLogoutResponse,
  clearSessionCookie,
  getSafeRedirectPath,
} from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getSafeRedirectPath(url.searchParams.get("redirect"), "/");
  const response = buildLogoutResponse(request, next);
  return clearSessionCookie(response, request);
}
