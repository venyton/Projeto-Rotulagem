import Link from 'next/link';
import { FileSearch, PackageSearch } from 'lucide-react';

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
  let ingredients: any[] = [];
  let error: string | null = null;

  try {
    const rawIngredients = await getUserIngredients();

    ingredients = rawIngredients.map(ing => ({
        ...ing,
        createdAt: ing.createdAt.toISOString()
    }));
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
    <div className="app-page space-y-8">
      <header className="app-header-panel mb-8 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm">
              <PackageSearch className="h-4 w-4 text-primary" />
              Biblioteca
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {showAddButton && (
            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
              <TechnicalSheetImportDialog />
              <Button asChild variant="secondary" className="gap-2 shadow-sm">
                <Link href="/dashboard/ingredients/technical-sheets">
                  <FileSearch className="h-4 w-4" />
                  Fichas técnicas
                </Link>
              </Button>
              <AddIngredientForm />
            </div>
          )}
        </div>
      </header>
      <IngredientsTable ingredients={ingredients} />
    </div>
  );
}
