"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import {
    EnterpriseApprovalStatus,
    EnterpriseExportType,
    Prisma,
} from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    calculateEnterpriseNutrients,
    getFrontWarnings,
    getNutritionLines,
    validateEnterpriseTable,
    type ApprovalStatus,
    type EnterpriseLabelProjectSummary,
    type EnterpriseTable,
    type FoodPhysicalState,
    type InternationalMarket,
    type LegalLabelData,
} from "@/features/enterprise/domain/enterprise";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";

export type SaveEnterpriseLabelProjectInput = {
    baseTableId: string;
    market: InternationalMarket;
    foodState: FoodPhysicalState;
    approvalStatus: ApprovalStatus;
    table: EnterpriseTable;
    legalData: LegalLabelData;
    gtin?: string;
    lot?: string;
    notes?: string;
};

export type SaveEnterpriseLabelProjectResult = {
    success?: boolean;
    error?: string;
    project?: EnterpriseLabelProjectSummary;
};

export type RecordEnterpriseExportInput = {
    projectId: string;
    versionId?: string | null;
    exportType: "PNG" | "JSON" | "GS1_DIGITAL_LINK";
    fileName?: string;
    payload?: unknown;
};

const APPROVAL_TO_DB: Record<ApprovalStatus, EnterpriseApprovalStatus> = {
    draft: EnterpriseApprovalStatus.DRAFT,
    quality: EnterpriseApprovalStatus.QUALITY,
    regulatory: EnterpriseApprovalStatus.REGULATORY,
    marketing: EnterpriseApprovalStatus.MARKETING,
    approved: EnterpriseApprovalStatus.APPROVED,
};

const DB_TO_APPROVAL: Record<EnterpriseApprovalStatus, ApprovalStatus> = {
    DRAFT: "draft",
    QUALITY: "quality",
    REGULATORY: "regulatory",
    MARKETING: "marketing",
    APPROVED: "approved",
};

const EXPORT_TO_DB: Record<RecordEnterpriseExportInput["exportType"], EnterpriseExportType> = {
    PNG: EnterpriseExportType.PNG,
    JSON: EnterpriseExportType.JSON,
    GS1_DIGITAL_LINK: EnterpriseExportType.GS1_DIGITAL_LINK,
};

const APPROVAL_OWNER: Record<ApprovalStatus, string> = {
    draft: "P&D",
    quality: "Qualidade",
    regulatory: "Assuntos regulatórios",
    marketing: "Marca",
    approved: "Gestor",
};

const LEGAL_DATA_KEYS = new Set<keyof LegalLabelData>([
    "legalName", "category", "language", "intendedClaims", "adjustmentNotes", "ingredientsStatement",
    "allergenStatement", "netQuantity", "drainedWeight", "lotCode", "dateMarking", "responsibleName",
    "responsibleAddress", "importerName", "importerAddress", "countryOfOrigin", "storageInstructions",
    "preparationInstructions", "packageDisplayArea", "referenceAmount", "mandatoryMicronutrients",
    "claimsEvidence", "childMarketingElements", "caffeineAdded", "sweetenersAdded", "addedCriticalNutrients",
    "memberState", "quidStatement", "alcoholVolume", "organicOrSpecialSeals", "frontSymbolSize",
]);

function isSafeId(value: unknown): value is string {
    return typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value);
}

function hasSafeJsonSize(value: unknown, maxBytes: number) {
    try {
        return Buffer.byteLength(JSON.stringify(value), "utf8") <= maxBytes;
    } catch {
        return false;
    }
}

function isSafeEnterpriseTable(table: unknown): table is EnterpriseTable {
    if (!table || typeof table !== "object" || Array.isArray(table)) return false;
    const value = table as EnterpriseTable;
    if (!isSafeId(value.id) || typeof value.title !== "string" || value.title.trim().length < 1 || value.title.length > 160) return false;
    if (!Number.isFinite(value.portion) || value.portion <= 0 || value.portion > 10_000_000) return false;
    if (typeof value.uom !== "string" || value.uom.length > 20) return false;
    if (typeof value.householdMeasure !== "string" || value.householdMeasure.length > 160) return false;
    if (!Array.isArray(value.items) || value.items.length > 200) return false;
    return value.items.every((item) =>
        item && typeof item.name === "string" && item.name.length <= 160 &&
        [item.quantity, item.energy, item.carbs, item.protein, item.fatTotal, item.fatSat, item.fatTrans, item.fiber, item.sodium]
            .every((number) => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 1_000_000_000)
    );
}

