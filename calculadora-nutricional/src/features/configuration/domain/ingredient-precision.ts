import { decimalText } from "../../tables/domain/decimal-display";

export const INGREDIENT_QUANTITY_PRECISION_KEY = "business.ingredients.quantity_decimal_places";
export const DEFAULT_INGREDIENT_QUANTITY_PRECISION = 15;
export const MAX_INGREDIENT_QUANTITY_PRECISION = 15;

export function isValidIngredientPrecision(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_INGREDIENT_QUANTITY_PRECISION;
}

export function fitsIngredientPrecision(value: number, precision: number): boolean {
  if (!Number.isFinite(value) || !isValidIngredientPrecision(precision)) return false;
  const fraction = decimalText(value).split(".")[1] ?? "";
  return fraction.replace(/0+$/, "").length <= precision;
}
