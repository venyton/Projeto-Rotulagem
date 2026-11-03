/** Normalize historical microgram spellings without changing the measured quantity. */
export function normalizeMicrogramSymbol(unit: string): string {
  const trimmed = unit.trim();
  return /^(?:µg|μg|ug|mcg|microgramas?)$/i.test(trimmed) ? "µg" : trimmed;
}
