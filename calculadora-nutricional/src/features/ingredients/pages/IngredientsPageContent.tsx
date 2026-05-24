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
      <header className="relative mb-8 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-blue-50/40 via-background to-primary/5 p-6 dark:from-blue-950/20 dark:to-primary/10 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-600/10" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-primary/10 blur-2xl dark:bg-primary/10" />
        
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm">
                    <PackageSearch className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                    <Button asChild variant="secondary" className="gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80 shadow-sm">
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
