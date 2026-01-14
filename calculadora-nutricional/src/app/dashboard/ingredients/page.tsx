import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { deleteCustomIngredient } from "@/app/actions/ingredient";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { AddIngredientForm } from "@/components/AddIngredientForm";

export default async function CustomIngredientsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const user = await prisma.user.findUnique({ where: { email: session.user?.email || "" } });
    if (!user) redirect("/login");

    const ingredients = await prisma.customIngredient.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Meus Ingredientes</h1>
                <AddIngredientForm />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ingredients.map(ing => (
                    <Card key={ing.id} className="relative">
                        <CardHeader>
                            <CardTitle className="text-lg pr-8">{ing.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            <div className="grid grid-cols-2 gap-x-4">
                                <span>Energia: {ing.energy} kcal</span>
                                <span>Carbo: {ing.carbs}g</span>
                                <span>Prot: {ing.protein}g</span>
                                <span>Gord: {ing.fatTotal}g</span>
                            </div>
                        </CardContent>
                        <form action={async () => {
                            'use server'
                            await deleteCustomIngredient(ing.id)
                        }}>
                            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </form>
                    </Card>
                ))}
                {ingredients.length === 0 && (
                    <div className="col-span-full text-center py-12 border-dashed border rounded">
                        Nenhum ingrediente personalizado.
                    </div>
                )}
            </div>
        </div>
    );
}
