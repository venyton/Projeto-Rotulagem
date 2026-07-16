import { IngredientsPageContent } from '@/features/ingredients/pages/IngredientsPageContent';
import { ModuleGateMessage } from '@/features/saas/components/ModuleGateMessage';
import { SAAS_MODULES } from '@/features/saas/domain/modules';
import { contextHasModuleAccess, getCurrentSaaSContext } from '@/features/saas/services/entitlements';

export default async function MyIngredientsPage() {
  const context = await getCurrentSaaSContext();
  if (!context || !contextHasModuleAccess(context, SAAS_MODULES.CUSTOM_INGREDIENTS)) {
    return <ModuleGateMessage moduleKey={SAAS_MODULES.CUSTOM_INGREDIENTS} />;
  }

  return (
    <IngredientsPageContent
      title="Meus Ingredientes"
      description="Gerencie seus ingredientes personalizados. Você pode cadastrar novos importando uma planilha Excel."
      showAddButton
      canUseTechnicalSheets={contextHasModuleAccess(context, SAAS_MODULES.TECHNICAL_SHEETS)}
      canUseAiImport={contextHasModuleAccess(context, SAAS_MODULES.AI_IMPORT)}
      canExport={contextHasModuleAccess(context, SAAS_MODULES.EXPORTS)}
    />
  );
}
