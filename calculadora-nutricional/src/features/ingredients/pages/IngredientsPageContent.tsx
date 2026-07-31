import Link from 'next/link';
import { FileSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AddIngredientForm } from '@/features/ingredients/components/AddIngredientForm';
import { IngredientsTable, type IngredientTableRow } from '@/features/ingredients/components/IngredientsTable';
import { getUserIngredients } from '@/features/ingredients/actions/import-ingredient-actions';
import { TechnicalSheetImportDialog } from '@/features/technical-sheets/components/TechnicalSheetImportDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/layout/page-header';

type IngredientsPageContentProps = {
  title: string;
  description: string;
  showAddButton?: boolean;
  canUseTechnicalSheets?: boolean;
  canUseAiImport?: boolean;
  canExport?: boolean;
};

export async function IngredientsPageContent({
  title,
  description,
  showAddButton = false,
  canUseTechnicalSheets = false,
  canUseAiImport = false,
  canExport = false,
}: IngredientsPageContentProps) {
  let ingredients: IngredientTableRow[] = [];
  let error: string | null = null;

  try {
    const rawIngredients = await getUserIngredients();

    ingredients = rawIngredients.map(ing => ({
        ...ing,
        sugarTotal: ing.sugarTotal ?? 0,
        sugarAdded: ing.sugarAdded ?? 0,
        createdAt: ing.createdAt.toISOString()
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro desconhecido ao carregar ingredientes.';
  }

  if (error) {
    return (
      <div className="app-page">
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
        actions={showAddButton ? (
          <>
              {canUseTechnicalSheets && canUseAiImport ? <TechnicalSheetImportDialog /> : null}
              {canUseTechnicalSheets ? (
                <Button asChild variant="outline">
                  <Link href="/dashboard/ingredients/technical-sheets">
                    <FileSearch data-icon="inline-start" />
                    Fichas técnicas
                  </Link>
                </Button>
              ) : null}
              <AddIngredientForm />
          </>
        ) : undefined}
      />
      <IngredientsTable ingredients={ingredients} canExport={canExport} />
    </div>
  );
}
