'use client';

import { useEffect, useState } from 'react';
import { IngredientsTable } from "@/components/IngredientsTable";
import { AddIngredientForm } from "@/components/AddIngredientForm";
import { DatabaseFixButton } from "@/components/DatabaseFixButton";
import { Loader2 } from "lucide-react";

export default function MyIngredientsPage() {
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIngredients = async () => {
            try {
                const res = await fetch('/api/ingredients/list');
                const data = await res.json();

                if (data.success) {
                    setIngredients(data.ingredients);
                } else {
                    setError(data.error || "Erro desconhecido ao carregar.");
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Erro de conexão.");
            } finally {
                setLoading(false);
            }
        };

        fetchIngredients();
    }, []);

    if (error) {
        return (
            <div className="container mx-auto py-10 px-4">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold block mb-1">Erro!</strong>
                    <span className="block sm:inline mb-4">{error}</span>
                    <p className="text-sm">Se o erro persistir, tente corrigir o banco:</p>
                    <DatabaseFixButton />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Meus Ingredientes</h1>
                    <p className="text-muted-foreground">
                        Gerencie seus ingredientes personalizados.
                    </p>
                </div>
                <AddIngredientForm />
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : (
                <IngredientsTable ingredients={ingredients || []} />
            )}
        </div>
    );
}
