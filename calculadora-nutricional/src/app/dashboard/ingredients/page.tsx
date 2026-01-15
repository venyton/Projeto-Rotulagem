import { getUserIngredients } from "@/app/actions/ingredients";
import { IngredientsTable } from "@/components/IngredientsTable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AddIngredientForm } from "@/components/AddIngredientForm";

export default async function MyIngredientsPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const ingredients = await getUserIngredients();

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
