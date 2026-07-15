import Link from 'next/link';
import { FileSearch, PackageSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AddIngredientForm } from '@/features/ingredients/components/AddIngredientForm';
import { DatabaseFixButton } from '@/features/ingredients/components/DatabaseFixButton';
import { IngredientsTable, type IngredientTableRow } from '@/features/ingredients/components/IngredientsTable';
import { getUserIngredients } from '@/features/ingredients/actions/import-ingredient-actions';
import { TechnicalSheetImportDialog } from '@/features/technical-sheets/components/TechnicalSheetImportDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/layout/page-header';

type IngredientsPageContentProps = {
  title: string;
  description: string;
  showAddButton?: boolean;
};

export async function IngredientsPageContent({
  title,
  description,
  showAddButton = false,
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
          <DatabaseFixButton />
        </Alert>
      </div>
    );
  }

  return (
    <div className="app-page flex flex-col gap-8">
      <PageHeader
        eyebrow="Biblioteca"
        icon={PackageSearch}
        title={title}
        description={description}
        actions={showAddButton ? (
          <>
              <TechnicalSheetImportDialog />
              <Button asChild variant="outline">
                <Link href="/dashboard/ingredients/technical-sheets">
                  <FileSearch data-icon="inline-start" />
                  Fichas técnicas
                </Link>
              </Button>
              <AddIngredientForm />
          </>
        ) : undefined}
      />
      <IngredientsTable ingredients={ingredients} />
    </div>
  );
}
