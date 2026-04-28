import { AddIngredientForm } from '@/features/ingredients/components/AddIngredientForm';
import { DatabaseFixButton } from '@/features/ingredients/components/DatabaseFixButton';
import { IngredientsTable } from '@/features/ingredients/components/IngredientsTable';
import { getUserIngredients } from '@/features/ingredients/actions/import-ingredient-actions';

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
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {showAddButton && <AddIngredientForm />}
      </div>
      <IngredientsTable ingredients={ingredients} />
    </div>
  );
}
