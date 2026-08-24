import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/observability/logger";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import {
    ingredientToCacheData,
    productFromCachedIngredient,
} from "@/features/open-food-facts/domain/open-food-facts";
import {
    fetchOpenFoodFactsProduct,
    OpenFoodFactsRateLimitError,
    searchOpenFoodFacts,
} from "@/features/open-food-facts/services/open-food-facts-cache";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";
import {
    consumeRequestRateLimit,
    getRequestRateLimit,
    rateLimitResponse,
} from "@/lib/security/request-rate-limit";
import { barcodeSchema } from "@/lib/validation/identifiers";
import { pickIngredientDto } from "@/features/ingredients/domain/ingredient-dto";

export const dynamic = "force-dynamic";
const importBodySchema = z.object({ code: barcodeSchema.trim() }).strict();

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "private, no-store", ...headers },
    });
}

function isBarcode(value: string) {
    return barcodeSchema.safeParse(value).success;
}

async function findCachedProduct(code: string) {
    const ingredient = await prisma.ingredient.findUnique({
        where: { id: `off-${code}` },
    });

    return ingredient ? productFromCachedIngredient(ingredient) : null;
}

async function cacheProductByCode(code: string) {
    const product = await fetchOpenFoodFactsProduct(code);

    if (!product) return null;

    const customNutrients = product.ingredient.customNutrients === null
        ? Prisma.DbNull
        : product.ingredient.customNutrients as Prisma.InputJsonValue;

    const ingredient = await prisma.ingredient.upsert({
        where: { id: product.ingredient.id },
        create: { ...product.ingredient, customNutrients },
        update: { ...ingredientToCacheData(product.ingredient), customNutrients },
    });

    return {
        ...product,
        ingredient: pickIngredientDto(ingredient),
    };
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return json({ products: [], error: "Não autorizado" }, 401);
    }

    let context: Awaited<ReturnType<typeof requireModuleAccess>>;
    try {
        context = await requireModuleAccess(SAAS_MODULES.OPEN_FOOD_FACTS);
    } catch (error) {
        if (error instanceof ModuleAccessError) {
            return json({ products: [], error: error.message }, error.status);
        }
        throw error;
    }

    const query = request.nextUrl.searchParams.get("query")?.trim() || "";

    if (query.length < 3 || query.length > 120 || /[\u0000-\u001f\u007f]/.test(query)) {
        return json({ products: [], error: "Digite ao menos 3 caracteres." }, 400);
    }

    const userLimit = await consumeRequestRateLimit(
        "open_food_facts.user",
        context.user.id,
        getRequestRateLimit("openFoodFactsUser"),
    );
    if (!userLimit.allowed) {
        return rateLimitResponse(userLimit, { products: [], error: "Muitas buscas. Tente novamente mais tarde." });
    }

    const providerPolicy = getRequestRateLimit(isBarcode(query) ? "openFoodFactsProduct" : "openFoodFactsSearch");
    const providerLimit = await consumeRequestRateLimit(
        isBarcode(query) ? "open_food_facts.provider.product" : "open_food_facts.provider.search",
        "application",
        providerPolicy,
    );
    if (!providerLimit.allowed) {
        return rateLimitResponse(providerLimit, { products: [], error: "Limite temporário da busca externa atingido." });
    }

    try {
        if (isBarcode(query)) {
            // GET remains read-only; persistence happens only when the user
            // explicitly imports the selected product through POST.
            const product = (await findCachedProduct(query)) || (await fetchOpenFoodFactsProduct(query));
            return json({ products: product ? [product] : [] });
        }

        const products = await searchOpenFoodFacts(query);

        return json({ products });
    } catch (error) {
        if (error instanceof OpenFoodFactsRateLimitError) {
            return json(
                { products: [], error: "Limite temporário do Open Food Facts atingido." },
                429,
                { "Retry-After": String(error.retryAfterSeconds) },
            );
        }
        logEvent("warn", "open_food_facts.request_failed", {
            error: error instanceof Error ? error.name : "unknown",
            queryType: isBarcode(query) ? "barcode" : "search",
        });
        return json(
            { products: [], error: "Não foi possível buscar no Open Food Facts agora." },
            502,
        );
    }
}

export async function POST(request: NextRequest) {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;

    const session = await getServerSession(authOptions);
    if (!session) {
        return json({ product: null, error: "Não autorizado" }, 401);
    }

    let context: Awaited<ReturnType<typeof requireModuleAccess>>;
    try {
        context = await requireModuleAccess(SAAS_MODULES.OPEN_FOOD_FACTS);
    } catch (error) {
        if (error instanceof ModuleAccessError) {
            return json({ product: null, error: error.message }, error.status);
        }
        throw error;
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > 4096) {
        return json({ product: null, error: "Solicitação inválida." }, 413);
    }

    const parsedBody = importBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsedBody.success) {
        return json({ product: null, error: "Código de barras inválido." }, 400);
    }
    const code = parsedBody.data.code;

    const userLimit = await consumeRequestRateLimit(
        "open_food_facts.user",
        context.user.id,
        getRequestRateLimit("openFoodFactsUser"),
    );
    if (!userLimit.allowed) {
        return rateLimitResponse(userLimit, { product: null, error: "Muitas importações. Tente novamente mais tarde." });
    }

    const providerLimit = await consumeRequestRateLimit(
        "open_food_facts.provider.product",
        "application",
        getRequestRateLimit("openFoodFactsProduct"),
    );
    if (!providerLimit.allowed) {
        return rateLimitResponse(providerLimit, { product: null, error: "Limite temporário da busca externa atingido." });
    }

    try {
        const product = await cacheProductByCode(code);
        if (product) return json({ product });

        const cached = await findCachedProduct(code);
        return json({ product: cached });
    } catch (error) {
        if (error instanceof OpenFoodFactsRateLimitError) {
            return json(
                { product: null, error: "Limite temporário do Open Food Facts atingido." },
                429,
                { "Retry-After": String(error.retryAfterSeconds) },
            );
        }
        logEvent("warn", "open_food_facts.import_failed", {
            error: error instanceof Error ? error.name : "unknown",
        });
        const cached = await findCachedProduct(code);
        if (cached) return json({ product: cached });

        return json(
            { product: null, error: "Nao foi possivel importar o produto agora." },
            502,
        );
    }
}
