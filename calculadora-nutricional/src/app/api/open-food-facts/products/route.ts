import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    ingredientToCacheData,
    normalizeOpenFoodFactsProduct,
    productFromCachedIngredient,
} from "@/features/open-food-facts/domain/open-food-facts";

const PRODUCT_FIELDS = [
    "code",
    "product_name",
    "product_name_pt",
    "product_name_en",
    "generic_name",
    "brands",
    "quantity",
    "serving_size",
    "image_front_url",
    "image_url",
    "nutriments",
].join(",");

const SEARCH_FIELDS = PRODUCT_FIELDS.split(",");

const USER_AGENT = process.env.OPEN_FOOD_FACTS_USER_AGENT || "SoIZI/0.1.1 (contato@soizi.app)";

function isBarcode(value: string) {
    return /^\d{8,14}$/.test(value);
}

async function fetchOpenFoodFacts(url: string) {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
        },
        next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
        throw new Error(`Open Food Facts respondeu ${response.status}`);
    }

    return response.json();
}

async function searchByName(query: string) {
    const response = await fetch("https://search.openfoodfacts.org/search", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({
            q: query,
            page: 1,
            page_size: 8,
            langs: ["pt", "en"],
            fields: SEARCH_FIELDS,
        }),
        next: { revalidate: 60 * 60 * 24 },
    });

    if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.hits)) return data.hits;
    }

    const searchParams = new URLSearchParams({
        search_terms: query,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "8",
        fields: PRODUCT_FIELDS,
    });

    const fallbackData = await fetchOpenFoodFacts(`https://world.openfoodfacts.org/cgi/search.pl?${searchParams.toString()}`);
    return Array.isArray(fallbackData.products) ? fallbackData.products : [];
}

async function findCachedProduct(code: string) {
    const ingredient = await prisma.ingredient.findUnique({
        where: { id: `off-${code}` },
    });

    return ingredient ? productFromCachedIngredient(ingredient) : null;
}

async function cacheProductByCode(code: string) {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${PRODUCT_FIELDS}`;
    const data = await fetchOpenFoodFacts(url);
    const product = normalizeOpenFoodFactsProduct(data.product || {});

    if (!product) return null;

    const ingredient = await prisma.ingredient.upsert({
        where: { id: product.ingredient.id },
        create: product.ingredient,
        update: ingredientToCacheData(product.ingredient),
    });

    return {
        ...product,
        ingredient,
    };
}

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get("query")?.trim() || "";

    if (query.length < 3) {
        return NextResponse.json({ products: [], error: "Digite ao menos 3 caracteres." }, { status: 400 });
    }

    try {
        if (isBarcode(query)) {
            const product = (await findCachedProduct(query)) || (await cacheProductByCode(query));
            return NextResponse.json({ products: product ? [product] : [] });
        }

        const rawProducts = await searchByName(query);
        const products = rawProducts
            .map(normalizeOpenFoodFactsProduct)
            .filter(Boolean)
            .slice(0, 8);

        return NextResponse.json({ products });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { products: [], error: "Não foi possível buscar no Open Food Facts agora." },
            { status: 502 },
        );
    }
}

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null) as { code?: unknown } | null;
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!isBarcode(code)) {
        return NextResponse.json({ product: null, error: "Codigo de barras invalido." }, { status: 400 });
    }

    try {
        const product = await cacheProductByCode(code);
        if (product) return NextResponse.json({ product });

        const cached = await findCachedProduct(code);
        return NextResponse.json({ product: cached });
    } catch (error) {
        console.error(error);
        const cached = await findCachedProduct(code);
        if (cached) return NextResponse.json({ product: cached });

        return NextResponse.json(
            { product: null, error: "Nao foi possivel importar o produto agora." },
            { status: 502 },
        );
    }
}
