interface LoginAttemptBucket {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
}

const RATE_LIMIT_STORE_KEY = "__JEOLGAMAI_RATE_LIMIT__";
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

function getRateLimitStore(): Map<string, LoginAttemptBucket> {
  const globalScope = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: Map<string, LoginAttemptBucket>;
  };

  if (!globalScope[RATE_LIMIT_STORE_KEY]) {
    globalScope[RATE_LIMIT_STORE_KEY] = new Map<string, LoginAttemptBucket>();
  }

  return globalScope[RATE_LIMIT_STORE_KEY];
}

function getClientAddress(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstAddress = forwardedFor.split(",")[0]?.trim();
    if (firstAddress) return firstAddress;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase();
}

function createLoginRateLimitKey(request: Request, loginId: string): string {
  return `${normalizeKeyPart(loginId)}:${normalizeKeyPart(getClientAddress(request))}`;
}

function cleanupExpiredBuckets(now: number): void {
  const store = getRateLimitStore();
  for (const [key, bucket] of store.entries()) {
    if (bucket.blockedUntil > now) continue;
    if (now - bucket.windowStartedAt < LOGIN_WINDOW_MS) continue;
    store.delete(key);
  }
}

function getActiveBucket(key: string, now: number): LoginAttemptBucket | null {
  const store = getRateLimitStore();
  const bucket = store.get(key) ?? null;
  if (!bucket) return null;

  if (bucket.blockedUntil > now) {
    return bucket;
  }

  if (now - bucket.windowStartedAt >= LOGIN_WINDOW_MS) {
    store.delete(key);
    return null;
  }

  return bucket;
}

export function getLoginRateLimitStatus(
  request: Request,
  loginId: string,
): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const key = createLoginRateLimitKey(request, loginId);
  const bucket = getActiveBucket(key, now);
  if (!bucket || bucket.blockedUntil <= now) {
    return { blocked: false, retryAfterSec: 0 };
  }

  return {
    blocked: true,
    retryAfterSec: Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000)),
  };
}

export function recordLoginFailure(
  request: Request,
  loginId: string,
): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const store = getRateLimitStore();
  const key = createLoginRateLimitKey(request, loginId);
  const bucket = getActiveBucket(key, now);

  if (bucket && bucket.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSec: Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000)),
    };
  }

  const nextBucket: LoginAttemptBucket = bucket
    ? {
        ...bucket,
        count: bucket.count + 1,
      }
    : {
        count: 1,
        windowStartedAt: now,
        blockedUntil: 0,
      };

  if (nextBucket.count >= LOGIN_MAX_FAILURES) {
    nextBucket.blockedUntil = now + LOGIN_WINDOW_MS;
  }

  store.set(key, nextBucket);

  return {
    blocked: nextBucket.blockedUntil > now,
    retryAfterSec:
      nextBucket.blockedUntil > now
        ? Math.max(1, Math.ceil((nextBucket.blockedUntil - now) / 1000))
        : 0,
  };
}

export function clearLoginFailures(request: Request, loginId: string): void {
  const store = getRateLimitStore();
  const key = createLoginRateLimitKey(request, loginId);
  store.delete(key);
}
