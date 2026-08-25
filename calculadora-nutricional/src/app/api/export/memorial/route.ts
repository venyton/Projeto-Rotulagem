import { NextRequest, NextResponse } from "next/server";

import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";
import {
    calculateRecipe,
    CalculatedNutrients,
    normalizeManualMicronutrients,
    SelectedIngredient,
} from "@/features/tables/domain/nutrients";
import { loadAuthoritativeTableCalculation } from "@/features/tables/services/authoritative-export";
import {
    CALCULATION_VERSION,
    getIngredientSourceLabel,
    MEMORIAL_CORE_NUTRIENTS,
    MEMORIAL_MICRONUTRIENTS,
    MEMORIAL_REQUIRED_MICRONUTRIENT_KEYS,
} from "@/features/tables/domain/memorial";
import { MICRONUTRIENTS, MICRO_KEYS } from "@/features/tables/domain/micronutrients";
import { POPULATION_LABELS, PopGroup, VDR } from "@/features/tables/domain/constants";
import { calculateVD } from "@/features/tables/domain/anvisa";
import {
    createMemorialPdf,
    createTechnicalSheetPdf,
    MemorialComponent,
    MemorialDocumentData,
    MemorialSpecificationRow,
} from "@/lib/export/memorial-pdf";
import { createMemorialXlsx } from "@/lib/export/memorial-xlsx";
import { createTechnicalSheetXlsx } from "@/lib/export/technical-sheet-xlsx";
import {
    consumeRequestRateLimit,
    getRequestRateLimit,
    rateLimitResponse,
} from "@/lib/security/request-rate-limit";
import { getRuntimeResponseBodyLimitBytes } from "@/lib/security/request-body-limit";
import { isDatabaseId } from "@/lib/validation/identifiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REGULATORY_CATEGORY_LABELS: Record<string, string> = {
    "general-food": "Alimento em geral",
    supplement: "Suplemento alimentar",
    "special-purpose": "Alimento para fins especiais",
    "infant-formula": "Fórmula infantil",
    "enteral-formula": "Fórmula para nutrição enteral",
    "metabolic-formula": "Fórmula dietoterápica",
    "lactose-restriction": "Dieta com restrição de lactose",
    "hyposodium-salt": "Sal hipossódico",
};

type SnapshotRecord = Record<string, unknown>;

function isRecord(value: unknown): value is SnapshotRecord {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown, fallback = 0) {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function readPositiveNumber(value: unknown) {
    const number = readNumber(value);
    return number > 0 ? number : 0;
}

function readText(value: unknown, maxLength: number) {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function readExtraConstituents(value: unknown) {
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
        if (!isRecord(item)) return [];
        const name = readText(item.name, 120);
        if (!name) return [];
        return [{
            name,
            amount: readText(item.amount, 40),
            unit: readText(item.unit, 20) || "g",
        }];
    });
}

function readAdditionalConstituents(value: unknown) {
    return readExtraConstituents(value).map((item) => ({
        ...item,
        source: "Componente adicional informado no cálculo",
    }));
}

function readFirstText(record: SnapshotRecord, keys: string[], maxLength: number) {
    for (const key of keys) {
        const value = readText(record[key], maxLength);
        if (value) return value;
    }
    return "";
}

function readTechnicalRecord(uiState: SnapshotRecord) {
    return isRecord(uiState.technicalSheet) ? uiState.technicalSheet : uiState;
}

function readSpecificationRows(value: unknown): MemorialSpecificationRow[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
        if (!isRecord(item)) return [];
        return [{
            parameter: readFirstText(item, ["parameter", "name", "label"], 160),
            specification: readFirstText(item, ["specification", "limit", "value"], 240),
            method: readFirstText(item, ["method", "analysisMethod"], 160),
        }];
    }).slice(0, 100);
}

