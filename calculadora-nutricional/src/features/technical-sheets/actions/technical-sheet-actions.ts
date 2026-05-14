"use server";

import { revalidatePath } from "next/cache";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
import { getServerSession } from "next-auth";
import { ExtractionStatus, Prisma, ReviewStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildAiJsonForStorage,
  mapNutrientsToCustomIngredient,
  normalizeTechnicalSheetExtraction,
  type NormalizedExtractedNutrient,
} from "@/features/technical-sheets/domain/technical-sheet-normalizer";
import {
  parseApprovalFormData,
  validateApprovalValues,
} from "@/features/technical-sheets/domain/technical-sheet-validator";
import type {
  TechnicalSheetAdditionalInfoGroup,
  TechnicalSheetActionState,
  TechnicalSheetReviewData,
  TechnicalSheetDocumentListItem,
} from "@/features/technical-sheets/domain/technical-sheet-types";
import {
  extractTechnicalSheetWithGemini,
  TechnicalSheetAiError,
} from "@/features/technical-sheets/services/technical-sheet-ai-service";
import {
  validateTechnicalSheetFile,
  TechnicalSheetFileError,
  type ValidatedTechnicalSheetFile,
} from "@/features/technical-sheets/services/technical-sheet-file-service";

const LOW_CONFIDENCE_THRESHOLD = 0.6;

const EDITABLE_NUTRIENT_LABELS: Record<string, { label: string; unit: string }> = {
  energy: { label: "Valor Energético", unit: "kcal" },
  carbs: { label: "Carboidratos", unit: "g" },
  sugarTotal: { label: "Açúcares Totais", unit: "g" },
  sugarAdded: { label: "Açúcares Adicionados", unit: "g" },
  protein: { label: "Proteínas", unit: "g" },
  fatTotal: { label: "Gorduras Totais", unit: "g" },
  fatSat: { label: "Gorduras Saturadas", unit: "g" },
  fatTrans: { label: "Gorduras Trans", unit: "g" },
  fiber: { label: "Fibra Alimentar", unit: "g" },
  sodium: { label: "Sódio", unit: "mg" },
};

export async function importTechnicalSheet(
  _prevState: TechnicalSheetActionState,
  formData: FormData
): Promise<TechnicalSheetActionState> {
  const session = await getServerSession(authOptions);
  const user = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null;

  if (!user) return { error: "Não autorizado" };

  const rawFiles = formData.getAll("files") as File[];
  if (!rawFiles || rawFiles.length === 0 || (rawFiles.length === 1 && rawFiles[0].size === 0)) {
    return { error: "Nenhum arquivo selecionado." };
  }

  const documentIds: string[] = [];
  const successfulDocumentIds: string[] = [];
  const extractionIds: string[] = [];
  const errors: string[] = [];

  for (const rawFile of rawFiles) {
    if (documentIds.length > 0) {
      await sleep(5000);
    }
    try {
      const file = await validateTechnicalSheetFile(rawFile);
      const result = await processTechnicalSheetFile(user.id, file);
      documentIds.push(result.documentId);
      if (result.extractionId) {
        successfulDocumentIds.push(result.documentId);
        extractionIds.push(result.extractionId);
      }
      if (result.error) errors.push(`${file.fileName}: ${result.error}`);
    } catch (error) {
      const fileName = rawFile?.name || "arquivo";
      errors.push(`${fileName}: ${getUserFacingError(error)}`);
    }
  }

  revalidatePath("/dashboard/ingredients");
  revalidatePath("/dashboard/ingredients/technical-sheets");

  const successCount = extractionIds.length;
  const failedCount = errors.length;

  if (successCount === 0) {
    return {
      error: errors.length > 0 ? errors.join(" | ") : "Falha ao processar arquivos.",
      processedCount: 0,
      failedCount,
    };
  }

  return {
    success: true,
    message:
      failedCount > 0
        ? `Sucesso: ${successCount}. Falhas: ${failedCount}.`
        : `Sucesso: ${successCount} arquivo(s) processado(s).`,
    documentId: successfulDocumentIds[0],
    documentIds: successfulDocumentIds,
    extractionId: extractionIds[0],
    extractionIds,
    processedCount: successCount,
    failedCount,
  };
}

