export const REQUIRED_NUTRIENT_KEYS = [
  "energy",
  "carbs",
  "sugarTotal",
  "sugarAdded",
  "protein",
  "fatTotal",
  "fatSat",
  "fatTrans",
  "fiber",
  "sodium",
] as const;

export const ANNEX_II_OPTIONAL_NUTRIENT_KEYS = [
  "fatMono",
  "fatPoly",
  "omega6",
  "omega3",
  "cholesterol",
  "vitaminA",
  "vitaminD",
  "vitaminE",
  "vitaminK",
  "vitaminC",
  "thiamin",
  "riboflavin",
  "niacin",
  "vitaminB6",
  "biotin",
  "folicAcid",
  "pantothenicAcid",
  "vitaminB12",
  "calcium",
  "chloride",
  "copper",
  "chromium",
  "iron",
  "fluoride",
  "phosphorus",
  "iodine",
  "magnesium",
  "manganese",
  "molybdenum",
  "potassium",
  "selenium",
  "zinc",
  "choline",
] as const;

export const TECHNICAL_EXTRA_NUTRIENT_KEYS = ["lactose", "moisture", "ash"] as const;
export const OTHER_NUTRIENT_KEY = "other";
export const OTHER_NUTRIENT_KEYS = [OTHER_NUTRIENT_KEY] as const;

export const ADDITIONAL_NUTRIENT_KEYS = [
  ...ANNEX_II_OPTIONAL_NUTRIENT_KEYS,
  ...TECHNICAL_EXTRA_NUTRIENT_KEYS,
  ...OTHER_NUTRIENT_KEYS,
] as const;

export const NUTRIENT_KEYS = [
  ...REQUIRED_NUTRIENT_KEYS,
  ...ADDITIONAL_NUTRIENT_KEYS,
] as const;

export type RequiredNutrientKey = (typeof REQUIRED_NUTRIENT_KEYS)[number];
export type AnnexIiOptionalNutrientKey = (typeof ANNEX_II_OPTIONAL_NUTRIENT_KEYS)[number];
export type TechnicalSheetNutrientKey = (typeof NUTRIENT_KEYS)[number];

export type TechnicalSheetNutrientField = {
  key: TechnicalSheetNutrientKey;
  label: string;
  unit: string;
  required?: boolean;
};

export const MAIN_NUTRIENT_FIELDS = [
  { key: "energy", label: "Valor energético", unit: "kcal", required: true },
  { key: "carbs", label: "Carboidratos", unit: "g", required: true },
  { key: "sugarTotal", label: "Açúcares totais", unit: "g" },
  { key: "sugarAdded", label: "Açúcares adicionados", unit: "g" },
  { key: "protein", label: "Proteínas", unit: "g", required: true },
  { key: "fatTotal", label: "Gorduras totais", unit: "g", required: true },
  { key: "fatSat", label: "Gorduras saturadas", unit: "g", required: true },
  { key: "fatTrans", label: "Gorduras trans", unit: "g", required: true },
  { key: "fiber", label: "Fibras alimentares", unit: "g", required: true },
  { key: "sodium", label: "Sódio", unit: "mg", required: true },
] as const satisfies readonly TechnicalSheetNutrientField[];

export const ANNEX_II_OPTIONAL_NUTRIENT_FIELDS = [
  { key: "fatMono", label: "Gorduras monoinsaturadas", unit: "g" },
  { key: "fatPoly", label: "Gorduras poli-insaturadas", unit: "g" },
  { key: "omega6", label: "Ômega 6", unit: "g" },
  { key: "omega3", label: "Ômega 3", unit: "mg" },
  { key: "cholesterol", label: "Colesterol", unit: "mg" },
  { key: "vitaminA", label: "Vitamina A", unit: "mcg RAE" },
  { key: "vitaminD", label: "Vitamina D", unit: "mcg" },
  { key: "vitaminE", label: "Vitamina E", unit: "mg" },
  { key: "vitaminK", label: "Vitamina K", unit: "mcg" },
  { key: "vitaminC", label: "Vitamina C", unit: "mg" },
  { key: "thiamin", label: "Tiamina", unit: "mg" },
  { key: "riboflavin", label: "Riboflavina", unit: "mg" },
  { key: "niacin", label: "Niacina", unit: "mg NE" },
  { key: "vitaminB6", label: "Vitamina B6", unit: "mg" },
  { key: "biotin", label: "Biotina", unit: "mcg" },
  { key: "folicAcid", label: "Ácido fólico", unit: "mcg DFE" },
  { key: "pantothenicAcid", label: "Ácido pantotênico", unit: "mg" },
  { key: "vitaminB12", label: "Vitamina B12", unit: "mcg" },
  { key: "calcium", label: "Cálcio", unit: "mg" },
  { key: "chloride", label: "Cloreto", unit: "mg" },
  { key: "copper", label: "Cobre", unit: "mcg" },
  { key: "chromium", label: "Cromo", unit: "mcg" },
  { key: "iron", label: "Ferro", unit: "mg" },
  { key: "fluoride", label: "Flúor", unit: "mg" },
  { key: "phosphorus", label: "Fósforo", unit: "mg" },
  { key: "iodine", label: "Iodo", unit: "mcg" },
  { key: "magnesium", label: "Magnésio", unit: "mg" },
  { key: "manganese", label: "Manganês", unit: "mg" },
  { key: "molybdenum", label: "Molibdênio", unit: "mcg" },
  { key: "potassium", label: "Potássio", unit: "mg" },
  { key: "selenium", label: "Selênio", unit: "mcg" },
  { key: "zinc", label: "Zinco", unit: "mg" },
  { key: "choline", label: "Colina", unit: "mg" },
] as const satisfies readonly TechnicalSheetNutrientField[];

export const EDITABLE_NUTRIENT_FIELDS = [
  ...MAIN_NUTRIENT_FIELDS,
  ...ANNEX_II_OPTIONAL_NUTRIENT_FIELDS,
] as const;

export const EDITABLE_NUTRIENT_LABELS: Record<
  (typeof EDITABLE_NUTRIENT_FIELDS)[number]["key"],
  { label: string; unit: string; required?: boolean }
> = Object.fromEntries(
  EDITABLE_NUTRIENT_FIELDS.map((field) => [
    field.key,
    {
      label: field.label,
      unit: field.unit,
      required: "required" in field ? field.required : undefined,
    },
  ])
) as Record<
  (typeof EDITABLE_NUTRIENT_FIELDS)[number]["key"],
  { label: string; unit: string; required?: boolean }
>;

export const ANNEX_II_NUTRIENT_PROMPT_LIST = EDITABLE_NUTRIENT_FIELDS.map(
  (field) => `${field.key} (${field.label}, ${field.unit})`
).join(", ");
