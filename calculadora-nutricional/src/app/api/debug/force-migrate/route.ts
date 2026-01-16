
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const results = [];
    const errors = [];

    const micronutrients = [
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
        for (const col of micronutrients) {
            try {
                // Check if column exists is too complex in raw SQL x-db, so just try ADD COLUMN IF NOT EXISTS logic
                // Postgres doesn't support IF NOT EXISTS in ADD COLUMN natively in all versions easily without a block
                // So we wrap in try/catch for "duplicate column" error

                await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${col}" DOUBLE PRECISION DEFAULT 0;`);
                results.push(`Success: Added ${col} to ${table}`);
            } catch (e: any) {
                if (e.message.includes("already exists")) {
                    results.push(`Skipped: ${col} already exists in ${table}`);
                } else {
                    errors.push(`Error adding ${col} to ${table}: ${e.message}`);
                }
            }
        }
    }

    return NextResponse.json({
        success: errors.length === 0,
        results,
        errors
    });
}
