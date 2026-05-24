import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { TablesGrid } from "@/features/tables/components/TablesGrid";

export default async function TablesPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const context = await getCurrentSaaSContext();
    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
    }

    const rawTables = await prisma.generatedTable.findMany({
        where: {
            user: { email: session.user?.email || "" }
        },
        orderBy: { createdAt: "desc" }
    });

    const tables = rawTables.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString()
    }));



    return (
        <div className="mx-auto max-w-[88rem] space-y-8 px-4 py-6 md:px-6">
            <header className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50/40 via-background to-primary/5 p-6 dark:from-emerald-950/20 dark:to-primary/10 md:p-8">
                <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-600/10" />
                <div className="pointer-events-none absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-primary/10 blur-2xl dark:bg-primary/10" />

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm">
                            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                        <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
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