async function processTechnicalSheetFile(
  userId: string,
  file: ValidatedTechnicalSheetFile
): Promise<{ documentId: string; extractionId?: string; error?: string }> {
  const document = await prisma.technicalDocument.create({
    data: {
      userId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      status: ExtractionStatus.PROCESSING,
    },
  });

  try {
    const aiJson = await extractTechnicalSheetWithGemini(file);
    const normalized = normalizeTechnicalSheetExtraction(aiJson);
    const fieldsForReview = new Set(normalized.fieldsForReview);

    if (normalized.confidence < LOW_CONFIDENCE_THRESHOLD) {
      fieldsForReview.add("Baixa confiança geral da extração");
    }

    const filledNutrients = normalized.nutrients.filter((nutrient) => nutrient.value !== null);
    if (normalized.confidence < 0.4 && filledNutrients.length === 0) {
      throw new TechnicalSheetAiError(
        "INVALID_RESPONSE",
        "Não foi possível extrair o documento com segurança. Este arquivo pode exigir OCR ou revisão manual."
      );
    }

    const fieldsForReviewList = Array.from(fieldsForReview);
    const reviewStatus =
      fieldsForReviewList.length > 0 ? ReviewStatus.NEEDS_REVIEW : ReviewStatus.PENDING;

    const extraction = await prisma.$transaction(async (tx) => {
      await tx.technicalDocument.update({
        where: { id: document.id },
        data: {
          documentType: normalized.documentType,
          status: ExtractionStatus.COMPLETED,
          extractedJson: buildAiJsonForStorage(aiJson, fieldsForReviewList),
          confidence: normalized.confidence,
          errorMessage: null,
        },
      });

      return tx.technicalSheetExtraction.create({
        data: {
          documentId: document.id,
          userId,
          ...normalized.extractionData,
          reviewStatus,
          nutrients: {
            create: normalized.nutrients,
          },
          allergens: {
            create: normalized.allergens,
          },
          technicalFields: {
            create: normalized.technicalFields,
          },
        },
      });
    });

    return {
      documentId: document.id,
      extractionId: extraction.id,
    };
  } catch (error) {
    const message = getUserFacingError(error);
    await prisma.technicalDocument.update({
      where: { id: document.id },
      data: {
        status: ExtractionStatus.FAILED,
        errorMessage: message,
      },
    });

    return { documentId: document.id, error: message };
  }
}

/**
 * Lists all technical sheet documents for the user
 */
export async function listTechnicalSheetDocuments(): Promise<TechnicalSheetDocumentListItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const docs = await prisma.technicalDocument.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      extraction: {
        select: {
          productName: true,
          reviewStatus: true,
        },
      },
    },
  });

  return docs.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    documentType: doc.documentType || "Pendente",
    status: doc.status,
    confidence: doc.confidence,
    errorMessage: doc.errorMessage,
    createdAt: doc.createdAt.toISOString(),
    productName: doc.extraction?.productName || null,
    reviewStatus: (doc.extraction?.reviewStatus as any) || null,
  }));
}

/**
 * Gets a specific extraction with full details for review using documentId
 */
