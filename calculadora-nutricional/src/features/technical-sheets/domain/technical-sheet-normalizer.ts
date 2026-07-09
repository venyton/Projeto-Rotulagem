import { TechnicalFieldCategory, type DocumentType, type Prisma } from "@prisma/client";
import {
  type TechnicalSheetAiAllergen,
  type TechnicalSheetCertification,
  type TechnicalSheetEvidenceItem,
  type TechnicalSheetAiExtraction,
  type TechnicalSheetAiNutrient,
  type TechnicalSheetWarning,
} from "./technical-sheet-schema";
import { REQUIRED_NUTRIENT_KEYS } from "./technical-sheet-nutrients";

export type NormalizedExtractedNutrient = {
  nutrientKey: string;
  label: string;
  value: number | null;
  unit: string | null;
  baseQuantity: number;
  baseUnit: string;
  dailyValuePercent: number | null;
  sourceText: string | null;
  confidence: number | null;
};

export type NormalizedExtractedAllergen = {
  allergenKey: string;
  label: string;
  declarationType: string | null;
  present: boolean | null;
  controlled: boolean | null;
  sourceText: string | null;
  confidence: number | null;
};

export type NormalizedExtractedTechnicalField = {
  category: TechnicalFieldCategory;
  fieldKey: string;
  label: string;
  value: string | null;
  unit: string | null;
  method: string | null;
  sourceText: string | null;
  confidence: number | null;
};

export type NormalizedTechnicalSheetExtraction = {
  documentType: DocumentType;
  confidence: number;
  fieldsForReview: string[];
  extractionData: {
    productName: string | null;
    productCode: string | null;
    manufacturer: string | null;
    brand: string | null;
    version: string | null;
    revision: string | null;
    issueDate: Date | null;
    revisionDate: Date | null;
    description: string | null;
    applicationAndDosage: string | null;
    compositionText: string | null;
    ingredientsText: string | null;
    containsGluten: boolean | null;
    glutenText: string | null;
    containsGmo: boolean | null;
    gmoText: string | null;
    allergensText: string | null;
    mayContainText: string | null;
    shelfLife: string | null;
    storageConditions: string | null;
    packagingText: string | null;
    servingQuantity: number | null;
    servingUnit: string | null;
    householdMeasure: string | null;
    servingsPerPackage: string | null;
    baseQuantity: number;
    baseUnit: string;
    confidence: number;
  };
  nutrients: NormalizedExtractedNutrient[];
  allergens: NormalizedExtractedAllergen[];
  technicalFields: NormalizedExtractedTechnicalField[];
};

const CUSTOM_NUTRIENT_DEFAULTS = {
  energy: 0,
  carbs: 0,
  protein: 0,
  fatTotal: 0,
  fatSat: 0,
  fatTrans: 0,
  fiber: 0,
  sodium: 0,
  sugarTotal: 0,
  sugarAdded: 0,
  fatMono: null,
  fatPoly: null,
  omega6: null,
  omega3: null,
  cholesterol: null,
  vitaminA: null,
  vitaminD: null,
  vitaminE: null,
  vitaminK: null,
  vitaminC: null,
  thiamin: null,
  riboflavin: null,
  niacin: null,
  vitaminB6: null,
  biotin: null,
  folicAcid: null,
  pantothenicAcid: null,
  vitaminB12: null,
  calcium: null,
  chloride: null,
  copper: null,
  chromium: null,
  iron: null,
  fluoride: null,
  phosphorus: null,
  iodine: null,
  magnesium: null,
  manganese: null,
  molybdenum: null,
  potassium: null,
  selenium: null,
  zinc: null,
  choline: null,
};

type CustomNutrientData = typeof CUSTOM_NUTRIENT_DEFAULTS;

