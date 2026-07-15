import { TableGenerator } from "@/features/tables/components/TableGenerator";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { FilePlus2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default async function NewTablePage() {
    const context = await getCurrentSaaSContext();
    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
    }

    return (
        <div className="app-page flex flex-col gap-6">
            <PageHeader eyebrow="Tabela" icon={FilePlus2} title="Nova tabela nutricional" description="Adicione ingredientes, revise os cálculos e exporte o rótulo final." />
            <TableGenerator />
        </div>
    );
}
