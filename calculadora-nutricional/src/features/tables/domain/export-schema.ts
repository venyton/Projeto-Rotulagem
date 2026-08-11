import { z } from "zod";

import { POPULATION_GROUPS, PopGroup } from "./constants";

export const EXPORT_SHEET_TYPES = [
  "VERT",
  "HORIZ",
  "VERT-QUEB",
  "HORIZ-QUEB",
  "LINEAR",
  "AGREGADO",
  "SIMPLIF",
  "B2B",
  "ADICAO",
  "100",
  "SUPLEM",
  "SUPLEM-POP",
] as const;

const populationGroupValues = Object.values(POPULATION_GROUPS) as [PopGroup, ...PopGroup[]];
const finiteNutrient = z.number().finite().nonnegative().max(1_000_000).default(0);

const nutrientsSchema = z
  .object({
    energy: finiteNutrient,
    carbs: finiteNutrient,
    sugarTotal: finiteNutrient,
    sugarAdded: finiteNutrient,
    protein: finiteNutrient,
    fatTotal: finiteNutrient,
    fatSat: finiteNutrient,
    fatTrans: finiteNutrient,
    fiber: finiteNutrient,
    sodium: finiteNutrient,
    fatMono: finiteNutrient,
    fatPoly: finiteNutrient,
    omega6: finiteNutrient,
    omega3: finiteNutrient,
    cholesterol: finiteNutrient,
    vitaminA: finiteNutrient,
    vitaminD: finiteNutrient,
    vitaminE: finiteNutrient,
    vitaminK: finiteNutrient,
    vitaminC: finiteNutrient,
    thiamin: finiteNutrient,
    riboflavin: finiteNutrient,
    niacin: finiteNutrient,
    vitaminB6: finiteNutrient,
    biotin: finiteNutrient,
    folicAcid: finiteNutrient,
    pantothenicAcid: finiteNutrient,
    vitaminB12: finiteNutrient,
    calcium: finiteNutrient,
    chloride: finiteNutrient,
    copper: finiteNutrient,
    chromium: finiteNutrient,
    iron: finiteNutrient,
    fluoride: finiteNutrient,
    phosphorus: finiteNutrient,
    iodine: finiteNutrient,
    magnesium: finiteNutrient,
    manganese: finiteNutrient,
    molybdenum: finiteNutrient,
    potassium: finiteNutrient,
    selenium: finiteNutrient,
    zinc: finiteNutrient,
    choline: finiteNutrient,
    customNutrients: z
      .record(
        z.string().trim().min(1).max(120),
        z.object({
          value: finiteNutrient,
          unit: z.string().trim().min(1).max(20),
        })
      )
      .refine((value) => Object.keys(value).length <= 100, "Número máximo de nutrientes personalizados excedido")
      .default({}),
  })
  .strict();

const boundedText = (max: number) => z.string().trim().max(max);

const commonExportFields = {
  title: boundedText(200).default(""),
  per100g: nutrientsSchema.partial().default({}),
  perPortion: nutrientsSchema.partial().default({}),
  portionSize: z.number().finite().positive().max(100_000),
  householdMeasure: boundedText(120).default("medida caseira"),
  popGroup: z.enum(populationGroupValues).default(POPULATION_GROUPS.ADULTS),
  isSupplement: z.boolean().default(false),
  servingsPerPackage: boundedText(100).optional(),
  selectedNutrients: z.array(boundedText(80)).max(64).default([]),
  selectedTableTypes: z.array(z.enum(EXPORT_SHEET_TYPES)).max(EXPORT_SHEET_TYPES.length).default([]),
  extraConstituents: z
    .array(
      z.object({
        name: boundedText(120).optional(),
        amount: z.union([boundedText(40), z.number().finite().nonnegative().max(1_000_000)]).optional(),
        unit: boundedText(20).optional(),
      })
    )
    .max(100)
    .default([]),
  showDailyValue: z.boolean().default(true),
};

export const exportBodySchema = z.object(commonExportFields).strict();

export const imageDataUrlSchema = z
  .string()
  .max(12 * 1024 * 1024)
  .regex(/^data:image\/(?:png|jpeg|jpg);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);

export const completeExportBodySchema = z
  .object({
    ...commonExportFields,
    imageDataUrl: imageDataUrlSchema.optional(),
    imageDataUrls: z
      .record(z.string().trim().min(1).max(80), imageDataUrlSchema)
      .refine((value) => Object.keys(value).length <= EXPORT_SHEET_TYPES.length, "Número máximo de imagens excedido")
      .refine(
        (value) => Object.values(value).reduce((total, image) => total + image.length, 0) <= 24 * 1024 * 1024,
        "Tamanho total das imagens excedido"
      )
      .optional(),
  })
  .strict();

export type ExportBodyInput = z.infer<typeof exportBodySchema>;
export type CompleteExportBodyInput = z.infer<typeof completeExportBodySchema>;