function readRevisionRows(value: unknown) {
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
        if (!isRecord(item)) return [];
        return [{
            revision: readFirstText(item, ["revision", "version"], 40),
            date: readFirstText(item, ["date", "revisionDate"], 80),
            description: readFirstText(item, ["description", "change"], 300),
            responsible: readFirstText(item, ["responsible", "author"], 160),
        }];
    }).slice(0, 50);
}

function readApprovalData(value: unknown, fallbackName = "") {
    const record = isRecord(value) ? value : {};
    return {
        name: readFirstText(record, ["name", "fullName"], 160) || fallbackName,
        role: readFirstText(record, ["role", "cargo", "position"], 120),
        date: readFirstText(record, ["date"], 80),
        signature: readFirstText(record, ["signature"], 160),
    };
}

function formatDateOnly(value: unknown, fallback: Date) {
    const text = readText(value, 80);
    if (text) return text;
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeZone: "America/Sao_Paulo",
    }).format(fallback);
}

function buildTechnicalData(
    tableId: string,
    uiState: SnapshotRecord,
    items: SelectedIngredient[],
    selectedProduct: string,
    regulatoryCategory: string,
    generatedAt: Date,
    preparedBy: string,
): MemorialDocumentData["technical"] {
    const source = readTechnicalRecord(uiState);
    const ingredientNames = items.map((item) => item.ingredient.name).filter(Boolean).join("; ");
    const missingRows = (rows: MemorialSpecificationRow[]) => rows;

    return {
        documentId: `MEM-${tableId}`,
        code: readFirstText(source, ["code", "productCode"], 80),
        revision: readFirstText(source, ["revision"], 40),
        issueDate: formatDateOnly(source.issueDate, generatedAt),
        brand: readFirstText(source, ["brand", "manufacturer"], 160),
        eanGtin: readFirstText(source, ["eanGtin", "ean", "gtin"], 80),
        category: readFirstText(source, ["category", "productCategory"], 160) || REGULATORY_CATEGORY_LABELS[regulatoryCategory] || regulatoryCategory,
        designation: readFirstText(source, ["designation"], 240) || selectedProduct,
        description: readFirstText(source, ["description"], 2_000) || readText(uiState.productDescription, 2_000),
        ingredients: readFirstText(source, ["ingredients", "ingredientsText", "compositionText"], 4_000) || ingredientNames,
        recommendedUse: readFirstText(source, ["recommendedUse", "applicationAndDosage"], 2_000),
        physicochemical: {
            rows: missingRows(readSpecificationRows(source.physicochemical || source.physicochemicalSpecs)),
        },
        microbiological: {
            legislation: readFirstText(source, ["microbiologicalLegislation"], 500) || "Legislação aplicada: RDC nº 724, de 01/07/2022 e IN nº 161, de 01/07/2022 / ANVISA / MS",
            rows: missingRows(readSpecificationRows(source.microbiological || source.microbiologicalSpecs)),
        },
        contaminants: {
            legislation: readFirstText(source, ["contaminantsLegislation"], 500) || "Legislação aplicada: RDC nº 722, de 01/07/2022; IN nº 160, de 01/07/2022; e IN nº 351, de 18/03/2025 / ANVISA / MS",
            rows: missingRows(readSpecificationRows(source.contaminants || source.contaminantSpecs)),
        },
        foreignMatter: {
            legislation: readFirstText(source, ["foreignMatterLegislation"], 500) || "Legislação aplicada: RDC nº 623, de 09/03/2022 / ANVISA / MS",
            rows: missingRows(readSpecificationRows(source.foreignMatter || source.foreignMatterSpecs)),
        },
        presentation: readFirstText(source, ["presentation"], 1_000),
        validity: readFirstText(source, ["validity", "shelfLife"], 500),
        storage: readFirstText(source, ["storage", "storageConditions"], 2_000),
        packaging: readFirstText(source, ["packaging", "packagingText"], 2_000),
        palletization: readFirstText(source, ["palletization", "palletizationText"], 2_000),
        revisions: readRevisionRows(source.revisions || source.revisionHistory),
        preparedBy: readApprovalData(source.preparedBy, preparedBy),
        approvedBy: readApprovalData(source.approvedBy),
    };
}