export async function getTechnicalSheetExtraction(documentId: string): Promise<TechnicalSheetReviewData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const extraction = await prisma.technicalSheetExtraction.findFirst({
    where: { 
      documentId,
      userId: user.id 
    },
    include: {
      document: true,
      nutrients: true,
      allergens: true,
      technicalFields: {
        orderBy: [{ category: "asc" }, { label: "asc" }],
      },
    },
  });

  if (!extraction) return null;

  const additionalInfo: TechnicalSheetAdditionalInfoGroup[] = [];
  const fieldsByCategory = extraction.technicalFields.reduce((acc, field) => {
    const cat = field.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ label: field.label, value: field.value || "" });
    return acc;
  }, {} as Record<string, Array<{ label: string; value: string }>>);

  for (const [category, items] of Object.entries(fieldsByCategory)) {
    additionalInfo.push({
      title: formatCategoryLabel(category),
      items,
    });
  }

  return {
    document: {
      id: extraction.document.id,
      fileName: extraction.document.fileName,
      mimeType: extraction.document.mimeType,
      documentType: extraction.document.documentType,
      status: extraction.document.status,
      confidence: extraction.document.confidence,
      errorMessage: extraction.document.errorMessage,
      createdAt: extraction.document.createdAt.toISOString(),
    },
    extraction: {
      id: extraction.id,
      productName: extraction.productName,
      productCode: extraction.productCode,
      manufacturer: extraction.manufacturer,
      brand: extraction.brand,
      description: extraction.description,
      applicationAndDosage: extraction.applicationAndDosage,
      compositionText: extraction.compositionText,
      ingredientsText: extraction.ingredientsText,
      containsGluten: extraction.containsGluten,
      glutenText: extraction.glutenText,
      containsGmo: extraction.containsGmo,
      gmoText: extraction.gmoText,
      allergensText: extraction.allergensText,
      mayContainText: extraction.mayContainText,
      shelfLife: extraction.shelfLife,
      storageConditions: extraction.storageConditions,
      packagingText: extraction.packagingText,
      baseQuantity: extraction.baseQuantity,
      baseUnit: extraction.baseUnit,
      servingQuantity: extraction.servingQuantity,
      servingUnit: extraction.servingUnit,
      householdMeasure: extraction.householdMeasure,
      servingsPerPackage: extraction.servingsPerPackage,
      reviewStatus: extraction.reviewStatus,
      confidence: extraction.confidence,
      approvedTargetId: extraction.approvedTargetId,
      fieldsForReview: (extraction.document.extractedJson as { fieldsForReview?: string[] })?.fieldsForReview || [],
    },
    nutrients: extraction.nutrients.map((n) => ({
      id: n.id,
      nutrientKey: n.nutrientKey,
      label: n.label,
      value: n.value,
      unit: n.unit,
      baseQuantity: n.baseQuantity,
      baseUnit: n.baseUnit,
      dailyValuePercent: n.dailyValuePercent,
      sourceText: n.sourceText,
      confidence: n.confidence,
    })),
    allergens: extraction.allergens.map((a) => ({
      id: a.id,
      allergenKey: a.allergenKey,
      label: a.label,
      declarationType: a.declarationType,
      present: a.present,
      controlled: a.controlled,
      sourceText: a.sourceText,
      confidence: a.confidence,
    })),
    additionalInfo,
  };
}

