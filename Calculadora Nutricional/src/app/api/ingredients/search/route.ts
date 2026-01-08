import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("query");
    const session = await getServerSession(authOptions);

    if (!q || q.length < 2) {
        return NextResponse.json([]);
    }

    // Fetch Custom Ingredients for User
    let customIngredients: any[] = [];
    if (session && session.user?.email) {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (user) {
            customIngredients = await prisma.customIngredient.findMany({
                where: {
                    userId: user.id,
                    name: { contains: q }
                },
                take: 10
            });
        }
    }

    // Fetch TACO Ingredients
    const tacoIngredients = await prisma.ingredient.findMany({
        where: {
            name: {
                contains: q,
            },
        },
        take: 20 - customIngredients.length,
        orderBy: {
            name: 'asc'
        }
    });

    // Transform custom ingredients to shape of Ingredient (mostly correct already)
    // CustomIngredient is distinct model but similar fields.
    // We can merge them.
    // We add 'origin: CUSTOM' metadata if needed, but 'origin' field exists on Ingredient model.
    // CustomIngredient model doesn't match Ingredient model exactly (userId relation vs origin).
    // We return a unified list.

    const results = [
        ...customIngredients.map(c => ({ ...c, origin: "CUSTOM" })), // Add origin
        ...tacoIngredients
    ];

    return NextResponse.json(results);
}
