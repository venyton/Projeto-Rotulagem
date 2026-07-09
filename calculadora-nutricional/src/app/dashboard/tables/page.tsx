import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { TablesGrid } from "@/features/tables/components/TablesGrid";

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
        <div className="app-page space-y-8">
            <header className="app-header-panel mb-8 md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm">
                            <FileText className="h-4 w-4 text-primary" />
                            Workspace
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tabelas</h1>
                            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                                Suas tabelas nutricionais salvas, prontas para revisar ou exportar.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                        <Button asChild className="gap-2 shadow-sm">
                            <Link href="/dashboard/new">
                                <Plus className="h-4 w-4" /> Nova Tabela
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <TablesGrid tables={tables} hasEnterprise={contextHasModuleAccess(context, SAAS_MODULES.ENTERPRISE_LABELS)} />
        </div>
    );
}
