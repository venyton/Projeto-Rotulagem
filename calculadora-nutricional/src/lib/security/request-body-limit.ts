const VERCEL_SAFE_BODY_LIMIT_MB = 4;

function readPositiveMb(name: string) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 1 && raw <= 100 ? raw : null;
}

/**
 * Returns the application payload budget, respecting the hosting platform's
 * hard limit when Vercel is detected. The margin below Vercel's 4.5 MB limit
 * leaves room for request framing and multipart/FormData overhead.
 */
export function getRuntimeRequestBodyLimitMb(fallbackMb: number) {
  const configured = readPositiveMb("MAX_RUNTIME_REQUEST_BODY_MB") ?? fallbackMb;
  return process.env.VERCEL ? Math.min(configured, VERCEL_SAFE_BODY_LIMIT_MB) : configured;
}

export function getRuntimeRequestBodyLimitBytes(fallbackMb: number) {
  return getRuntimeRequestBodyLimitMb(fallbackMb) * 1024 * 1024;
}

export const getRuntimeResponseBodyLimitBytes = getRuntimeRequestBodyLimitBytes;
