import Link from 'next/link';
import { ChevronDown, FileSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

    ingredients = rawIngredients;
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
            <AddIngredientForm />
            {canUseTechnicalSheets ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Fichas técnicas
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/ingredients/technical-sheets">
                        <FileSearch />
                        Ver fichas técnicas
                      </Link>
                    </DropdownMenuItem>
                    {canUseAiImport ? (
                      <TechnicalSheetImportDialog
                        trigger={(
                          <DropdownMenuItem>
                            <FileSearch />
                            Importar ficha com IA
                          </DropdownMenuItem>
                        )}
                      />
                    ) : null}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        ) : undefined}
      />
      <IngredientsTable ingredients={ingredients} canExport={canExport} />
    </div>
  );
}