export function normalizeTechnicalSheetExtraction(
  aiJson: TechnicalSheetAiExtraction
): NormalizedTechnicalSheetExtraction {
  const fieldsForReview = new Set(aiJson.fieldsForReview);
  const baseQuantity = toFiniteNumber(aiJson.nutrition.baseQuantity) || 100;
  const baseUnit = normalizeUnit(aiJson.nutrition.baseUnit) ?? "g";
  const servingQuantity = toFiniteNumber(aiJson.nutrition.servingQuantity);
  const servingUnit = normalizeUnit(aiJson.nutrition.servingUnit);

  const nutrients = aiJson.nutrition.nutrients.map((nutrient) =>
    normalizeAiNutrient(nutrient, baseQuantity, baseUnit, servingQuantity, servingUnit)
  );
  const displayBase = getDisplayNutritionBase(nutrients, baseQuantity, baseUnit, servingQuantity, servingUnit);

  if (nutrients.some((nutrient) => nutrient.value !== null && !isStandardIngredientBase(nutrient.baseQuantity, nutrient.baseUnit))) {
    fieldsForReview.add("Base nutricional diferente de 100 g/100 ml; revise os valores antes de aprovar.");
  }

  for (const key of REQUIRED_NUTRIENT_KEYS) {
    if (!nutrients.some((nutrient) => nutrient.nutrientKey === key)) {
      fieldsForReview.add(`${key} ausente`);
      if (key === "sugarTotal" || key === "sugarAdded") {
        nutrients.push({
          nutrientKey: key,
          label: key === "sugarTotal" ? "Açúcares totais" : "Açúcares adicionados",
          value: 0,
          unit: "g",
          baseQuantity: displayBase.quantity,
          baseUnit: displayBase.unit,
          dailyValuePercent: null,
          sourceText: null,
          confidence: null,
        });
      }
    }
  }

  return {
    documentType: aiJson.documentType,
    confidence: aiJson.confidence,
    fieldsForReview: Array.from(fieldsForReview),
    extractionData: {
      productName: cleanString(aiJson.product.name),
      productCode: cleanString(aiJson.product.code),
      manufacturer: cleanString(aiJson.product.manufacturer),
      brand: cleanString(aiJson.product.brand),
      version: cleanString(aiJson.product.version),
      revision: cleanString(aiJson.product.revision),
      issueDate: parseNullableDate(aiJson.product.issueDate),
      revisionDate: parseNullableDate(aiJson.product.revisionDate),
      description: cleanString(aiJson.description),
      applicationAndDosage: cleanString(aiJson.applicationAndDosage),
      compositionText: cleanString(aiJson.compositionText),
      ingredientsText: cleanString(aiJson.ingredientsText),
      containsGluten: aiJson.gluten.contains,
      glutenText: cleanString(aiJson.gluten.text),
      containsGmo: aiJson.gmo.contains,
      gmoText: cleanString(aiJson.gmo.text),
      allergensText: cleanString(aiJson.allergens.text),
      mayContainText: cleanString(aiJson.allergens.mayContainText),
      shelfLife: cleanString(aiJson.shelfLife),
      storageConditions: cleanString(aiJson.storageConditions),
      packagingText: cleanString(aiJson.packagingText),
      servingQuantity,
      servingUnit,
      householdMeasure: cleanString(aiJson.nutrition.householdMeasure),
      servingsPerPackage: cleanString(aiJson.nutrition.servingsPerPackage),
      baseQuantity: displayBase.quantity,
      baseUnit: displayBase.unit,
      confidence: aiJson.confidence,
    },
    nutrients,
    allergens: aiJson.allergens.items.map(normalizeAiAllergen),
    technicalFields: extractTechnicalFields(aiJson),
  };
}

