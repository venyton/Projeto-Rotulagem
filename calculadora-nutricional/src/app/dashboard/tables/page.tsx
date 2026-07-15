import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { TablesGrid } from "@/features/tables/components/TablesGrid";
import { PageHeader } from "@/components/layout/page-header";

export default async function TablesPage() {
    const context = await getCurrentSaaSContext();
    if (!context) {
        redirect("/login");
    }

    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
    }

    const rawTables = await prisma.generatedTable.findMany({
        where: { userId: context.user.id },
        select: {
            id: true,
            title: true,
            portion: true,
            uom: true,
            popGroup: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" }
    });

    const tables = rawTables.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString()
    }));



    return (
        <div className="app-page flex flex-col gap-8">
            <PageHeader
                eyebrow="Catálogo"
                icon={FileText}
                title="Tabelas"
                description="Suas tabelas nutricionais salvas, prontas para revisar ou exportar."
                actions={(
                    <Button asChild>
                        <Link href="/dashboard/new"><Plus data-icon="inline-start" />Nova tabela</Link>
                    </Button>
                )}
            />
            <TablesGrid tables={tables} hasEnterprise={contextHasModuleAccess(context, SAAS_MODULES.ENTERPRISE_LABELS)} />
        </div>
    );
}
