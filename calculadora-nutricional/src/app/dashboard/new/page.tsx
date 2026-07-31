import dynamic from "next/dynamic";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { PageHeader } from "@/components/layout/page-header";

const TableGenerator = dynamic(
    () => import("@/features/tables/components/TableGenerator").then((module) => module.TableGenerator),
    { loading: () => <div className="min-h-96 animate-pulse rounded-xl border bg-card" role="status" aria-live="polite" aria-label="Carregando editor" /> }
);

export default async function NewTablePage() {
    const context = await getCurrentSaaSContext();
    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
    }

    return (
        <div className="app-page flex flex-col gap-6">
            <PageHeader title="Nova tabela nutricional" description="Adicione ingredientes, revise os cálculos e exporte o rótulo final." />
            <TableGenerator
                canUseOpenFoodFacts={contextHasModuleAccess(context, SAAS_MODULES.OPEN_FOOD_FACTS)}
                canExport={contextHasModuleAccess(context, SAAS_MODULES.EXPORTS)}
            />
        </div>
    );
}
