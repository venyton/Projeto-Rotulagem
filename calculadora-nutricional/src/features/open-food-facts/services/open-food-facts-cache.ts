import { unstable_cache } from "next/cache";

import { normalizeOpenFoodFactsProduct, type OpenFoodFactsProduct } from "@/features/open-food-facts/domain/open-food-facts";

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
const OPEN_FOOD_FACTS_TIMEOUT_MS = 10_000;
type RawProduct = Parameters<typeof normalizeOpenFoodFactsProduct>[0];

export class OpenFoodFactsRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds = 60) {
    super("Open Food Facts request limit reached.");
    this.name = "OpenFoodFactsRateLimitError";
    this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
  }
}

function readRetryAfterSeconds(value: string | null) {
  if (!value) return 60;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1, Math.ceil((date - Date.now()) / 1000)) : 60;
}

function normalizeProducts(rawProducts: unknown) {
  if (!Array.isArray(rawProducts)) return [];

  return rawProducts
    .map((rawProduct: RawProduct) => normalizeOpenFoodFactsProduct(rawProduct))
    .filter((product): product is OpenFoodFactsProduct => Boolean(product))
    .slice(0, 8);
}

async function fetchOpenFoodFacts(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(OPEN_FOOD_FACTS_TIMEOUT_MS),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new OpenFoodFactsRateLimitError(readRetryAfterSeconds(response.headers.get("retry-after")));
    }
    throw new Error(`Open Food Facts respondeu ${response.status}`);
  }

  return response.json();
}

async function searchOpenFoodFactsUncached(query: string): Promise<OpenFoodFactsProduct[]> {
  const response = await fetch("https://search.openfoodfacts.org/search", {
    method: "POST",
    cache: "no-store",
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
    signal: AbortSignal.timeout(OPEN_FOOD_FACTS_TIMEOUT_MS),
  });

  if (response.status === 429) {
    throw new OpenFoodFactsRateLimitError(readRetryAfterSeconds(response.headers.get("retry-after")));
  }

  if (response.ok) {
    const data = await response.json();
    if (Array.isArray(data.hits)) {
      return normalizeProducts(data.hits);
    }
  }

  const searchParams = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "8",
    fields: PRODUCT_FIELDS,
  });
  const fallbackData = await fetchOpenFoodFacts(
    `https://world.openfoodfacts.org/cgi/search.pl?${searchParams.toString()}`,
  );

  return normalizeProducts(fallbackData.products);
}

async function fetchOpenFoodFactsProductUncached(code: string) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${PRODUCT_FIELDS}`;
  const data = await fetchOpenFoodFacts(url);
  return normalizeOpenFoodFactsProduct(data.product || {});
}

const cachedSearchOpenFoodFacts = unstable_cache(
  async (query: string) => searchOpenFoodFactsUncached(query),
  ["open-food-facts-search-v1"],
  {
    revalidate: 10 * 60,
    tags: ["open-food-facts-search"],
  },
);

const cachedFetchOpenFoodFactsProduct = unstable_cache(
  async (code: string) => fetchOpenFoodFactsProductUncached(code),
  ["open-food-facts-product-v1"],
  {
    revalidate: 24 * 60 * 60,
    tags: ["open-food-facts-product"],
  },
);

export function searchOpenFoodFacts(query: string) {
  return cachedSearchOpenFoodFacts(query);
}

export function fetchOpenFoodFactsProduct(code: string) {
  return cachedFetchOpenFoodFactsProduct(code);
}
