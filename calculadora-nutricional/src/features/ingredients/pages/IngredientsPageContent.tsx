import { AddIngredientForm } from '@/features/ingredients/components/AddIngredientForm';
import { IngredientsTable, type IngredientTableRow } from '@/features/ingredients/components/IngredientsTable';
import { IngredientsSectionTabs } from '@/features/ingredients/components/IngredientsSectionTabs';
import { getUserIngredients } from '@/features/ingredients/actions/import-ingredient-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/layout/page-header';

type IngredientsPageContentProps = {
  title: string;
  description: string;
  showAddButton?: boolean;
  canUseTechnicalSheets?: boolean;
  canExport?: boolean;
};

export async function IngredientsPageContent({
  title,
  description,
  showAddButton = false,
  canUseTechnicalSheets = false,
  canExport = false,
}: IngredientsPageContentProps) {
  let ingredients: IngredientTableRow[] = [];
  let error: string | null = null;

  try {
    const rawIngredients = await getUserIngredients();

    ingredients = rawIngredients;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro desconhecido ao carregar ingredientes.';
  }

  if (error) {
    return (
      <div className="app-page flex flex-col gap-6">
        <IngredientsSectionTabs
          activeTab="ingredients"
          canUseIngredients
          canUseTechnicalSheets={canUseTechnicalSheets}
        />
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar ingredientes</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="app-page flex flex-col gap-8">
      <PageHeader
        title={title}
        description={description}
        actions={showAddButton ? <AddIngredientForm /> : undefined}
      />
      <IngredientsSectionTabs
        activeTab="ingredients"
        canUseIngredients
        canUseTechnicalSheets={canUseTechnicalSheets}
      />
      <IngredientsTable ingredients={ingredients} canExport={canExport} />
    </div>
  );
}
