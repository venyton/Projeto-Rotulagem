import { getUserIngredients } from "@/app/actions/ingredients";
import { IngredientsTable } from "@/components/IngredientsTable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AddIngredientForm } from "@/components/AddIngredientForm";
import { Ingredient } from "@prisma/client";
import { DatabaseFixButton } from "@/components/DatabaseFixButton";

export default async function MyIngredientsPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    let ingredients: any[] = []; // Using any[] to bypass strict typing for now, or use correct type
    let error = null;

    try {
        ingredients = await getUserIngredients();
    } catch (e) {
        console.error("Failed to fetch ingredients:", e);
        error = "Erro ao carregar ingredientes. Por favor, tente novamente mais tarde.";
    }

    if (error) {
        return (
            <div className="container mx-auto py-10 px-4">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Erro!</strong>
                    <span className="block sm:inline"> {error}</span>
                    <p className="text-sm mt-2">
                        Pode ser necessário atualizar o banco de dados.
                    </p>
                    <DatabaseFixButton />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Meus Ingredientes</h1>
                    <p className="text-gray-500">
                        Gerencie seus ingredientes personalizados.
                    </p>
                </div>
                <AddIngredientForm />
            </div>

            <IngredientsTable ingredients={ingredients} />
        </div>
    );
}