export async function getTechnicalSheetReviewData(
  extractionId: string
): Promise<TechnicalSheetReviewData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const extraction = await prisma.technicalSheetExtraction.findFirst({
    where: { id: extractionId, userId: user.id },
    include: {
      document: true,
      nutrients: true,
      allergens: true,
      technicalFields: {
        orderBy: [{ category: "asc" }, { label: "asc" }],
      },
    },
  });

  if (!extraction) return null;

  const additionalInfo: TechnicalSheetAdditionalInfoGroup[] = [];
  const fieldsByCategory = extraction.technicalFields.reduce((acc, field) => {
    const cat = field.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ label: field.label, value: field.value || "" });
    return acc;
  }, {} as Record<string, Array<{ label: string; value: string }>>);

  for (const [category, items] of Object.entries(fieldsByCategory)) {
    additionalInfo.push({
      title: formatCategoryLabel(category),
      items,
    });
  }

  return {
    document: {
      id: extraction.document.id,
      fileName: extraction.document.fileName,
      mimeType: extraction.document.mimeType,
      documentType: extraction.document.documentType,
      status: extraction.document.status,
      confidence: extraction.document.confidence,
      errorMessage: extraction.document.errorMessage,
      createdAt: extraction.document.createdAt.toISOString(),
    },
    extraction: {
      id: extraction.id,
      productName: extraction.productName,
      productCode: extraction.productCode,
      manufacturer: extraction.manufacturer,
      brand: extraction.brand,
      description: extraction.description,
      applicationAndDosage: extraction.applicationAndDosage,
      compositionText: extraction.compositionText,
      ingredientsText: extraction.ingredientsText,
      containsGluten: extraction.containsGluten,
      glutenText: extraction.glutenText,
      containsGmo: extraction.containsGmo,
      gmoText: extraction.gmoText,
      allergensText: extraction.allergensText,
      mayContainText: extraction.mayContainText,
      shelfLife: extraction.shelfLife,
      storageConditions: extraction.storageConditions,
      packagingText: extraction.packagingText,
      baseQuantity: extraction.baseQuantity,
      baseUnit: extraction.baseUnit,
      servingQuantity: extraction.servingQuantity,
      servingUnit: extraction.servingUnit,
      householdMeasure: extraction.householdMeasure,
      servingsPerPackage: extraction.servingsPerPackage,
      reviewStatus: extraction.reviewStatus,
      confidence: extraction.confidence,
      approvedTargetId: extraction.approvedTargetId,
      fieldsForReview: (extraction.document.extractedJson as { fieldsForReview?: string[] })?.fieldsForReview || [],
    },
    nutrients: extraction.nutrients.map((n) => ({
      id: n.id,
      nutrientKey: n.nutrientKey,
      label: n.label,
      value: n.value,
      unit: n.unit,
      baseQuantity: n.baseQuantity,
      baseUnit: n.baseUnit,
      dailyValuePercent: n.dailyValuePercent,
      sourceText: n.sourceText,
      confidence: n.confidence,
    })),
    allergens: extraction.allergens.map((a) => ({
      id: a.id,
      allergenKey: a.allergenKey,
      label: a.label,
      declarationType: a.declarationType,
      present: a.present,
      controlled: a.controlled,
      sourceText: a.sourceText,
      confidence: a.confidence,
    })),
    additionalInfo,
  };
}

function formatCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    REGULATORY: "Regulatório",
    SENSORY: "Sensorial",
    PHYSICOCHEMICAL: "Físico-químico",
    MICROBIOLOGICAL: "Microbiológico",
    CONTAMINANT: "Contaminantes",
    TRACEABILITY: "Rastreabilidade",
    LOGISTICS: "Logística",
    CERTIFICATION: "Certificações",
    WARNING: "Advertências",
    DECLARATION: "Declarações",
  };
  return labels[category] || category;
}

export async function approveTechnicalSheetExtraction(
  extractionId: string,
  _prevState: TechnicalSheetActionState,
  formData: FormData
): Promise<TechnicalSheetActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Não autorizado" };

  const extraction = await prisma.technicalSheetExtraction.findFirst({
    where: { id: extractionId, userId: user.id },
    include: {
      document: true,
      nutrients: true,
    },
  });

  if (!extraction) return { error: "Extração não encontrada ou sem permissão." };
  if (extraction.document.status === ExtractionStatus.FAILED) {
    return { error: "Não é possível aprovar uma extração com falha." };
  }
  if (extraction.reviewStatus === ReviewStatus.REJECTED) {
    return { error: "Não é possível aprovar uma extração rejeitada." };
  }
  if (extraction.reviewStatus === ReviewStatus.APPROVED && extraction.approvedTargetId) {
    return {
      success: true,
      approvedTargetId: extraction.approvedTargetId,
      message: "Extração já aprovada.",
    };
  }

  const values = parseApprovalFormData(formData);
  if (!Number.isFinite(values.sugarTotal)) values.sugarTotal = 0;
  if (!Number.isFinite(values.sugarAdded)) values.sugarAdded = 0;

  const validationError = validateApprovalValues(values);
  if (validationError) return { error: validationError };

  const mergedNutrients = mergeEditedNutrients(extraction.nutrients, values);
  const customNutrients = {
    ...mapNutrientsToCustomIngredient(mergedNutrients),
    energy: values.energy,
    carbs: values.carbs,
    sugarTotal: values.sugarTotal,
    sugarAdded: values.sugarAdded,
    protein: values.protein,
    fatTotal: values.fatTotal,
    fatSat: values.fatSat,
    fatTrans: values.fatTrans,
    fiber: values.fiber,
    sodium: values.sodium,
  };

  const result = await prisma.$transaction(async (tx) => {
    const ingredient = await tx.customIngredient.create({
      data: {
        userId: user.id,
        name: values.productName,
        ...customNutrients,
        manufacturer: extraction.manufacturer,
        productCode: extraction.productCode,
        ingredientsText: values.ingredientsText,
        containsGluten: values.containsGluten,
        glutenText: extraction.glutenText,
        allergensText: values.allergensText,
        mayContainText: extraction.mayContainText,
        sourceType: "AI_TECHNICAL_SHEET",
        sourceDocumentId: extraction.documentId,
        sourceExtractionId: extraction.id,
      },
    });

    await tx.technicalSheetExtraction.update({
      where: { id: extraction.id },
      data: {
        productName: values.productName,
        ingredientsText: values.ingredientsText,
        containsGluten: values.containsGluten,
        allergensText: values.allergensText,
        reviewStatus: ReviewStatus.APPROVED,
        approvedTargetType: "CustomIngredient",
        approvedTargetId: ingredient.id,
      },
    });

    await syncEditedNutrients(tx, extraction.id, extraction.nutrients, values);
    return ingredient;
  });

  revalidatePath("/dashboard/ingredients");
  revalidatePath("/dashboard/ingredients/technical-sheets");

  return {
    success: true,
    approvedTargetId: result.id,
    message: "Ingrediente salvo em meus ingredientes.",
  };
}

