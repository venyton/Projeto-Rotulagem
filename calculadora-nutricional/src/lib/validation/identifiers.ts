import { z } from "zod";

/**
 * IDs persistidos pelo Prisma usam CUID. Mantemos uma validação distinta para
 * IDs de recursos externos ou snapshots, que também fazem parte dos payloads
 * legítimos da tabela (por exemplo, off-12345678 e snapshot-...).
 */
export const databaseIdSchema = z.string().cuid();

export const safeResourceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
export const barcodeSchema = z.string().regex(/^\d{8,14}$/);
export const passwordResetTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const totpCodeSchema = z.string().regex(/^\d{6}$/);

export function isDatabaseId(value: unknown): value is string {
  return typeof value === "string" && databaseIdSchema.safeParse(value).success;
}

export function isSafeResourceId(value: unknown): value is string {
  return typeof value === "string" && safeResourceIdSchema.safeParse(value).success;
}
