import type { BillingCycle } from "./billing-provider";

export type CheckoutBillingInterval = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";

export class BillingCheckoutInputError extends Error {
  constructor(
    public code:
      | "PRICE"
      | "CURRENCY"
      | "INTERVAL"
      | "CALLBACK"
      | "NAME"
      | "REFERENCE"
      | "EXPIRATION",
  ) {
    super(`Checkout inválido: ${code}.`);
    this.name = "BillingCheckoutInputError";
  }
}

export function mapBillingIntervalToAsaasCycle(interval: CheckoutBillingInterval): BillingCycle {
  if (interval === "MONTHLY") return "MONTHLY";
  if (interval === "QUARTERLY") return "QUARTERLY";
  if (interval === "SEMIANNUAL") return "SEMIANNUALLY";
  if (interval === "YEARLY") return "YEARLY";
  throw new BillingCheckoutInputError("INTERVAL");
}

export function validateCheckoutOffer(input: {
  amountMinor: number;
  currency: string;
  expiresInMinutes: number;
  externalReference: string;
  name: string;
  callbackUrls: string[];
}) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new BillingCheckoutInputError("PRICE");
  }
  if (input.currency !== "BRL") throw new BillingCheckoutInputError("CURRENCY");
  if (!Number.isInteger(input.expiresInMinutes) || input.expiresInMinutes < 10 || input.expiresInMinutes > 1_440) {
    throw new BillingCheckoutInputError("EXPIRATION");
  }
  const externalReference = input.externalReference.trim();
  if (!externalReference || externalReference.length > 200) {
    throw new BillingCheckoutInputError("REFERENCE");
  }
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 30);
  if (name.length < 2) throw new BillingCheckoutInputError("NAME");
  for (const rawUrl of input.callbackUrls) {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BillingCheckoutInputError("CALLBACK");
    }
    if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password) {
      throw new BillingCheckoutInputError("CALLBACK");
    }
  }
  return { externalReference, name };
}

export function billingAmountFromMinor(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new BillingCheckoutInputError("PRICE");
  }
  return amountMinor / 100;
}

export function checkoutReturnCopy(outcome: "success" | "cancel" | "expired") {
  if (outcome === "success") {
    return {
      title: "Pagamento em confirmação",
      description: "O retorno do checkout foi recebido. O acesso só será atualizado após a confirmação financeira do Asaas.",
    };
  }
  if (outcome === "cancel") {
    return {
      title: "Checkout cancelado",
      description: "Nenhuma confirmação financeira foi registrada. Você pode voltar ao faturamento e iniciar uma nova contratação.",
    };
  }
  return {
    title: "Checkout expirado",
    description: "O link não está mais disponível. Volte ao faturamento para gerar uma nova tentativa.",
  };
}
