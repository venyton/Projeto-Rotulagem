import Link from 'next/link';
import { FileSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AddIngredientForm } from '@/features/ingredients/components/AddIngredientForm';
import { DatabaseFixButton } from '@/features/ingredients/components/DatabaseFixButton';
import { IngredientsTable } from '@/features/ingredients/components/IngredientsTable';
import { getUserIngredients } from '@/features/ingredients/actions/import-ingredient-actions';
import { TechnicalSheetImportDialog } from '@/features/technical-sheets/components/TechnicalSheetImportDialog';

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
  let ingredients: Awaited<ReturnType<typeof getUserIngredients>> = [];
  let error: string | null = null;

  try {
    ingredients = await getUserIngredients();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro desconhecido ao carregar ingredientes.';
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div
          className="relative rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive"
          role="alert"
        >
          <strong className="font-bold block mb-1">Erro ao carregar!</strong>
          <span className="block sm:inline mb-4">{error}</span>
          <p className="text-sm">Se o erro persistir, tente corrigir o banco:</p>
          <DatabaseFixButton />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Biblioteca</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {showAddButton && (
          <div className="flex flex-wrap gap-2">
            <TechnicalSheetImportDialog />
            <Button asChild variant="outline">
              <Link href="/dashboard/ingredients/technical-sheets">
                <FileSearch className="mr-2 h-4 w-4" />
                Fichas técnicas importadas
              </Link>
            </Button>
            <AddIngredientForm />
          </div>
        )}
      </div>
      <IngredientsTable ingredients={ingredients} />
    </div>
  );
}
