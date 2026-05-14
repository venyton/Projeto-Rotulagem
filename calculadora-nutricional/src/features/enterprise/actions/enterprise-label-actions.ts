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

export async function saveEnterpriseLabelProject(
    input: SaveEnterpriseLabelProjectInput
): Promise<SaveEnterpriseLabelProjectResult> {
    const user = await getCurrentUser();
    if (!user) return { error: "Não autorizado" };

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

    const project = await prisma.enterpriseLabelProject.findFirst({
        where: { id: input.projectId, userId: user.id },
        select: { id: true },
    });

    if (!project) return { error: "Projeto Enterprise não encontrado." };

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
        Object.entries(data).filter(([, value]) => typeof value === "string" && value.trim().length > 0)
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
