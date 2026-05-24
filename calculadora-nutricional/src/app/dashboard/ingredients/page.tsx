import { IngredientsPageContent } from '@/features/ingredients/pages/IngredientsPageContent';
import { ModuleGateMessage } from '@/features/saas/components/ModuleGateMessage';
import { SAAS_MODULES } from '@/features/saas/domain/modules';
import { contextHasModuleAccess, getCurrentSaaSContext } from '@/features/saas/services/entitlements';

export default async function IngredientsPage() {
  const context = await getCurrentSaaSContext();
  if (!context || !contextHasModuleAccess(context, SAAS_MODULES.CUSTOM_INGREDIENTS)) {
    return <ModuleGateMessage moduleKey={SAAS_MODULES.CUSTOM_INGREDIENTS} />;
  }

  return (
    <IngredientsPageContent
      title="Meus Ingredientes"
      description="Gerencie seus ingredientes personalizados."
      showAddButton
    />
  );
}
