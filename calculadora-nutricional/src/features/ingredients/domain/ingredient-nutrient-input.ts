export type OptionalNutrientNumber =
  | { ok: true; value: number | null }
  | { ok: false };

export function parseOptionalNutrientNumber(value: unknown): OptionalNutrientNumber {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: true, value: null };
  }

  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000) {
    return { ok: false };
  }

  return { ok: true, value: parsed };
}
