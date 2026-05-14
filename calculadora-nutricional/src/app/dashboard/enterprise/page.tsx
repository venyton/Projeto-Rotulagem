import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { EnterpriseApprovalStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    if (!user) {
        redirect("/login");
    }

    const tables = await prisma.generatedTable.findMany({
        where: {
            userId: user.id,
        },
        include: {
            items: true,
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

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

    const projects = await prisma.enterpriseLabelProject.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: {
            versions: {
                orderBy: { version: "desc" },
                take: 1,
            },
        },
    });

    return <EnterpriseWorkspace tables={payload} projects={projects.map(mapEnterpriseProject)} />;
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
