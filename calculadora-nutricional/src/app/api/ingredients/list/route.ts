import { NextResponse } from "next/server";
import { getUserIngredients } from "@/app/actions/ingredients";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const ingredients = await getUserIngredients();
        return NextResponse.json({ success: true, ingredients });
    } catch (error: any) {
        console.error("API Ingredients Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Failed to fetch ingredients"
        }, { status: 500 });
    }
}
