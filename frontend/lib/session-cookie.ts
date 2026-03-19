import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { UserRole, UserSession } from "@/lib/types";

const VERSION_PREFIX = "v1.";
const ALGO = "aes-256-gcm";
/** AES-GCM 권장 IV 길이 96비트(12바이트) */
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/** Fields persisted inside the encrypted session cookie (no server-side session store). */
export interface SessionCookiePayload {
  sessionId?: string;
  userId: string;
  name: string;
  role: UserRole;
  workspaceId: string;
  backendAccessToken?: string;
  backendUserId?: string;
  backendLoginId?: string;
  backendEmail?: string;
  backendTokenType?: string;
  createdAt: string;
  expiresAt: string;
}

function getSessionSecretKey(): Buffer {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return createHash("sha256").update(secret).digest();
  }
  if (process.env.NODE_ENV === "development") {
    return createHash("sha256").update("dev-only-jeolgamai-session-secret-min-16-chars").digest();
  }
  throw new Error(
    "SESSION_SECRET 환경 변수를 설정하세요. (프로덕션 필수, 최소 16자 이상 권장)",
  );
}

export function sealUserSession(session: UserSession): string {
  const payload: SessionCookiePayload = {
    sessionId: session.token,
    userId: session.userId,
    name: session.name,
    role: session.role,
    workspaceId: session.workspaceId,
    backendAccessToken: session.backendAccessToken,
    backendUserId: session.backendUserId,
    backendLoginId: session.backendLoginId,
    backendEmail: session.backendEmail,
    backendTokenType: session.backendTokenType,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getSessionSecretKey(), iv);
  const json = JSON.stringify(payload);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, enc]);
  return `${VERSION_PREFIX}${combined.toString("base64url")}`;
}

export function unsealUserSession(cookieValue: string): SessionCookiePayload | null {
  if (!cookieValue || !cookieValue.startsWith(VERSION_PREFIX)) {
    return null;
  }

  try {
    const raw = Buffer.from(cookieValue.slice(VERSION_PREFIX.length), "base64url");
    if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) return null;

    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const enc = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGO, getSessionSecretKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(json) as SessionCookiePayload;

    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.workspaceId !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function payloadToUserSession(payload: SessionCookiePayload): UserSession {
  return {
    token: payload.sessionId ?? "stateless",
    userId: payload.userId,
    name: payload.name,
    role: payload.role,
    workspaceId: payload.workspaceId,
    backendUserId: payload.backendUserId,
    backendLoginId: payload.backendLoginId,
    backendEmail: payload.backendEmail,
    backendAccessToken: payload.backendAccessToken,
    backendTokenType: payload.backendTokenType,
    createdAt: payload.createdAt,
    expiresAt: payload.expiresAt,
  };
}
