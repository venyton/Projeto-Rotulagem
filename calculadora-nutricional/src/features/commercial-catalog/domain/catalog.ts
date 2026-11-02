export const FEATURE_VALUE_TYPES = {
  BOOLEAN: "BOOLEAN",
  QUOTA: "QUOTA",
  METERED: "METERED",
  SEAT_LIMIT: "SEAT_LIMIT",
} as const;

export type FeatureValueType = (typeof FEATURE_VALUE_TYPES)[keyof typeof FEATURE_VALUE_TYPES];

export const BILLING_INTERVALS = {
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  SEMIANNUAL: "SEMIANNUAL",
  YEARLY: "YEARLY",
} as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[keyof typeof BILLING_INTERVALS];

export type PlanVersionPublicationInput = {
  status: "DRAFT" | "PUBLISHED" | "RETIRED";
  versionNumber: number;
  isPaid: boolean;
  features: Array<{
    key: string;
    type: FeatureValueType;
    definitionActive: boolean;
    enabled: boolean;
    limitValue: number | null;
  }>;
  prices: Array<{
    status: "ACTIVE" | "ARCHIVED";
    currency: string;
    amountMinor: number;
    billingInterval: BillingInterval;
  }>;
};

export class CatalogInvariantError extends Error {
  constructor(
    public code:
      | "INVALID_KEY"
      | "NOT_DRAFT"
      | "INVALID_VERSION"
      | "FEATURES_REQUIRED"
      | "DUPLICATE_FEATURE"
      | "INACTIVE_FEATURE"
      | "INVALID_FEATURE_LIMIT"
      | "PRICE_REQUIRED"
      | "FREE_PLAN_WITH_PRICE"
      | "INVALID_PRICE"
      | "DUPLICATE_PRICE",
    message: string,
  ) {
    super(message);
    this.name = "CatalogInvariantError";
  }
}

const catalogKeyPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const currencyPattern = /^[A-Z]{3}$/;

export function requireStableCatalogKey(value: string) {
  const key = value.trim();
  if (key.length < 2 || key.length > 64 || !catalogKeyPattern.test(key)) {
    throw new CatalogInvariantError(
      "INVALID_KEY",
      "A chave deve ter de 2 a 64 caracteres ASCII em snake_case e não pode conter nome visual de plano.",
    );
  }
  return key;
}

export function parseBrlAmountToMinor(value: string) {
  const normalized = value.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  const match = /^(\d{1,7})(?:[,.](\d{1,2}))?$/.exec(normalized);
  if (!match) {
    throw new CatalogInvariantError("INVALID_PRICE", "Informe um valor monetário positivo com até duas casas decimais.");
  }
  const whole = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const amountMinor = whole * 100 + Number(fraction || "0");
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new CatalogInvariantError("INVALID_PRICE", "O preço deve ser maior que zero.");
  }
  return amountMinor;
}

function assertFeatureConfiguration(feature: PlanVersionPublicationInput["features"][number]) {
  requireStableCatalogKey(feature.key);
  if (!feature.definitionActive) {
    throw new CatalogInvariantError("INACTIVE_FEATURE", `Feature inativa: ${feature.key}.`);
  }

  if (feature.type === FEATURE_VALUE_TYPES.BOOLEAN) {
    if (feature.limitValue !== null) {
      throw new CatalogInvariantError(
        "INVALID_FEATURE_LIMIT",
        `Feature booleana ${feature.key} não aceita limite numérico.`,
      );
    }
    return;
  }

  if (
    feature.enabled
    && (feature.limitValue === null
      || !Number.isSafeInteger(feature.limitValue)
      || feature.limitValue < 0)
  ) {
    throw new CatalogInvariantError(
      "INVALID_FEATURE_LIMIT",
      `Feature quantitativa ${feature.key} exige limite inteiro não negativo.`,
    );
  }
}

function assertPrice(price: PlanVersionPublicationInput["prices"][number]) {
  if (
    !currencyPattern.test(price.currency)
    || !Number.isSafeInteger(price.amountMinor)
    || price.amountMinor <= 0
    || !Object.values(BILLING_INTERVALS).includes(price.billingInterval)
  ) {
    throw new CatalogInvariantError(
      "INVALID_PRICE",
      "Preço ativo exige moeda ISO de três letras, intervalo suportado e valor inteiro positivo em centavos.",
    );
  }
}

export function assertPlanVersionPublishable(input: PlanVersionPublicationInput) {
  if (input.status !== "DRAFT") {
    throw new CatalogInvariantError("NOT_DRAFT", "Somente versões em draft podem ser publicadas.");
  }
  if (!Number.isSafeInteger(input.versionNumber) || input.versionNumber <= 0) {
    throw new CatalogInvariantError("INVALID_VERSION", "O número da versão deve ser um inteiro positivo.");
  }
  if (input.features.length === 0) {
    throw new CatalogInvariantError("FEATURES_REQUIRED", "A versão precisa declarar pelo menos uma feature.");
  }

  const featureKeys = new Set<string>();
  for (const feature of input.features) {
    assertFeatureConfiguration(feature);
    if (featureKeys.has(feature.key)) {
      throw new CatalogInvariantError("DUPLICATE_FEATURE", `Feature duplicada: ${feature.key}.`);
    }
    featureKeys.add(feature.key);
  }

  const activePrices = input.prices.filter((price) => price.status === "ACTIVE");
  const priceKeys = new Set<string>();
  for (const price of activePrices) {
    assertPrice(price);
    const priceKey = `${price.currency}:${price.billingInterval}`;
    if (priceKeys.has(priceKey)) {
      throw new CatalogInvariantError(
        "DUPLICATE_PRICE",
        `Preço ativo duplicado para ${price.currency}/${price.billingInterval}.`,
      );
    }
    priceKeys.add(priceKey);
  }

  if (input.isPaid && activePrices.length === 0) {
    throw new CatalogInvariantError("PRICE_REQUIRED", "Plano pago exige pelo menos um preço ativo.");
  }
  if (!input.isPaid && activePrices.length > 0) {
    throw new CatalogInvariantError("FREE_PLAN_WITH_PRICE", "Plano gratuito não pode publicar preço ativo.");
  }
}
