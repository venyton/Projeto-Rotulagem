import { z } from "zod";

/**
 * E-mail é normalizado uma única vez e validado no servidor. A interface pode
 * usar type="email" para UX, mas não é a fronteira de segurança.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email())
  .pipe(z.string().max(254));

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(value: unknown): value is string {
  return emailSchema.safeParse(value).success;
}

export function parseEmail(value: unknown) {
  const parsed = emailSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