function toValues(nutrients: CalculatedNutrients) {
    return nutrients as unknown as Record<string, number | { value: number; unit: string }>;
}

function nutrientNumber(nutrients: CalculatedNutrients | Record<string, unknown>, key: string) {
    const value = (nutrients as Record<string, unknown>)[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function customNutrientEntries(nutrients: CalculatedNutrients | Record<string, unknown>) {
    const value = nutrients.customNutrients;
    if (!isRecord(value)) return [];

    return Object.entries(value).flatMap(([name, raw]) => {
        if (!isRecord(raw)) return [];
        return [{ label: name, unit: readText(raw.unit, 30) || "unidade", value: readNumber(raw.value) }];
    });
}

function scaleNutrients(nutrients: CalculatedNutrients, factor: number): CalculatedNutrients {
    const scaled = { ...nutrients };
    for (const key of Object.keys(scaled) as Array<keyof CalculatedNutrients>) {
        if (key === "customNutrients") continue;
        (scaled[key] as number) = nutrientNumber(nutrients, key) * factor;
    }
    scaled.customNutrients = Object.fromEntries(
        Object.entries(nutrients.customNutrients || {}).map(([name, value]) => [name, {
            value: value.value * factor,
            unit: value.unit,
        }])
    );
    return scaled;
}

function addNutrientKeySet(target: Set<string>, nutrients: CalculatedNutrients | Record<string, unknown>) {
    for (const key of MICRO_KEYS) {
        if (Math.abs(nutrientNumber(nutrients, key)) > 0.0000005) target.add(key);
    }
    for (const item of customNutrientEntries(nutrients)) target.add(item.label);
}

function buildRows(
    nutrients: CalculatedNutrients,
    selectedMicronutrients: Set<string>,
    includeAllCore = true
) {
    const values = toValues(nutrients);
    const rows = MEMORIAL_CORE_NUTRIENTS
        .filter((definition) => includeAllCore || Math.abs(nutrientNumber(values, definition.key)) > 0.0000005)
        .map((definition) => ({
            label: definition.label,
            unit: definition.unit,
            value: nutrientNumber(values, definition.key),
        }));

    rows.push(
        ...MEMORIAL_MICRONUTRIENTS
            .filter((definition) => selectedMicronutrients.has(definition.key as string) || Math.abs(nutrientNumber(values, definition.key as string)) > 0.0000005)
            .map((definition) => ({
                label: definition.label,
                unit: definition.unit,
                value: nutrientNumber(values, definition.key as string),
            }))
    );

    rows.push(...customNutrientEntries(values));
    return rows;
}

function componentRows(
    composition: CalculatedNutrients,
    factor: number,
    selectedMicronutrients: Set<string>
) {
    return buildRows(scaleNutrients(composition, factor), selectedMicronutrients);
}

function buildComponent(
    item: SelectedIngredient,
    source: string,
    totalWeight: number,
    portionSize: number,
    prepared: {
        finalYield: number;
        powderTotalWeight: number;
        powderPortionSize: number;
        isPowder: boolean;
    } | null,
    selectedMicronutrients: Set<string>
): MemorialComponent {
    const composition = calculateRecipe([item], 100).per100g;
    const per100Factor = prepared
        ? (prepared.isPowder ? item.quantity / Math.max(prepared.finalYield, 1) : item.quantity / Math.max(prepared.finalYield, 1))
        : item.quantity / Math.max(totalWeight, 1);
    const perPortionFactor = prepared
        ? (prepared.isPowder
            ? (item.quantity * prepared.powderPortionSize) / Math.max(100 * prepared.powderTotalWeight, 1)
            : 0)
        : (item.quantity * portionSize) / Math.max(100 * totalWeight, 1);
    const percentageBase = prepared ? Math.max(prepared.finalYield, 1) : Math.max(totalWeight, 1);

    return {
        name: item.ingredient.name,
        quantity: item.quantity,
        percentage: (item.quantity / percentageBase) * 100,
        function: "Não informado no cadastro",
        source,
        composition: buildRows(composition, selectedMicronutrients).map((row) => ({
            label: row.label,
            unit: row.unit,
            value: row.value,
        })),
        contributionPer100: componentRows(composition, per100Factor, selectedMicronutrients),
        contributionPerPortion: componentRows(composition, perPortionFactor, selectedMicronutrients),
    };
}

function buildResultValues(
    per100g: CalculatedNutrients,
    perPortion: CalculatedNutrients,
    totalWeight: number,
    selectedMicronutrients: Set<string>,
    popGroup: PopGroup,
) {
    const vdr = VDR[popGroup] || VDR.adultos;
    const dailyValuePercent = (key: string, value: number) => {
        const record = vdr as Record<string, number | null | undefined>;
        let reference = record[key];
        if (key === "sugarAdded" && reference === undefined) reference = 50;
        if (key === "fatTrans" && reference === undefined) reference = 2;
        return calculateVD(value, reference ?? null);
    };
    const totalRecipeValue = (value: number) => value * totalWeight / 100;
    const rows = MEMORIAL_CORE_NUTRIENTS.map((definition) => ({
        label: definition.label,
        unit: definition.unit,
        totalRecipe: totalRecipeValue(nutrientNumber(per100g, definition.key as string)),
        per100: nutrientNumber(per100g, definition.key as string),
        perPortion: nutrientNumber(perPortion, definition.key as string),
        dailyValuePercent: dailyValuePercent(definition.key as string, nutrientNumber(perPortion, definition.key as string)),
    }));

    rows.push(
        ...MEMORIAL_MICRONUTRIENTS
            .filter((definition) => selectedMicronutrients.has(definition.key as string))
            .map((definition) => ({
                label: definition.label,
                unit: definition.unit,
                totalRecipe: totalRecipeValue(nutrientNumber(per100g, definition.key as string)),
                per100: nutrientNumber(per100g, definition.key as string),
                perPortion: nutrientNumber(perPortion, definition.key as string),
                dailyValuePercent: dailyValuePercent(definition.key as string, nutrientNumber(perPortion, definition.key as string)),
            }))
    );

    const customNames = new Set([
        ...customNutrientEntries(per100g).map((item) => item.label),
        ...customNutrientEntries(perPortion).map((item) => item.label),
    ]);
    for (const name of customNames) {
        const per100Item = customNutrientEntries(per100g).find((item) => item.label === name);
        const perPortionItem = customNutrientEntries(perPortion).find((item) => item.label === name);
        rows.push({
            label: name,
            unit: per100Item?.unit || perPortionItem?.unit || "unidade",
            totalRecipe: totalRecipeValue(per100Item?.value || 0),
            per100: per100Item?.value || 0,
            perPortion: perPortionItem?.value || 0,
            dailyValuePercent: "-",
        });
    }

    return rows;
}

function buildVerification(
    components: MemorialComponent[],
    per100g: CalculatedNutrients,
    totalWeight: number,
): MemorialDocumentData["verification"] {
    const formulationPercent = components.reduce((sum, component) => sum + component.percentage, 0);
    const energySummedPer100 = totalWeight > 0
        ? components.reduce((sum, component) => {
            const energy = component.composition.find((item) => item.label === "Valor energético")?.value || 0;
            return sum + energy * component.quantity / totalWeight;
        }, 0)
        : 0;
    const energyEstimatedPer100 = nutrientNumber(per100g, "energy");
    const energyDifferencePercent = energySummedPer100 > 0
        ? Math.abs(energyEstimatedPer100 - energySummedPer100) / energySummedPer100 * 100
        : 0;

    return {
        formulationPercent,
        formulationStatus: Math.abs(formulationPercent - 100) <= 0.01 ? "Conforme" : "Revisar formulação",
        energySummedPer100,
        energyEstimatedPer100,
        energyDifferencePercent,
        energyStatus: energySummedPer100 <= 0
            ? "Não disponível"
            : energyDifferencePercent > 5
                ? "Diferença relevante — revisar"
                : "Conforme",
    };
}

function safeFileName(value: string) {
    const normalized = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return normalized || "nutricional";
}

export async function GET(req: NextRequest) {
    const tableId = req.nextUrl.searchParams.get("tableId") || "";
    if (!isDatabaseId(tableId)) {
        return NextResponse.json({ error: "Tabela inválida." }, { status: 400 });
    }

    let context: Awaited<ReturnType<typeof requireModuleAccess>>;
    try {
        context = await requireModuleAccess(SAAS_MODULES.EXPORTS);
    } catch (error) {
        if (error instanceof ModuleAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const requestLimit = await consumeRequestRateLimit(
        "exports",
        context.user.id,
        getRequestRateLimit("exports"),
    );
    if (!requestLimit.allowed) {
        return rateLimitResponse(requestLimit, { error: "Limite temporário de exportações atingido." });
    }

    try {
        const authority = await loadAuthoritativeTableCalculation(tableId, context.organization.id);
        if (!authority.ok) {
            const status = authority.error === "Tabela não encontrada." ? 404 : 400;
            return NextResponse.json({ error: authority.error }, { status });
        }
        const {
            table,
            uiState,
            ingredients: items,
            preparationIngredients,
            powderBatchWeight: preparationPowderBatchWeight,
            readyPortionSize: preparationReadyPortionSize,
            finalYield: preparationFinalYield,
            powderPortionSize: preparationPowderPortionSize,
            usePreparation: canUsePreparation,
            result: calculation,
        } = authority.data;
        const manualMicronutrients = normalizeManualMicronutrients(uiState.manualMicronutrients);

        const selectedMicronutrients = new Set(
            Array.isArray(uiState.selectedNutrients)
                ? uiState.selectedNutrients.filter((value): value is string => typeof value === "string").slice(0, 100)
                : []
        );
        addNutrientKeySet(selectedMicronutrients, calculation.per100g);
        addNutrientKeySet(selectedMicronutrients, calculation.perPortion);
        for (const item of items) addNutrientKeySet(selectedMicronutrients, item.ingredient as unknown as Record<string, unknown>);
        for (const key of MEMORIAL_REQUIRED_MICRONUTRIENT_KEYS) selectedMicronutrients.add(key);

        const totalWeight = canUsePreparation ? preparationFinalYield : calculation.totalWeight;
        const powderTotalWeight = items.reduce((sum, item) => sum + item.quantity, 0);
        const components = [
            ...items.map((item, index) => buildComponent(
                item,
                readText(table.items[index]?.source, 200) || getIngredientSourceLabel(item.ingredient),
                totalWeight,
                table.portion,
                canUsePreparation
                    ? {
                        finalYield: preparationFinalYield,
                        powderTotalWeight,
                        powderPortionSize: preparationPowderPortionSize || table.portion,
                        isPowder: true,
                    }
                    : null,
                selectedMicronutrients
            )),
            ...(canUsePreparation
                ? preparationIngredients.map((item) => buildComponent(
                    item,
                    getIngredientSourceLabel(item.ingredient),
                    totalWeight,
                    table.portion,
                    {
                        finalYield: preparationFinalYield,
                        powderTotalWeight,
                        powderPortionSize: preparationPowderPortionSize || table.portion,
                        isPowder: false,
                    },
                    selectedMicronutrients
                ))
                : []),
        ];

        const popGroup = table.popGroup as PopGroup;
        const values = buildResultValues(calculation.per100g, calculation.perPortion, totalWeight, selectedMicronutrients, popGroup);
        const portionUnit = table.uom === "ml" ? "ml" : "g";
        const selectedGroup = readText(uiState.selectedGroup, 120) || readText(table.suggestedFoodGroup, 120);
        const selectedProduct = readText(uiState.selectedProduct, 160) || readText(table.suggestedProduct, 160);
        const regulatoryCategory = readText(uiState.regulatoryCategory, 80) || (uiState.isSupplement ? "supplement" : "general-food");
        const packageContent = readPositiveNumber(table.packageContent);
        const generatedAt = new Date();
        const preparedBy = readText(context.user.name, 160);
        const technical = buildTechnicalData(
            tableId,
            uiState,
            items,
            selectedProduct,
            regulatoryCategory,
            generatedAt,
            preparedBy,
        );

        const data: MemorialDocumentData = {
            title: readText(table.title, 160),
            description: readText(uiState.productDescription, 500),
            regulatoryCategory: REGULATORY_CATEGORY_LABELS[regulatoryCategory] || regulatoryCategory,
            foodGroup: selectedGroup,
            productSuggestion: selectedProduct,
            physicalState: portionUnit === "ml" ? "Líquido" : "Sólido ou semissólido",
            populationGroup: POPULATION_LABELS[table.popGroup as PopGroup] || table.popGroup,
            portionSize: readPositiveNumber(table.portion),
            portionUnit,
            householdMeasure: readText(table.householdMeasure, 160),
            netContent: packageContent > 0 ? `${packageContent} ${portionUnit}` : "",
            servingsPerPackage: readText(table.servingsPerPackage, 80),
            totalWeight,
            generatedAt,
            calculationVersion: CALCULATION_VERSION,
            preparedBy,
            values,
            components,
            technical,
            verification: buildVerification(components, calculation.per100g, totalWeight),
            additionalConstituents: readAdditionalConstituents(uiState.extraConstituents),
            manualMicronutrients: MICRONUTRIENTS.flatMap((nutrient) => (
                manualMicronutrients[nutrient.name]
                    ? [{ label: nutrient.label, unit: nutrient.unit }]
                    : []
            )),
            preparation: canUsePreparation
                ? {
                    instructions: readText(uiState.preparationInstructions, 2_000),
                    powderBatchWeight: preparationPowderBatchWeight,
                    addedIngredientsWeight: preparationIngredients.reduce((sum, item) => sum + item.quantity, 0),
                    totalBeforePreparation: preparationPowderBatchWeight + preparationIngredients.reduce((sum, item) => sum + item.quantity, 0),
                    finalYield: preparationFinalYield,
                    preparationLoss: Math.max(0, preparationPowderBatchWeight + preparationIngredients.reduce((sum, item) => sum + item.quantity, 0) - preparationFinalYield),
                    preparationLossPercent: Math.max(0, preparationPowderBatchWeight + preparationIngredients.reduce((sum, item) => sum + item.quantity, 0) - preparationFinalYield) / Math.max(preparationPowderBatchWeight + preparationIngredients.reduce((sum, item) => sum + item.quantity, 0), 1) * 100,
                    readyPortionSize: preparationReadyPortionSize,
                    powderPortionSize: preparationPowderPortionSize || table.portion,
                    addedIngredients: preparationIngredients.map((item) => ({ name: item.ingredient.name, quantity: item.quantity })),
                }
                : undefined,
        };

        const documentType = req.nextUrl.searchParams.get("document") === "technical" ? "technical" : "memorial";
        const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "pdf";
        const payload = format === "xlsx"
            ? documentType === "technical"
                ? await createTechnicalSheetXlsx(data)
                : await createMemorialXlsx(data)
            : documentType === "technical"
                ? createTechnicalSheetPdf(data)
                : createMemorialPdf(data);
        if (payload.byteLength > getRuntimeResponseBodyLimitBytes(25)) {
            return NextResponse.json({ error: "Arquivo de exportação excede o limite suportado pelo ambiente." }, { status: 413 });
        }
        const extension = format === "xlsx" ? "xlsx" : "pdf";
        const contentType = format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf";
        const documentName = documentType === "technical" ? "ficha-tecnica" : "memorial-calculo";
        return new NextResponse(payload, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${documentName}-${safeFileName(data.title)}.${extension}"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch {
        return NextResponse.json({ error: "Falha ao gerar o memorial de cálculo." }, { status: 500 });
    }
}