export async function saveEnterpriseLabelProject(
    input: SaveEnterpriseLabelProjectInput
): Promise<SaveEnterpriseLabelProjectResult> {
    const user = await getCurrentUser();
    if (!user) return { error: "Não autorizado" };
    if (!input || typeof input !== "object" || !isSafeId(input.baseTableId) || !isSafeEnterpriseTable(input.table)) {
        return { error: "Dados do projeto inválidos." };
    }
    if (!hasSafeJsonSize(input, 1_000_000) || (input.notes?.length ?? 0) > 5_000) {
        return { error: "Dados do projeto excedem o limite permitido." };
    }

    try {
        await requireModuleAccess(SAAS_MODULES.ENTERPRISE_LABELS);
    } catch (error) {
        if (error instanceof ModuleAccessError) return { error: error.message };
        throw error;
    }

    if (!isMarket(input.market) || !isFoodState(input.foodState)) {
        return { error: "Mercado ou base do alimento inválidos." };
    }

    if (!APPROVAL_TO_DB[input.approvalStatus]) {
        return { error: "Status de aprovação inválido." };
    }

    const baseTable = await prisma.generatedTable.findFirst({
        where: { id: input.baseTableId, userId: user.id },
        select: { id: true, title: true },
    });

    if (!baseTable) return { error: "Tabela base não encontrada ou sem permissão." };
    if (!input.table.title?.trim()) return { error: "Informe o nome local do produto." };
    if (!Number.isFinite(input.table.portion) || input.table.portion <= 0) {
        return { error: "Informe uma porção válida." };
    }

    const status = APPROVAL_TO_DB[input.approvalStatus];
    const legalData = sanitizeLegalData(input.legalData);
    const nutrition = calculateEnterpriseNutrients(input.table);
    const validationSnapshot = validateEnterpriseTable(input.table, input.market, input.foodState, legalData);
    const frontWarnings = getFrontWarnings(input.table, input.market, input.foodState);
    const project = await prisma.$transaction(async (tx) => {
        const savedProject = await tx.enterpriseLabelProject.upsert({
            where: {
                userId_baseTableId_market: {
                    userId: user.id,
                    baseTableId: baseTable.id,
                    market: input.market,
                },
            },
            create: {
                userId: user.id,
                baseTableId: baseTable.id,
                title: input.table.title,
                market: input.market,
                status,
            },
            update: {
                title: input.table.title,
                status,
            },
        });

        const lastVersion = await tx.enterpriseLabelVersion.aggregate({
            where: { projectId: savedProject.id },
            _max: { version: true },
        });

        const version = await tx.enterpriseLabelVersion.create({
            data: {
                projectId: savedProject.id,
                userId: user.id,
                baseTableId: baseTable.id,
                version: (lastVersion._max.version || 0) + 1,
                title: input.table.title,
                market: input.market,
                foodState: input.foodState,
                approvalStatus: status,
                tableSnapshot: toJson(input.table),
                legalData: toJson(legalData),
                nutritionSnapshot: toJson({
                    ...nutrition,
                    marketLines: getNutritionLines(input.table, input.market),
                }),
                validationSnapshot: toJson(validationSnapshot),
                frontWarningsSnapshot: toJson(frontWarnings),
                notes: input.notes?.trim() || input.legalData.adjustmentNotes?.trim() || null,
            },
        });

        await tx.enterpriseLabelProject.update({
            where: { id: savedProject.id },
            data: {
                currentVersionId: version.id,
                status,
                title: input.table.title,
            },
        });

        await tx.enterpriseApproval.create({
            data: {
                projectId: savedProject.id,
                userId: user.id,
                status,
                owner: APPROVAL_OWNER[input.approvalStatus],
                note: input.notes?.trim() || input.legalData.adjustmentNotes?.trim() || null,
            },
        });

        return tx.enterpriseLabelProject.findFirstOrThrow({
            where: { id: savedProject.id, userId: user.id },
            include: {
                versions: {
                    where: { id: version.id },
                    take: 1,
                },
            },
        });
    });

    revalidatePath("/dashboard/enterprise");

    return {
        success: true,
        project: mapEnterpriseProject(project),
    };
}

