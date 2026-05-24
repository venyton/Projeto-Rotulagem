import { TableGenerator } from "@/features/tables/components/TableGenerator";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";

export default async function NewTablePage() {
    const context = await getCurrentSaaSContext();
    if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
        return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
    }

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <div className="mb-6 border-b border-border/70 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tabela</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nova Tabela Nutricional</h1>
            </div>
            <TableGenerator />
        </div>
    );
}
