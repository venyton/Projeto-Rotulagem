'use client';

import { useEffect, useState } from 'react';
import { IngredientsTable } from "@/components/IngredientsTable";
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
                    setError(data.error || "Erro desconhecido ao carregar ingredientes.");
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Erro na conexão com o servidor.");
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
                    <strong className="font-bold block mb-1">Erro ao carregar!</strong>
                    <span className="block sm:inline mb-4">{error}</span>
                    <DatabaseFixButton />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold mb-2">Meus Ingredientes</h1>
            <p className="text-gray-500 mb-8">
                Gerencie seus ingredientes personalizados. Você pode cadastrar novos importando uma planilha Excel.
            </p>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <IngredientsTable ingredients={ingredients || []} />
            )}
        </div>
    );
}