export async function recordEnterpriseLabelExport(input: RecordEnterpriseExportInput) {
    const user = await getCurrentUser();
    if (!user) return { error: "Não autorizado" };
    if (!input || !isSafeId(input.projectId) || !EXPORT_TO_DB[input.exportType]) {
        return { error: "Dados da exportação inválidos." };
    }
    if (input.versionId && !isSafeId(input.versionId)) return { error: "Versão inválida." };
    if ((input.fileName?.length ?? 0) > 180 || !hasSafeJsonSize(input.payload, 250_000)) {
        return { error: "Metadados da exportação excedem o limite permitido." };
    }

    try {
        await requireModuleAccess(SAAS_MODULES.ENTERPRISE_LABELS);
        await requireModuleAccess(SAAS_MODULES.EXPORTS);
    } catch (error) {
        if (error instanceof ModuleAccessError) return { error: error.message };
        throw error;
    }

    const project = await prisma.enterpriseLabelProject.findFirst({
        where: { id: input.projectId, userId: user.id },
        select: { id: true },
    });

    if (!project) return { error: "Projeto Enterprise não encontrado." };

    if (input.versionId) {
        const version = await prisma.enterpriseLabelVersion.findFirst({
            where: { id: input.versionId, projectId: project.id, userId: user.id },
            select: { id: true },
        });
        if (!version) return { error: "Versão Enterprise inválida." };
    }

    await prisma.enterpriseExport.create({
        data: {
            projectId: project.id,
            versionId: input.versionId || null,
            userId: user.id,
            exportType: EXPORT_TO_DB[input.exportType],
            fileName: input.fileName?.trim() || null,
            payload: input.payload === undefined ? undefined : toJson(input.payload),
        },
    });

    revalidatePath("/dashboard/enterprise");
    return { success: true };
}

function mapEnterpriseProject(project: {
    id: string;
    baseTableId: string | null;
    title: string;
    market: string;
    status: EnterpriseApprovalStatus;
    currentVersionId: string | null;
    updatedAt: Date;
    versions: Array<{
        id: string;
        version: number;
        title: string;
        market: string;
        foodState: string;
        approvalStatus: EnterpriseApprovalStatus;
        tableSnapshot: Prisma.JsonValue;
        legalData: Prisma.JsonValue | null;
        notes: string | null;
        updatedAt: Date;
    }>;
}): EnterpriseLabelProjectSummary {
    const version = project.versions[0];

    return {
        id: project.id,
        baseTableId: project.baseTableId,
        title: project.title,
        market: isMarket(project.market) ? project.market : "us",
        status: DB_TO_APPROVAL[project.status],
        currentVersionId: project.currentVersionId,
        updatedAt: project.updatedAt.toISOString(),
        currentVersion: version
            ? {
                id: version.id,
                version: version.version,
                title: version.title,
                market: isMarket(version.market) ? version.market : "us",
                foodState: isFoodState(version.foodState) ? version.foodState : "solid",
                approvalStatus: DB_TO_APPROVAL[version.approvalStatus],
                tableSnapshot: version.tableSnapshot as unknown as EnterpriseTable,
                legalData: (version.legalData || {}) as LegalLabelData,
                notes: version.notes,
                updatedAt: version.updatedAt.toISOString(),
            }
            : null,
    };
}

function sanitizeLegalData(data: LegalLabelData): LegalLabelData {
    return Object.fromEntries(
        Object.entries(data)
            .filter(([key, value]) => LEGAL_DATA_KEYS.has(key as keyof LegalLabelData) && typeof value === "string" && value.trim().length > 0)
            .map(([key, value]) => [key, (value as string).trim().slice(0, 10_000)])
    ) as LegalLabelData;
}

function toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    return prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
}

function isMarket(value: string): value is InternationalMarket {
    return ["br", "us", "eu", "ca", "mx", "cl"].includes(value);
}

function isFoodState(value: string): value is FoodPhysicalState {
    return value === "solid" || value === "liquid";
}