export function mapNutrientsToCustomIngredient(
  nutrients: Array<Pick<NormalizedExtractedNutrient, "nutrientKey" | "value" | "unit" | "sourceText">>
): CustomNutrientData {
  const mapped: CustomNutrientData = { ...CUSTOM_NUTRIENT_DEFAULTS };

  for (const nutrient of nutrients) {
    const key = normalizeNutrientKey(nutrient.nutrientKey);
    if (!key || !(key in mapped)) continue;

    let value = toFiniteNumber(nutrient.value);
    const sourceText = nutrient.sourceText || "";

    if (value === null && isNonDetectedText(sourceText)) {
      value = 0;
    }

    if (value === null) continue;

    if (key === "sodium" && normalizeUnit(nutrient.unit) === "g") {
      value *= 1000;
    }

    if (key === "omega3" && normalizeUnit(nutrient.unit) === "g") {
      value *= 1000;
    }

    if (key === "energy" && normalizeUnit(nutrient.unit) === "kj") {
      value = value / 4.184;
    }

    (mapped as Record<string, number | null>)[key] = roundNumber(value);
  }

  return mapped;
}

export function normalizeNutrientKey(value: string | null | undefined) {
  if (!value) return null;
  const normalized = normalizeText(value);
  const map: Record<string, keyof CustomNutrientData> = {
    energy: "energy",
    valorenergetico: "energy",
    kcal: "energy",
    carbs: "carbs",
    carboidratos: "carbs",
    sugartotal: "sugarTotal",
    acucarestotais: "sugarTotal",
    sugaradded: "sugarAdded",
    acucaresadicionados: "sugarAdded",
    protein: "protein",
    proteinas: "protein",
    fattotal: "fatTotal",
    gordurastotais: "fatTotal",
    fatsat: "fatSat",
    gordurassaturadas: "fatSat",
    fattrans: "fatTrans",
    gordurastrans: "fatTrans",
    fiber: "fiber",
    fibra: "fiber",
    fibraalimentar: "fiber",
    sodium: "sodium",
    sodio: "sodium",
    cholesterol: "cholesterol",
    colesterol: "cholesterol",
    fatmono: "fatMono",
    gorduramonoinsaturada: "fatMono",
    gordurasmonoinsaturadas: "fatMono",
    fatpoly: "fatPoly",
    gordurapoliinsaturada: "fatPoly",
    gorduraspoliinsaturadas: "fatPoly",
    omega3: "omega3",
    omega6: "omega6",
    calcium: "calcium",
    calcio: "calcium",
    chloride: "chloride",
    cloreto: "chloride",
    copper: "copper",
    cobre: "copper",
    chromium: "chromium",
    cromo: "chromium",
    iron: "iron",
    ferro: "iron",
    fluoride: "fluoride",
    fluor: "fluoride",
    potassium: "potassium",
    potassio: "potassium",
    vitamina: "vitaminA",
    vitaminaa: "vitaminA",
    vitaminc: "vitaminC",
    vitamind: "vitaminD",
    vitamine: "vitaminE",
    vitamink: "vitaminK",
    thiamin: "thiamin",
    tiamina: "thiamin",
    riboflavin: "riboflavin",
    riboflavina: "riboflavin",
    niacin: "niacin",
    niacina: "niacin",
    vitaminb6: "vitaminB6",
    biotin: "biotin",
    biotina: "biotin",
    folicacid: "folicAcid",
    acidofolico: "folicAcid",
    pantothenicacid: "pantothenicAcid",
    acidopantotenico: "pantothenicAcid",
    vitaminab5: "pantothenicAcid",
    vitaminb12: "vitaminB12",
    magnesium: "magnesium",
    magnesio: "magnesium",
    zinc: "zinc",
    zinco: "zinc",
    phosphorus: "phosphorus",
    fosforo: "phosphorus",
    iodine: "iodine",
    iodo: "iodine",
    manganese: "manganese",
    manganes: "manganese",
    molybdenum: "molybdenum",
    molibdenio: "molybdenum",
    selenium: "selenium",
    selenio: "selenium",
    choline: "choline",
    colina: "choline",
  };

  return map[normalized] ?? null;
}

