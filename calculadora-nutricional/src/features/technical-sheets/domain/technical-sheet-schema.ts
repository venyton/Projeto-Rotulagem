import { z } from "zod/v3";
import { zodToJsonSchema } from "zod-to-json-schema";

export const DOCUMENT_TYPES = [
  "NUTRITION_TABLE_ONLY",
  "PRODUCT_TECHNICAL_SHEET",
  "MATERIAL_SPECIFICATION",
  "LAB_REPORT",
  "CERTIFICATE",
  "UNKNOWN",
] as const;

export const DECLARATION_TYPES = [
  "CONTAINS",
  "MAY_CONTAIN",
  "DOES_NOT_CONTAIN",
  "PRESENT_IN_LINE",
  "UNKNOWN",
] as const;

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

export const ADDITIONAL_NUTRIENT_KEYS = [
  "lactose",
  "cholesterol",
  "fatMono",
  "fatPoly",
  "omega3",
  "omega6",
  "calcium",
  "iron",
  "potassium",
  "vitaminA",
  "vitaminC",
  "vitaminD",
  "vitaminE",
  "vitaminK",
  "thiamin",
  "riboflavin",
  "niacin",
  "vitaminB6",
  "folicAcid",
  "vitaminB12",
  "magnesium",
  "zinc",
  "phosphorus",
  "moisture",
  "ash",
  "other",
] as const;

export const NUTRIENT_KEYS = [
  ...REQUIRED_NUTRIENT_KEYS,
  ...ADDITIONAL_NUTRIENT_KEYS,
] as const;

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();
const nullableBoolean = z.boolean().nullable();

const technicalSheetEvidenceItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: nullableString,
  unit: nullableString,
  method: nullableString,
  sourceText: nullableString,
  confidence: nullableNumber,
});

const technicalSheetCertificationSchema = z.object({
  key: z.string(),
  label: z.string(),
  present: nullableBoolean,
  sourceText: nullableString,
  confidence: nullableNumber,
});

const technicalSheetWarningSchema = z.object({
  key: z.string(),
  label: z.string(),
  text: nullableString,
  sourceText: nullableString,
  confidence: nullableNumber,
});

export const technicalSheetNutrientSchema = z.object({
  key: z.enum(NUTRIENT_KEYS),
  label: z.string(),
  value: nullableNumber,
  unit: nullableString,
  dailyValuePercent: nullableNumber,
  baseQuantity: z.number().default(100),
  baseUnit: z.string().default("g"),
  sourceText: nullableString,
  confidence: nullableNumber,
});

export const technicalSheetAllergenSchema = z.object({
  key: z.string(),
  label: z.string(),
  declarationType: z.enum(DECLARATION_TYPES),
  present: nullableBoolean,
  controlled: nullableBoolean,
  sourceText: nullableString,
  confidence: nullableNumber,
});

export const technicalSheetExtractionSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  confidence: z.number().min(0).max(1),
  product: z.object({
    name: nullableString,
    code: nullableString,
    manufacturer: nullableString,
    brand: nullableString,
    version: nullableString,
    revision: nullableString,
    issueDate: nullableString,
    revisionDate: nullableString,
  }),
  description: nullableString,
  applicationAndDosage: nullableString,
  compositionText: nullableString,
  ingredientsText: nullableString,
  gluten: z.object({
    contains: nullableBoolean,
    text: nullableString,
  }),
  gmo: z.object({
    contains: nullableBoolean,
    text: nullableString,
  }),
  lactose: z
    .object({
      contains: nullableBoolean,
      text: nullableString,
      value: nullableNumber,
      unit: nullableString,
    })
    .default({
      contains: null,
      text: null,
      value: null,
      unit: null,
    }),
  allergens: z.object({
    text: nullableString,
    mayContainText: nullableString,
    items: z.array(technicalSheetAllergenSchema),
  }),
  nutrition: z.object({
    baseQuantity: z.number().default(100),
    baseUnit: z.string().default("g"),
    servingQuantity: nullableNumber,
    servingUnit: nullableString,
    householdMeasure: nullableString,
    servingsPerPackage: nullableString,
    nutrients: z.array(technicalSheetNutrientSchema),
  }),
  shelfLife: nullableString,
  storageConditions: nullableString,
  packagingText: nullableString,
  regulatory: z
    .object({
      productCategory: nullableString,
      legalClassification: nullableString,
      anvisaRegistration: nullableString,
      mapaRegistration: nullableString,
      sifRegistration: nullableString,
      additiveFunction: nullableString,
      insCodes: z.array(z.string()),
      casNumbers: z.array(z.string()),
      legalReferences: z.array(technicalSheetEvidenceItemSchema),
    })
    .default({
      productCategory: null,
      legalClassification: null,
      anvisaRegistration: null,
      mapaRegistration: null,
      sifRegistration: null,
      additiveFunction: null,
      insCodes: [],
      casNumbers: [],
      legalReferences: [],
    }),
  qualitySpecs: z
    .object({
      sensory: z.array(technicalSheetEvidenceItemSchema),
      physicochemical: z.array(technicalSheetEvidenceItemSchema),
      microbiological: z.array(technicalSheetEvidenceItemSchema),
      contaminants: z.array(technicalSheetEvidenceItemSchema),
    })
    .default({
      sensory: [],
      physicochemical: [],
      microbiological: [],
      contaminants: [],
    }),
  traceability: z
    .object({
      countryOfOrigin: nullableString,
      originText: nullableString,
      animalOrigin: nullableBoolean,
      animalOriginText: nullableString,
      lotPattern: nullableString,
      shelfLifeAfterOpening: nullableString,
      transportConditions: nullableString,
      distributionConditions: nullableString,
      netWeight: nullableString,
      packagingMaterial: nullableString,
    })
    .default({
      countryOfOrigin: null,
      originText: null,
      animalOrigin: null,
      animalOriginText: null,
      lotPattern: null,
      shelfLifeAfterOpening: null,
      transportConditions: null,
      distributionConditions: null,
      netWeight: null,
      packagingMaterial: null,
    }),
  certifications: z.array(technicalSheetCertificationSchema).default([]),
  warnings: z.array(technicalSheetWarningSchema).default([]),
  fieldsForReview: z.array(z.string()),
});

export type TechnicalSheetAiExtraction = z.infer<typeof technicalSheetExtractionSchema>;
export type TechnicalSheetAiNutrient = z.infer<typeof technicalSheetNutrientSchema>;
export type TechnicalSheetAiAllergen = z.infer<typeof technicalSheetAllergenSchema>;
export type TechnicalSheetEvidenceItem = z.infer<typeof technicalSheetEvidenceItemSchema>;
export type TechnicalSheetCertification = z.infer<typeof technicalSheetCertificationSchema>;
export type TechnicalSheetWarning = z.infer<typeof technicalSheetWarningSchema>;
export type TechnicalSheetDocumentType = (typeof DOCUMENT_TYPES)[number];
export type TechnicalSheetNutrientKey = (typeof NUTRIENT_KEYS)[number];

export function getTechnicalSheetResponseJsonSchema() {
  const schema = zodToJsonSchema(technicalSheetExtractionSchema, {
    $refStrategy: "none",
    target: "jsonSchema7",
  }) as Record<string, unknown>;

  return stripUnsupportedSchemaKeys(schema);
}

function stripUnsupportedSchemaKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUnsupportedSchemaKeys);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "$schema" && key !== "default")
        .map(([key, item]) => [key, stripUnsupportedSchemaKeys(item)])
    );
  }

  return value;
}
