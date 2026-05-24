type LoginAttempt = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const globalForRateLimit = globalThis as typeof globalThis & {
  loginAttempts?: Map<string, LoginAttempt>;
};

const loginAttempts = globalForRateLimit.loginAttempts ?? new Map<string, LoginAttempt>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.loginAttempts = loginAttempts;
}

function getAttempt(key: string, now = Date.now()) {
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    loginAttempts.set(key, fresh);
    return fresh;
  }
  return attempt;
}

export function getLoginRateLimitKey(email: string) {
  return email.trim().toLowerCase();
}

export function isLoginRateLimited(key: string) {
  return getAttempt(key).count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(key: string) {
  const attempt = getAttempt(key);
  attempt.count += 1;
  loginAttempts.set(key, attempt);
}

export function clearLoginFailures(key: string) {
  loginAttempts.delete(key);
}