export async function rejectTechnicalSheetExtraction(extractionId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  const extraction = await prisma.technicalSheetExtraction.findFirst({
    where: { id: extractionId, userId: user.id },
  });

  if (!extraction) return;
  if (extraction.reviewStatus === ReviewStatus.APPROVED) {
    return;
  }

  await prisma.technicalSheetExtraction.update({
    where: { id: extraction.id },
    data: { reviewStatus: ReviewStatus.REJECTED },
  });

  revalidatePath("/dashboard/ingredients/technical-sheets");
}

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}


function mergeEditedNutrients(
  nutrients: Array<Pick<NormalizedExtractedNutrient, "nutrientKey" | "value" | "unit" | "sourceText">>,
  values: Record<string, number | string | boolean | null>
) {
  const byKey = new Map(nutrients.map((nutrient) => [nutrient.nutrientKey, { ...nutrient }]));

  for (const [key, meta] of Object.entries(EDITABLE_NUTRIENT_LABELS)) {
    const value = values[key];
    byKey.set(key, {
      nutrientKey: key,
      value: typeof value === "number" && Number.isFinite(value) ? value : 0,
      unit: meta.unit,
      sourceText: byKey.get(key)?.sourceText ?? null,
    });
  }

  return Array.from(byKey.values());
}

async function syncEditedNutrients(
  tx: Prisma.TransactionClient,
  extractionId: string,
  nutrients: Array<{ id: string; nutrientKey: string; sourceText: string | null }>,
  values: Record<string, number | string | boolean | null>
) {
  for (const [key, meta] of Object.entries(EDITABLE_NUTRIENT_LABELS)) {
    const value = values[key];
    const numericValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    const existing = nutrients.find((nutrient) => nutrient.nutrientKey === key);

    if (existing) {
      await tx.extractedNutrient.update({
        where: { id: existing.id },
        data: {
          value: numericValue,
          unit: meta.unit,
        },
      });
    } else {
      await tx.extractedNutrient.create({
        data: {
          extractionId,
          nutrientKey: key,
          label: meta.label,
          value: numericValue,
          unit: meta.unit,
          sourceText: null,
        },
      });
    }
  }
}

function getUserFacingError(error: unknown) {
  if (error instanceof TechnicalSheetAiError) return error.userMessage;
  if (error instanceof TechnicalSheetFileError) return error.message;
  if (error instanceof Error) return error.message;
  return "Não foi possível processar este arquivo. Verifique se o PDF está legível.";
}
