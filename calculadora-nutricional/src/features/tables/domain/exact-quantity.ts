import BigNumber from "bignumber.js";

export function isValidExactQuantity(value: string, approximate: number): boolean {
  if (value.length > 90 || !/^\d+(?:\.\d{1,80})?$/.test(value)) return false;
  const exact = new BigNumber(value);
  return exact.isFinite() && exact.isGreaterThan(0) && exact.isLessThanOrEqualTo(10_000_000)
    && Number(value) === approximate;
}
