import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  consumePersistentRateLimit,
  type PersistentRateLimitOptions,
  type PersistentRateLimitResult,
} from "@/lib/security/persistent-rate-limit";

const DEFAULT_LIMITS = {
  openFoodFactsSearch: { maxAttempts: 8, windowMs: 60_000 },
  openFoodFactsProduct: { maxAttempts: 12, windowMs: 60_000 },
  openFoodFactsUser: { maxAttempts: 30, windowMs: 60_000 },
  exports: { maxAttempts: 5, windowMs: 60_000 },
  tableWrites: { maxAttempts: 30, windowMs: 60_000 },
  ingredientWrites: { maxAttempts: 30, windowMs: 60_000 },
  ingredientSearch: { maxAttempts: 120, windowMs: 60_000 },
  technicalSheetReviews: { maxAttempts: 30, windowMs: 60_000 },
  workspaceWrites: { maxAttempts: 20, windowMs: 60_000 },
  apiTables: { maxAttempts: 60, windowMs: 60_000 },
  geminiProject: { maxAttempts: 5, windowMs: 60_000 },
  geminiUser: { maxAttempts: 50, windowMs: 60 * 60 * 1000 },
  loginIp: { maxAttempts: 30, windowMs: 15 * 60 * 1000 },
  registrationGlobal: { maxAttempts: 100, windowMs: 60 * 60 * 1000 },
  passwordResetGlobal: { maxAttempts: 60, windowMs: 60 * 60 * 1000 },
  readiness: { maxAttempts: 60, windowMs: 60_000 },
} as const;

export type RequestRateLimitPolicy = PersistentRateLimitOptions;

function readConfiguredLimit(name: string, fallback: number, maximum: number) {
  const raw = Number(process.env[name]);
  return Number.isInteger(raw) && raw > 0 ? Math.min(raw, maximum) : fallback;
}

export function getRequestRateLimit(name: keyof typeof DEFAULT_LIMITS): RequestRateLimitPolicy {
  const defaults = DEFAULT_LIMITS[name];
  const envName = `REQUEST_LIMIT_${name.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`;

  return {
    maxAttempts: readConfiguredLimit(`${envName}_PER_WINDOW`, defaults.maxAttempts, 1_000_000),
    windowMs: defaults.windowMs,
  };
}

type HeaderBag = Headers | Record<string, unknown> | undefined;

function readHeader(headers: HeaderBag, name: string) {
  if (!headers) return "";
  if (headers instanceof Headers) return headers.get(name) || "";
  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === "string" ? value : "";
}

export function getClientAddress(request: Pick<NextRequest, "headers"> | { headers?: HeaderBag }) {
  const forwarded = readHeader(request.headers, "x-forwarded-for").split(",", 1)[0]?.trim();
  return forwarded || readHeader(request.headers, "x-real-ip").trim() || "unknown";
}

export function consumeRequestRateLimit(
  scope: string,
  key: string,
  policy: RequestRateLimitPolicy,
) {
  return consumePersistentRateLimit(`request.${scope}`, key, policy);
}

export function rateLimitHeaders(result: PersistentRateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
  };
}

export function rateLimitResponse(
  result: PersistentRateLimitResult,
  body: Record<string, unknown> = { error: "Muitas requisições. Tente novamente mais tarde." },
  additionalHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status: 429,
    headers: {
      ...additionalHeaders,
      ...rateLimitHeaders(result),
      "Retry-After": String(result.retryAfterSeconds),
      "Cache-Control": "no-store",
    },
  });
}
