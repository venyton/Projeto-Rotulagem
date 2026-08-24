'use client'

import * as React from "react";
import type { IngredientDto } from "@/features/ingredients/domain/ingredient-dto";
import { AlertTriangle, Barcode, ExternalLink, PackagePlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OpenFoodFactsProduct } from "@/features/open-food-facts/domain/open-food-facts";
import { toast } from "sonner";

type OpenFoodFactsImporterProps = {
    onSelect?: (ingredient: IngredientDto) => void;
};

type SearchResponse = {
    products?: OpenFoodFactsProduct[];
    error?: string;
};

type CacheResponse = {
    product?: OpenFoodFactsProduct | null;
    error?: string;
};

const completenessLabel = {
    high: "dados bons",
    medium: "revisar",
    low: "dados incompletos",
} as const;

const completenessClass = {
    high: "text-emerald-700 dark:text-emerald-300",
    medium: "text-amber-700 dark:text-amber-300",
    low: "text-red-700 dark:text-red-300",
} as const;

function nutrientSummary(product: OpenFoodFactsProduct) {
    const ingredient = product.ingredient;
    return [
        `${ingredient.energy.toFixed(0)} kcal`,
        `${ingredient.carbs.toFixed(1)} g carb.`,
        `${ingredient.protein.toFixed(1)} g prot.`,
        `${ingredient.fatTotal.toFixed(1)} g gord.`,
        `${ingredient.sodium.toFixed(0)} mg sodio`,
    ];
}

export function OpenFoodFactsImporter({ onSelect }: OpenFoodFactsImporterProps) {
    const [query, setQuery] = React.useState("");
    const [products, setProducts] = React.useState<OpenFoodFactsProduct[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [selectingCode, setSelectingCode] = React.useState("");
    const [error, setError] = React.useState("");
    const [lastQuery, setLastQuery] = React.useState("");

    const canSearch = query.trim().length >= 3 && !loading;

    async function handleSearch(event?: React.FormEvent<HTMLFormElement>) {
        event?.preventDefault();
        const nextQuery = query.trim();
        if (nextQuery.length < 3) return;

        setLoading(true);
        setError("");
        setLastQuery(nextQuery);

        try {
            const response = await fetch(`/api/open-food-facts/products?query=${encodeURIComponent(nextQuery)}`);
            const data = (await response.json()) as SearchResponse;
            if (!response.ok) throw new Error(data.error || "Busca indisponivel.");
            setProducts(data.products || []);
        } catch (err) {
            setProducts([]);
            setError(err instanceof Error ? err.message : "Busca indisponivel.");
        } finally {
            setLoading(false);
        }
    }

    async function handleUseProduct(product: OpenFoodFactsProduct) {
        setSelectingCode(product.code);
        setError("");

        try {
            const response = await fetch("/api/open-food-facts/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: product.code }),
            });
            const data = (await response.json()) as CacheResponse;
            if (!response.ok) throw new Error(data.error || "Produto indisponivel.");
            const importedProduct = data.product || product;
            onSelect?.(importedProduct.ingredient);
            if (!onSelect) {
                toast.success("Produto disponibilizado na base de ingredientes.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Produto indisponivel.");
        } finally {
            setSelectingCode("");
        }
    }

    return (
        <section className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/20">
            <div className="mb-3 flex items-start gap-2">
                <div className="mt-0.5 rounded-md bg-emerald-600 p-1.5 text-white">
                    <Barcode className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        Buscar produtos por código de barras ou pelo nome
                        <HelpTip>Busca produtos por código de barras ou pelo nome. Sempre revise os valores.</HelpTip>
                    </h3>
                </div>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ex: 3017620422003 ou Nutella"
                    className="h-10 bg-background"
                />
                <Button type="submit" disabled={!canSearch} className="h-10 shrink-0">
                    <Search className="h-4 w-4" />
                    {loading ? "Buscando..." : "Buscar produto"}
                </Button>
            </form>

            {error && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {!loading && !error && lastQuery && products.length === 0 && (
                <div className="mt-3 rounded-lg border border-dashed border-emerald-300 bg-background/80 px-3 py-3 text-center text-xs text-muted-foreground">
                    Nenhum produto encontrado para &quot;{lastQuery}&quot;.
                </div>
            )}

            {products.length > 0 && (
                <div className="mt-3 space-y-2">
                    {products.map((product) => (
                        <article
                            key={product.code}
                            className="grid gap-3 rounded-lg border border-border/70 bg-background p-3 shadow-sm sm:grid-cols-[4rem_1fr]"
                        >
                            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-muted/40">
                                {product.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain" />
                                ) : (
                                    <Barcode className="h-6 w-6 text-muted-foreground" />
                                )}
                            </div>

                            <div className="min-w-0 space-y-2">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <h4 className="truncate text-sm font-semibold">{product.name}</h4>
                                        <p className="text-xs text-muted-foreground">
                                            {[product.brands, product.quantity, product.code].filter(Boolean).join(" • ")}
                                        </p>
                                    </div>
                                    <span className={cn("inline-flex w-fit items-center gap-1 text-[11px] font-medium", completenessClass[product.completeness])}>
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        {completenessLabel[product.completeness]}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {nutrientSummary(product).map((item) => (
                                        <span key={item} className="text-[11px] text-muted-foreground">
                                            {item}
                                        </span>
                                    ))}
                                </div>

                                {product.missingNutrients.length > 0 && (
                                    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                                        Conferir no rotulo: {product.missingNutrients.slice(0, 4).join(", ")}.
                                    </p>
                                )}

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleUseProduct(product)}
                                        disabled={selectingCode === product.code}
                                        className="h-8"
                                    >
                                        <PackagePlus className="h-4 w-4" />
                                        {selectingCode === product.code
                                            ? "Importando..."
                                            : onSelect
                                                ? "Usar como ingrediente"
                                                : "Disponibilizar produto"}
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" asChild className="h-8">
                                        <a href={product.sourceUrl} target="_blank" rel="noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                            Ver fonte
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