export function normalizeUnit(unit: string | null | undefined) {
  const value = cleanString(unit);
  if (!value) return null;
  const normalized = value
    .toLowerCase()
    .replace("µ", "u")
    .replace("μ", "u")
    .replace(/\s+/g, "");

  const map: Record<string, string> = {
    grama: "g",
    gramas: "g",
    g: "g",
    mg: "mg",
    miligrama: "mg",
    miligramas: "mg",
    µg: "µg",
    ug: "µg",
    micrograma: "µg",
    microgramas: "µg",
    kcal: "kcal",
    cal: "kcal",
    kj: "kj",
    ml: "ml",
    mililitro: "ml",
    mililitros: "ml",
  };

  return map[normalized] ?? normalized;
}

export function parseNullableDate(value: string | null | undefined) {
  const cleaned = cleanString(value);
  if (!cleaned) return null;

  const brDate = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (brDate) {
    const [, day, month, rawYear] = brDate;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseNumberish(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const cleaned = value.trim();
  if (!cleaned || isNonDetectedText(cleaned)) return 0;

  const numeric = cleaned.replace(/[^\d,.-]/g, "");
  if (!numeric) return null;

  const lastComma = numeric.lastIndexOf(",");
  const lastDot = numeric.lastIndexOf(".");
  let normalized = numeric;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? numeric.replace(/\./g, "").replace(",", ".")
        : numeric.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = numeric.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildAiJsonForStorage(
  aiJson: TechnicalSheetAiExtraction,
  fieldsForReview: string[]
): Prisma.InputJsonValue {
  return {
    ...aiJson,
    fieldsForReview,
  } as Prisma.InputJsonValue;
}

function normalizeAiNutrient(
  nutrient: TechnicalSheetAiNutrient,
  fallbackBaseQuantity: number,
  fallbackBaseUnit: string,
  servingQuantity: number | null,
  servingUnit: string | null
): NormalizedExtractedNutrient {
  const key = normalizeNutrientKey(nutrient.key) ?? nutrient.key;
  let unit = normalizeUnit(nutrient.unit);
  const sourceText = cleanString(nutrient.sourceText);
  let value = toFiniteNumber(nutrient.value);

  if (value === null && isNonDetectedText(sourceText || "")) {
    value = 0;
  }

  if (key === "sodium" && value !== null && unit === "g") {
    value *= 1000;
    unit = "mg";
  }

  if (key === "omega3" && value !== null && unit === "g") {
    value *= 1000;
    unit = "mg";
  }

  if (key === "energy" && value !== null && unit === "kj") {
    value = value / 4.184;
    unit = "kcal";
  }

  const nutrientBaseQuantity = toFiniteNumber(nutrient.baseQuantity);
  const nutrientBaseUnit = normalizeUnit(nutrient.baseUnit) ?? fallbackBaseUnit;
  const useFallbackBase =
    !inferStandardBaseFromSourceText(sourceText) &&
    nutrientBaseQuantity === 100 &&
    nutrientBaseUnit === "g" &&
    !isStandardIngredientBase(fallbackBaseQuantity, fallbackBaseUnit);

  const base = resolveNutrientBase(
    useFallbackBase ? fallbackBaseQuantity : nutrientBaseQuantity || fallbackBaseQuantity,
    useFallbackBase ? fallbackBaseUnit : nutrientBaseUnit,
    servingQuantity,
    servingUnit,
    sourceText
  );
  const normalized = normalizeNutrientValueToIngredientBase(value, base);

  return {
    nutrientKey: key,
    label: nutrient.label,
    value: normalized.value === null ? null : roundNumber(normalized.value),
    unit,
    baseQuantity: normalized.base.quantity,
    baseUnit: normalized.base.unit,
    dailyValuePercent: normalized.converted ? null : toFiniteNumber(nutrient.dailyValuePercent),
    sourceText,
    confidence: toFiniteNumber(nutrient.confidence),
  };
}

type NutritionBase = {
  quantity: number;
  unit: string;
};

function resolveNutrientBase(
  baseQuantity: number,
  baseUnit: string,
  servingQuantity: number | null,
  servingUnit: string | null,
  sourceText: string | null
): NutritionBase {
  const sourceBase = inferStandardBaseFromSourceText(sourceText);
  if (sourceBase) return sourceBase;

  if (sourceTextMentionsServingBase(sourceText) && servingQuantity && servingQuantity > 0 && servingUnit) {
    return { quantity: servingQuantity, unit: servingUnit };
  }

  if (isServingBaseUnit(baseUnit) && servingQuantity && servingQuantity > 0 && servingUnit) {
    return { quantity: servingQuantity, unit: servingUnit };
  }

  return { quantity: baseQuantity, unit: baseUnit };
}

function normalizeNutrientValueToIngredientBase(value: number | null, base: NutritionBase) {
  const standardUnit = getStandardBaseUnit(base.unit);
  if (!standardUnit || !Number.isFinite(base.quantity) || base.quantity <= 0) {
    return { value, base, converted: false };
  }

  const standardBase = { quantity: 100, unit: standardUnit };
  if (Math.abs(base.quantity - 100) < 0.000001 && base.unit === standardUnit) {
    return { value, base: standardBase, converted: false };
  }

  return {
    value: value === null ? null : value * (100 / base.quantity),
    base: standardBase,
    converted: true,
  };
}

function getDisplayNutritionBase(
  nutrients: NormalizedExtractedNutrient[],
  fallbackBaseQuantity: number,
  fallbackBaseUnit: string,
  servingQuantity: number | null,
  servingUnit: string | null
): NutritionBase {
  const commonBase = getCommonNutrientBase(nutrients);
  if (commonBase) return commonBase;

  const base = resolveNutrientBase(fallbackBaseQuantity, fallbackBaseUnit, servingQuantity, servingUnit, null);
  return normalizeNutrientValueToIngredientBase(null, base).base;
}

function getCommonNutrientBase(nutrients: NormalizedExtractedNutrient[]): NutritionBase | null {
  const valuedNutrients = nutrients.filter((nutrient) => nutrient.value !== null);
  const [first] = valuedNutrients;
  if (!first) return null;

  const hasSameBase = valuedNutrients.every(
    (nutrient) =>
      Math.abs(nutrient.baseQuantity - first.baseQuantity) < 0.000001 &&
      nutrient.baseUnit === first.baseUnit
  );

  return hasSameBase ? { quantity: first.baseQuantity, unit: first.baseUnit } : null;
}

function isStandardIngredientBase(baseQuantity: number, baseUnit: string) {
  return Math.abs(baseQuantity - 100) < 0.000001 && Boolean(getStandardBaseUnit(baseUnit));
}

function getStandardBaseUnit(unit: string | null | undefined) {
  const normalized = normalizeUnit(unit);
  if (normalized === "g" || normalized === "ml") return normalized;
  return null;
}

function isServingBaseUnit(unit: string) {
  return ["porcao", "porcoes", "serving", "servings", "unidade", "unidades", "un", "und"].includes(
    normalizeText(unit)
  );
}

function inferStandardBaseFromSourceText(sourceText: string | null) {
  if (!sourceText) return null;
  if (/\b100\s*g\b/i.test(sourceText)) return { quantity: 100, unit: "g" };
  if (/\b100\s*m[lL]\b/i.test(sourceText)) return { quantity: 100, unit: "ml" };
  return null;
}

function sourceTextMentionsServingBase(sourceText: string | null) {
  if (!sourceText) return false;
  const normalized = normalizeText(sourceText);
  return normalized.includes("porcao") || normalized.includes("porcoes") || normalized.includes("serving");
}

function normalizeAiAllergen(allergen: TechnicalSheetAiAllergen): NormalizedExtractedAllergen {
  return {
    allergenKey: normalizeText(allergen.key) || "unknown",
    label: allergen.label,
    declarationType: allergen.declarationType,
    present: allergen.present,
    controlled: allergen.controlled,
    sourceText: cleanString(allergen.sourceText),
    confidence: toFiniteNumber(allergen.confidence),
  };
}

function extractTechnicalFields(aiJson: TechnicalSheetAiExtraction): NormalizedExtractedTechnicalField[] {
  const fields: NormalizedExtractedTechnicalField[] = [];

  addTechnicalField(fields, TechnicalFieldCategory.REGULATORY, "productCategory", "Categoria", aiJson.regulatory.productCategory);
  addTechnicalField(
    fields,
    TechnicalFieldCategory.REGULATORY,
    "legalClassification",
    "Classificação legal",
    aiJson.regulatory.legalClassification
  );
  addTechnicalField(
    fields,
    TechnicalFieldCategory.REGULATORY,
    "anvisaRegistration",
    "Registro ANVISA",
    aiJson.regulatory.anvisaRegistration
  );
  addTechnicalField(
    fields,
    TechnicalFieldCategory.REGULATORY,
    "mapaRegistration",
    "Registro MAPA",
    aiJson.regulatory.mapaRegistration
  );
  addTechnicalField(fields, TechnicalFieldCategory.REGULATORY, "sifRegistration", "Registro SIF", aiJson.regulatory.sifRegistration);
  addTechnicalField(
    fields,
    TechnicalFieldCategory.REGULATORY,
    "additiveFunction",
    "Função tecnológica",
    aiJson.regulatory.additiveFunction
  );

  for (const code of aiJson.regulatory.insCodes) {
    addTechnicalField(fields, TechnicalFieldCategory.REGULATORY, "insCode", "INS", code);
  }

  for (const cas of aiJson.regulatory.casNumbers) {
    addTechnicalField(fields, TechnicalFieldCategory.REGULATORY, "casNumber", "CAS", cas);
  }

  addEvidenceItems(fields, TechnicalFieldCategory.REGULATORY, "legalReference", aiJson.regulatory.legalReferences);
  addEvidenceItems(fields, TechnicalFieldCategory.SENSORY, "sensory", aiJson.qualitySpecs.sensory);
  addEvidenceItems(fields, TechnicalFieldCategory.PHYSICOCHEMICAL, "physicochemical", aiJson.qualitySpecs.physicochemical);
  addEvidenceItems(fields, TechnicalFieldCategory.MICROBIOLOGICAL, "microbiological", aiJson.qualitySpecs.microbiological);
  addEvidenceItems(fields, TechnicalFieldCategory.CONTAMINANT, "contaminant", aiJson.qualitySpecs.contaminants);

  addTechnicalField(
    fields,
    TechnicalFieldCategory.DECLARATION,
    "lactose",
    "Lactose",
    formatLactoseValue(aiJson),
    aiJson.lactose.unit,
    null,
    aiJson.lactose.text
  );

  addTechnicalField(fields, TechnicalFieldCategory.TRACEABILITY, "countryOfOrigin", "País de origem", aiJson.traceability.countryOfOrigin);
  addTechnicalField(fields, TechnicalFieldCategory.TRACEABILITY, "originText", "Origem", aiJson.traceability.originText);
  addTechnicalField(
    fields,
    TechnicalFieldCategory.TRACEABILITY,
    "animalOrigin",
    "Origem animal",
    booleanToText(aiJson.traceability.animalOrigin),
    null,
    null,
    aiJson.traceability.animalOriginText
  );
  addTechnicalField(fields, TechnicalFieldCategory.TRACEABILITY, "lotPattern", "Padrão de lote", aiJson.traceability.lotPattern);
  addTechnicalField(
    fields,
    TechnicalFieldCategory.TRACEABILITY,
    "shelfLifeAfterOpening",
    "Validade após aberto",
    aiJson.traceability.shelfLifeAfterOpening
  );
  addTechnicalField(fields, TechnicalFieldCategory.LOGISTICS, "transportConditions", "Transporte", aiJson.traceability.transportConditions);
  addTechnicalField(fields, TechnicalFieldCategory.LOGISTICS, "distributionConditions", "Distribuição", aiJson.traceability.distributionConditions);
  addTechnicalField(fields, TechnicalFieldCategory.LOGISTICS, "netWeight", "Peso líquido", aiJson.traceability.netWeight);
  addTechnicalField(fields, TechnicalFieldCategory.LOGISTICS, "packagingMaterial", "Material da embalagem", aiJson.traceability.packagingMaterial);

  addCertifications(fields, aiJson.certifications);
  addWarnings(fields, aiJson.warnings);

  return fields;
}

function addEvidenceItems(
  fields: NormalizedExtractedTechnicalField[],
  category: TechnicalFieldCategory,
  fallbackKey: string,
  items: TechnicalSheetEvidenceItem[]
) {
  for (const item of items) {
    addTechnicalField(
      fields,
      category,
      item.key || fallbackKey,
      item.label || fallbackKey,
      item.value,
      item.unit,
      item.method,
      item.sourceText,
      item.confidence
    );
  }
}

function addCertifications(
  fields: NormalizedExtractedTechnicalField[],
  certifications: TechnicalSheetCertification[]
) {
  for (const certification of certifications) {
    addTechnicalField(
      fields,
      TechnicalFieldCategory.CERTIFICATION,
      certification.key,
      certification.label,
      certification.present === null ? null : certification.present ? "presente" : "não declarado",
      null,
      null,
      certification.sourceText,
      certification.confidence
    );
  }
}

function addWarnings(fields: NormalizedExtractedTechnicalField[], warnings: TechnicalSheetWarning[]) {
  for (const warning of warnings) {
    addTechnicalField(
      fields,
      TechnicalFieldCategory.WARNING,
      warning.key,
      warning.label,
      warning.text,
      null,
      null,
      warning.sourceText,
      warning.confidence
    );
  }
}

function addTechnicalField(
  fields: NormalizedExtractedTechnicalField[],
  category: TechnicalFieldCategory,
  fieldKey: string,
  label: string,
  value: string | number | boolean | null | undefined,
  unit: string | null = null,
  method: string | null = null,
  sourceText: string | null = null,
  confidence: number | null = null
) {
  const cleanedValue = cleanTechnicalValue(value);
  const cleanedSourceText = cleanString(sourceText);

  if (!cleanedValue && !cleanedSourceText) return;

  fields.push({
    category,
    fieldKey: normalizeFieldKey(fieldKey),
    label,
    value: cleanedValue,
    unit: normalizeUnit(unit),
    method: cleanString(method),
    sourceText: cleanedSourceText,
    confidence: toFiniteNumber(confidence),
  });
}

function cleanTechnicalValue(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "sim" : "não";
  return cleanString(value);
}

function formatLactoseValue(aiJson: TechnicalSheetAiExtraction) {
  const parts = [
    booleanToText(aiJson.lactose.contains),
    aiJson.lactose.value === null ? null : String(aiJson.lactose.value),
  ];

  return parts.filter((value): value is string => Boolean(value)).join(" | ") || null;
}

function booleanToText(value: boolean | null) {
  if (value === null) return null;
  return value ? "sim" : "não";
}

function normalizeFieldKey(value: string) {
  return normalizeText(value) || "unknown";
}

function cleanString(value: string | null | undefined) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  return cleaned.length > 0 ? cleaned : null;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "string") return parseNumberish(value);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isNonDetectedText(value: string) {
  const normalized = normalizeText(value);
  return ["nd", "naodetectado", "naodetectada", "naoaplicavel", "tracos", "traco"].some(
    (term) => normalized.includes(term)
  );
}

function roundNumber(value: number) {
  return Math.round(value * 1000) / 1000;
}
