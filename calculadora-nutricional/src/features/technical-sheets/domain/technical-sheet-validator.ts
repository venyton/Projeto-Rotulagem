import { REQUIRED_NUTRIENT_KEYS } from "./technical-sheet-schema";
import { parseNumberish } from "./technical-sheet-normalizer";
import type { EditableTechnicalSheetValues } from "./technical-sheet-types";

const REQUIRED_APPROVAL_FIELDS = [
  "energy",
  "carbs",
  "protein",
  "fatTotal",
  "fatSat",
  "fatTrans",
  "fiber",
  "sodium",
] as const;

export function parseApprovalFormData(formData: FormData): EditableTechnicalSheetValues {
  return {
    productName: stringValue(formData, "productName"),
    energy: numberValue(formData, "energy"),
    carbs: numberValue(formData, "carbs"),
    sugarTotal: numberValue(formData, "sugarTotal"),
    sugarAdded: numberValue(formData, "sugarAdded"),
    protein: numberValue(formData, "protein"),
    fatTotal: numberValue(formData, "fatTotal"),
    fatSat: numberValue(formData, "fatSat"),
    fatTrans: numberValue(formData, "fatTrans"),
    fiber: numberValue(formData, "fiber"),
    sodium: numberValue(formData, "sodium"),
    containsGluten: nullableBooleanValue(formData, "containsGluten"),
    ingredientsText: nullableStringValue(formData, "ingredientsText"),
    allergensText: nullableStringValue(formData, "allergensText"),
  };
}

export function validateApprovalValues(values: EditableTechnicalSheetValues) {
  if (!values.productName.trim()) {
    return "Nome do produto é obrigatório.";
  }

  for (const field of REQUIRED_APPROVAL_FIELDS) {
    if (!Number.isFinite(values[field])) {
      return `Campo nutricional obrigatório inválido: ${field}.`;
    }
  }

  return null;
}

export function missingRequiredNutrients(values: Record<string, number | null | undefined>) {
  return REQUIRED_NUTRIENT_KEYS.filter((key) => {
    if (key === "sugarTotal" || key === "sugarAdded") return false;
    return typeof values[key] !== "number" || !Number.isFinite(values[key]);
  });
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableStringValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value.length > 0 ? value : null;
}

function numberValue(formData: FormData, key: string) {
  const parsed = parseNumberish(formData.get(key));
  if (parsed === null) return Number.NaN;
  return parsed;
}

function nullableBooleanValue(formData: FormData, key: string) {
  const value = formData.get(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
