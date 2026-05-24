import type { ReviewStatus } from "@prisma/client";
import type { AnnexIiOptionalNutrientKey } from "./technical-sheet-nutrients";

export type TechnicalSheetActionState = {
  error?: string;
  message?: string;
  success?: boolean;
  documentId?: string;
  documentIds?: string[];
  extractionId?: string;
  extractionIds?: string[];
  approvedTargetId?: string;
  processedCount?: number;
  failedCount?: number;
};

export type EditableTechnicalSheetValues = {
  productName: string;
  productCode: string | null;
  manufacturer: string | null;
  brand: string | null;
  energy: number;
  carbs: number;
  sugarTotal: number;
  sugarAdded: number;
  protein: number;
  fatTotal: number;
  fatSat: number;
  fatTrans: number;
  fiber: number;
  sodium: number;
  containsGluten: boolean | null;
  glutenText: string | null;
  gmoText: string | null;
  ingredientsText: string | null;
  allergensText: string | null;
  description: string | null;
  applicationAndDosage: string | null;
  shelfLife: string | null;
  storageConditions: string | null;
  optionalNutrients: Record<AnnexIiOptionalNutrientKey, number | null>;
  otherNutrient: {
    label: string | null;
    value: number | null;
    unit: string | null;
  };
};

export type TechnicalSheetDocumentListItem = {
  id: string;
  fileName: string;
  mimeType: string | null;
  documentType: string;
  status: string;
  confidence: number | null;
  errorMessage: string | null;
  createdAt: string;
  reviewStatus: ReviewStatus | null;
  productName: string | null;
};

export type TechnicalSheetReviewData = {
  document: {
    id: string;
    fileName: string;
    mimeType: string | null;
    documentType: string;
    status: string;
    confidence: number | null;
    errorMessage: string | null;
    createdAt: string;
  };
  extraction: {
    id: string;
    productName: string | null;
    productCode: string | null;
    manufacturer: string | null;
    brand: string | null;
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
    baseQuantity: number;
    baseUnit: string;
    servingQuantity: number | null;
    servingUnit: string | null;
    householdMeasure: string | null;
    servingsPerPackage: string | null;
    reviewStatus: ReviewStatus;
    confidence: number | null;
    approvedTargetId: string | null;
    fieldsForReview: string[];
  };
  nutrients: Array<{
    id: string;
    nutrientKey: string;
    label: string;
    value: number | null;
    unit: string | null;
    baseQuantity: number;
    baseUnit: string;
    dailyValuePercent: number | null;
    sourceText: string | null;
    confidence: number | null;
  }>;
  allergens: Array<{
    id: string;
    allergenKey: string;
    label: string;
    declarationType: string | null;
    present: boolean | null;
    controlled: boolean | null;
    sourceText: string | null;
    confidence: number | null;
  }>;
  additionalInfo: TechnicalSheetAdditionalInfoGroup[];
};

export type TechnicalSheetAdditionalInfoGroup = {
  title: string;
  items: Array<{
    label: string;
    value: string;
  }>;
};
