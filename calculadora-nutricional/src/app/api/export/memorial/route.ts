import { getComplianceProfileRules, isRegulatoryCategory, shouldShowDailyValue, type ComplianceProfile } from "@/features/tables/domain/regulatory-declarations";
import { selectedConstituentRows } from "@/features/tables/domain/extra-constituents";
import { prisma } from "@/lib/prisma";
import { readProductSheet } from "@/features/product-technical-sheets/domain/product-sheet";
import { NextRequest, NextResponse } from "next/server";

import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";
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
import { checkFOP, inferFopFoodType, calculateVDFromDisplay, formatAnnexIvNutrientPair, formatOptionalNutrient, type AnnexIvNutrientKey } from "@/features/tables/domain/anvisa";
import {
    createMemorialPdf,
    createTechnicalSheetPdf,
    MemorialComponent,
    MemorialDocumentData,
    MemorialValue,
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
    selectedProduct: string,
    regulatoryCategory: string,
    generatedAt: Date,
    preparedBy: string,
): MemorialDocumentData["technical"] {
    const source = readTechnicalRecord(uiState);
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
        ingredients: readFirstText(source, ["ingredients", "ingredientsText", "compositionText"], 4_000),
        recommendedUse: readFirstText(source, ["recommendedUse", "applicationAndDosage"], 2_000),
        physicochemical: {
            rows: missingRows(readSpecificationRows(source.physicochemical || source.physicochemicalSpecs)),
        },
        microbiological: {
            legislation: readFirstText(source, ["microbiologicalLegislation"], 500),
            rows: missingRows(readSpecificationRows(source.microbiological || source.microbiologicalSpecs)),
        },
        contaminants: {
            legislation: readFirstText(source, ["contaminantsLegislation"], 500),
            rows: missingRows(readSpecificationRows(source.contaminants || source.contaminantSpecs)),
        },
        foreignMatter: {
            legislation: readFirstText(source, ["foreignMatterLegislation"], 500),
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
        powderBatchWeight: number;
        powderPortionSize: number;
        isPowder: boolean;
    } | null,
    selectedMicronutrients: Set<string>
): MemorialComponent {
    const composition = calculateRecipe([item], 100).per100g;
    const powderWeight = prepared?.powderTotalWeight || 1;
    const finalWeight = (prepared ? prepared.finalYield : totalWeight) || 1;
    const per100Factor = prepared
        ? (prepared.isPowder ? item.quantity * prepared.powderBatchWeight / powderWeight : item.quantity) / finalWeight
        : item.quantity / finalWeight;
    const perPortionFactor = prepared
        ? (prepared.isPowder
            ? (item.quantity * prepared.powderPortionSize) / (100 * powderWeight)
            : 0)
        : (item.quantity * portionSize) / (100 * finalWeight);
    const usedQuantity = prepared?.isPowder
        ? item.quantity * prepared.powderBatchWeight / powderWeight
        : item.quantity;
    const percentageBase = finalWeight;

    return {
        name: item.ingredient.name,
        quantity: usedQuantity,
        quantityExact: prepared?.isPowder ? undefined : item.quantityExact,
        percentage: (usedQuantity / percentageBase) * 100,
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
    isSupplement: boolean,
) {
    const vdr = VDR[popGroup] || VDR.adultos;
    const dailyValuePercent = (key: string, value: number, unit = "g") => {
        const record = vdr as Record<string, number | null | undefined>;
        let reference = record[key];
        if (key === "sugarAdded" && reference === undefined) reference = 50;
        if (key === "fatTrans" && reference === undefined) reference = 2;
        const coreKeys: string[] = ["energy", "carbs", "sugarTotal", "sugarAdded", "protein", "fatTotal", "fatSat", "fatTrans", "fiber", "sodium"];
        const display = coreKeys.includes(key)
            ? formatAnnexIvNutrientPair(key as AnnexIvNutrientKey, { per100g, perPortion }, { isSupplement }).portion
            : formatOptionalNutrient(value, unit);
        return calculateVDFromDisplay(display, reference ?? null);
    };
    const totalRecipeValue = (value: number) => value * totalWeight / 100;
    const rows: MemorialValue[] = MEMORIAL_CORE_NUTRIENTS.map((definition) => ({
        label: definition.label,
        unit: definition.unit,
        totalRecipe: totalRecipeValue(nutrientNumber(per100g, definition.key as string)),
        per100: nutrientNumber(per100g, definition.key as string),
        perPortion: nutrientNumber(perPortion, definition.key as string),
        dailyValuePercent: dailyValuePercent(definition.key as string, nutrientNumber(perPortion, definition.key as string), definition.unit),
        display100: formatAnnexIvNutrientPair(definition.key as AnnexIvNutrientKey, { per100g, perPortion }, { isSupplement }).per100,
        displayPortion: formatAnnexIvNutrientPair(definition.key as AnnexIvNutrientKey, { per100g, perPortion }, { isSupplement }).portion,
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
                dailyValuePercent: dailyValuePercent(definition.key as string, nutrientNumber(perPortion, definition.key as string), definition.unit),
                display100: formatOptionalNutrient(nutrientNumber(per100g, definition.key as string), definition.unit),
                displayPortion: formatOptionalNutrient(nutrientNumber(perPortion, definition.key as string), definition.unit),
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
                        powderBatchWeight: preparationPowderBatchWeight,
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
                        powderBatchWeight: preparationPowderBatchWeight,
                        powderPortionSize: preparationPowderPortionSize || table.portion,
                        isPowder: false,
                    },
                    selectedMicronutrients
                ))
                : []),
        ];

        const popGroup = table.popGroup as PopGroup;
        const values = buildResultValues(calculation.per100g, calculation.perPortion, totalWeight, selectedMicronutrients, popGroup, Boolean(uiState.isSupplement));
        const selectedForLabel = new Set(Array.isArray(uiState.selectedNutrients) ? uiState.selectedNutrients.filter((item): item is string => typeof item === "string") : []);
        const labelValues = buildResultValues(calculation.per100g, calculation.perPortion, totalWeight, selectedForLabel, popGroup, Boolean(uiState.isSupplement));
        const knownLabelCount = MEMORIAL_CORE_NUTRIENTS.length + MEMORIAL_MICRONUTRIENTS.filter(item => selectedForLabel.has(item.key)).length;
        const rawExtras = Array.isArray(uiState.extraConstituents) ? uiState.extraConstituents.flatMap(item => isRecord(item) ? [{ name: readText(item.name, 120) }] : []) : [];
        const extras = selectedConstituentRows(rawExtras, calculation.per100g, calculation.perPortion);
        const technicalValues = [...labelValues.slice(0, knownLabelCount), ...extras.map(item => ({ label: item.name, unit: item.unit, totalRecipe: 0, per100: item.per100 ?? 0, perPortion: item.portion ?? 0, display100: item.per100 === undefined ? "-" : formatOptionalNutrient(item.per100, item.unit), displayPortion: item.portion === undefined ? "-" : formatOptionalNutrient(item.portion, item.unit), dailyValuePercent: "-" }))];
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
            selectedProduct,
            regulatoryCategory,
            generatedAt,
            preparedBy,
        );

        const requestedTechnical = req.nextUrl.searchParams.get("document") === "technical";
        const savedSheet = requestedTechnical ? await prisma.productTechnicalSheet.findFirst({ where: { tableId, organizationId: context.organization.id }, select: { data: true } }) : null;
        let productSheet = savedSheet ? readProductSheet(savedSheet.data) : undefined;
        if (productSheet && contextHasModuleAccess(context, SAAS_MODULES.ENTERPRISE_LABELS)) {
            const approved = await prisma.enterpriseLabelVersion.findFirst({ where: { baseTableId: tableId, approvalStatus: "APPROVED", project: { organizationId: context.organization.id, market: "br" } }, orderBy: { updatedAt: "desc" }, select: { legalData: true } });
            const legal = isRecord(approved?.legalData) ? approved.legalData : {};
            productSheet = { ...productSheet, fields: { ...productSheet.fields, ...(typeof legal.ingredientsStatement === "string" && legal.ingredientsStatement ? { ingredients: legal.ingredientsStatement } : {}), ...(typeof legal.allergenStatement === "string" && legal.allergenStatement ? { allergens: legal.allergenStatement } : {}) } };
        }
        if (productSheet) {
            const profile: ComplianceProfile = ["general", "bottled-water", "annex-xvi", "iodized-salt", "flour"].includes(String(uiState.complianceProfile)) ? uiState.complianceProfile as ComplianceProfile : "general";
            const rules = getComplianceProfileRules(profile);
            const automaticStatements = [rules.requiresIodizedSaltStatement ? readText(uiState.iodizedSaltStatement, 1000) : "", rules.requiresFlourStatement ? readText(uiState.flourStatement, 1000) : ""].filter(Boolean);
            const usePrepared = uiState.fopReferenceMode === "prepared" && !canUsePreparation;
            const reference = usePrepared ? { sugarAdded: readPositiveNumber(uiState.preparedSugarAdded), fatSat: readPositiveNumber(uiState.preparedFatSat), sodium: readPositiveNumber(uiState.preparedSodium) } : calculation.per100g;
            const type = uiState.fopFoodType === "liquid" || uiState.fopFoodType === "solid" ? uiState.fopFoodType : inferFopFoodType(table.householdMeasure);
            const status = checkFOP(reference, type);
            const active = [status.highSugar ? "AÇÚCAR ADICIONADO" : "", status.highFat ? "GORDURA SATURADA" : "", status.highSodium ? "SÓDIO" : ""].filter(Boolean);
            const frontal = !rules.excludedFromRdc429 && !rules.fopForbiddenByCategory && uiState.enableFopLupa !== false && active.length ? `ALTO EM ${active.join(", ")}` : "";
            const original = productSheet.fields.otherStatements || "";
            productSheet = { ...productSheet, fields: { ...productSheet.fields, issueDate: productSheet.fields.issueDate || formatDateOnly(undefined, generatedAt), preparedBy: productSheet.fields.preparedBy || preparedBy, ...(frontal ? { frontal } : {}), ...(automaticStatements.length ? { otherStatements: [original, ...automaticStatements.filter(item => !original.includes(item))].filter(Boolean).join(" ") } : {}) } };
        }
        const productLaws = productSheet ? await prisma.productLegislation.findMany({ where: { organizationId: context.organization.id, id: { in: productSheet.laws.map(law => law.id) } }, select: { id: true, number: true, title: true } }) : undefined;

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
            values: requestedTechnical ? technicalValues : values,
            components,
            technical,
            showDailyValue: shouldShowDailyValue(isRegulatoryCategory(regulatoryCategory) ? regulatoryCategory : "general-food"),
            productSheet,
            productLaws,
            verification: buildVerification(components, calculation.per100g, totalWeight),
            additionalConstituents: [],
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
                    addedIngredients: preparationIngredients.map((item) => ({ name: item.ingredient.name, quantity: item.quantity, quantityExact: item.quantityExact })),
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
                "Content-Disposition": `${req.nextUrl.searchParams.get("preview") === "1" && format === "pdf" ? "inline" : "attachment"}; filename="${documentName}-${safeFileName(data.title)}.${extension}"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch {
        return NextResponse.json({ error: "Falha ao gerar o memorial de cálculo." }, { status: 500 });
    }
}
