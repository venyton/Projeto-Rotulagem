import { redirect } from "next/navigation";
import type { EnterpriseApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { EnterpriseWorkspace } from "@/features/enterprise/components/EnterpriseWorkspace";
import type {
    ApprovalStatus,
    EnterpriseLabelProjectSummary,
    EnterpriseTable,
    FoodPhysicalState,
    InternationalMarket,
    LegalLabelData,
} from "@/features/enterprise/domain/enterprise";

export default async function EnterprisePage() {
    const context = await getCurrentSaaSContext();
    if (!context) {
        redirect("/login");
    }

    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.ENTERPRISE_LABELS)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.ENTERPRISE_LABELS} />;
    }

    const [tables, projects] = await Promise.all([
        prisma.generatedTable.findMany({
            where: { userId: context.user.id },
            select: {
                id: true,
                title: true,
                portion: true,
                uom: true,
                householdMeasure: true,
                popGroup: true,
                packageContent: true,
                servingsPerPackage: true,
                updatedAt: true,
                items: {
                    select: {
                        name: true,
                        quantity: true,
                        isAddedSugar: true,
                        sugarAdded: true,
                        energy: true,
                        carbs: true,
                        protein: true,
                        fatTotal: true,
                        fatSat: true,
                        fatTrans: true,
                        fiber: true,
                        sodium: true,
                        sugarTotal: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        }),
        prisma.enterpriseLabelProject.findMany({
            where: { userId: context.user.id },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                baseTableId: true,
                title: true,
                market: true,
                status: true,
                currentVersionId: true,
                updatedAt: true,
                versions: {
                    orderBy: { version: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        version: true,
                        title: true,
                        market: true,
                        foodState: true,
                        approvalStatus: true,
                        tableSnapshot: true,
                        legalData: true,
                        notes: true,
                        updatedAt: true,
                    },
                },
            },
        }),
    ]);

    const payload: EnterpriseTable[] = tables.map((table) => ({
        id: table.id,
        title: table.title,
        portion: table.portion,
        uom: table.uom,
        householdMeasure: table.householdMeasure,
        popGroup: table.popGroup,
        packageContent: table.packageContent,
        servingsPerPackage: table.servingsPerPackage,
        updatedAt: table.updatedAt.toISOString(),
        items: table.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            isAddedSugar: item.isAddedSugar,
            sugarAdded: item.sugarAdded,
            energy: item.energy,
            carbs: item.carbs,
            protein: item.protein,
            fatTotal: item.fatTotal,
            fatSat: item.fatSat,
            fatTrans: item.fatTrans,
            fiber: item.fiber,
            sodium: item.sodium,
            sugarTotal: item.sugarTotal,
        })),
    }));

    return (
        <EnterpriseWorkspace
            tables={payload}
            projects={projects.map(mapEnterpriseProject)}
            canExport={contextHasModuleAccess(context, SAAS_MODULES.EXPORTS)}
            canCreateTables={contextHasModuleAccess(context, SAAS_MODULES.TABLES)}
        />
    );
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
        tableSnapshot: unknown;
        legalData: unknown;
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
        status: toApprovalStatus(project.status),
        currentVersionId: project.currentVersionId,
        updatedAt: project.updatedAt.toISOString(),
        currentVersion: version
            ? {
                id: version.id,
                version: version.version,
                title: version.title,
                market: isMarket(version.market) ? version.market : "us",
                foodState: isFoodState(version.foodState) ? version.foodState : "solid",
                approvalStatus: toApprovalStatus(version.approvalStatus),
                tableSnapshot: version.tableSnapshot as EnterpriseTable,
                legalData: (version.legalData || {}) as LegalLabelData,
                notes: version.notes,
                updatedAt: version.updatedAt.toISOString(),
            }
            : null,
    };
}

function toApprovalStatus(status: EnterpriseApprovalStatus): ApprovalStatus {
    const map: Record<EnterpriseApprovalStatus, ApprovalStatus> = {
        DRAFT: "draft",
        QUALITY: "quality",
        REGULATORY: "regulatory",
        MARKETING: "marketing",
        APPROVED: "approved",
    };

    return map[status];
}

function isMarket(value: string): value is InternationalMarket {
    return ["br", "us", "eu", "ca", "mx", "cl"].includes(value);
}

function isFoodState(value: string): value is FoodPhysicalState {
    return value === "solid" || value === "liquid";
}
