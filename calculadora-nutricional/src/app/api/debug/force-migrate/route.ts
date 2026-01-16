
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const results = [];
    const errors = [];

    const micronutrients = [
        "sugarTotal", "sugarAdded", // Added missing core columns
        "fatMono", "fatPoly", "omega6", "omega3", "cholesterol",
        "vitaminA", "vitaminD", "vitaminE", "vitaminK", "vitaminC",
        "thiamin", "riboflavin", "niacin", "vitaminB6", "biotin",
        "folicAcid", "pantothenicAcid", "vitaminB12",
        "calcium", "chloride", "copper", "chromium", "iron",
        "fluoride", "phosphorus", "iodine", "magnesium", "manganese",
        "molybdenum", "potassium", "selenium", "zinc", "choline"
    ];

    const tables = ["CustomIngredient", "Ingredient"];

    for (const table of tables) {
        try {
            // Updated to use a single batched ALTER TABLE statement
            // This prevents Vercel timeout by doing 1 DB call instead of 30+
            const columnsSql = micronutrients
                .map(col => `ADD COLUMN IF NOT EXISTS "${col}" DOUBLE PRECISION DEFAULT 0`)
                .join(", ");

            await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ${columnsSql};`);
            results.push(`Success: Updated table ${table}`);
        } catch (e: any) {
            errors.push(`Error updating table ${table}: ${e.message}`);
        }
    }

    return NextResponse.json({
        success: errors.length === 0,
        results,
        errors
    });
}
