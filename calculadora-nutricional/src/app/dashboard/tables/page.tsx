import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { TablesGrid } from "@/features/tables/components/TablesGrid";
import { PageHeader } from "@/components/layout/page-header";

type TablesPageProps = {
    searchParams?: Promise<{ page?: string; q?: string }>;
};

const PAGE_SIZE = 24;
const MAX_PAGE = 10_000;

export default async function TablesPage({ searchParams }: TablesPageProps) {
    const context = await getCurrentSaaSContext();
    if (!context) {
        redirect("/login");
    }

    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
    }

    const params = searchParams ? await searchParams : {};
    const requestedPage = Number.parseInt(params.page || "1", 10);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? Math.min(requestedPage, MAX_PAGE)
        : 1;
    const searchQuery = (params.q || "").trim().slice(0, 100);
    const where = searchQuery
        ? { organizationId: context.organization.id, title: { contains: searchQuery, mode: "insensitive" as const } }
        : { organizationId: context.organization.id };
    const [rawTables, total] = await Promise.all([
        prisma.generatedTable.findMany({
            where,
            select: {
                id: true,
                title: true,
                portion: true,
                uom: true,
                popGroup: true,
                createdAt: true,
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.generatedTable.count({ where }),
    ]);

    const tables = rawTables.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString()
    }));



    return (
        <div className="app-page flex flex-col gap-8">
            <PageHeader
                title="Tabelas"
                description="Tabelas nutricionais compartilhadas no workspace ativo, prontas para revisar ou exportar."
                actions={(
                    <Button asChild>
                        <Link href="/dashboard/new"><Plus data-icon="inline-start" />Nova tabela</Link>
                    </Button>
                )}
            />
            <TablesGrid
                tables={tables}
                hasExports={contextHasModuleAccess(context, SAAS_MODULES.EXPORTS)}
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                searchQuery={searchQuery}
            />
        </div>
    );
}
