export type BillingProviderCustomerInput = {
  externalReference: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  notificationDisabled?: boolean;
};

export type BillingProviderCustomer = {
  id: string;
  externalReference: string | null;
  name: string;
  email: string | null;
  deleted: boolean;
};

export type BillingProviderDiagnostic = {
  provider: "ASAAS";
  environment: "sandbox" | "production";
  configured: boolean;
  status: "not_configured" | "reachable" | "unreachable";
  baseHost: string;
  latencyMs: number | null;
  errorCode: string | null;
};

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";

export type BillingProviderRecurringCheckoutInput = {
  externalReference: string;
  customerId: string;
  expiresInMinutes: number;
  callback: {
    successUrl: string;
    cancelUrl: string;
    expiredUrl: string;
  };
  item: {
    externalReference: string;
    name: string;
    description: string;
    quantity: 1;
    amountMinor: number;
    currency: "BRL";
  };
  subscription: {
    cycle: BillingCycle;
    nextDueDate: string;
  };
};

export type BillingProviderCheckout = {
  id: string;
  link: string;
  status: "ACTIVE" | "CANCELED" | "EXPIRED" | "PAID";
  externalReference: string;
};

export type BillingProviderPaymentSnapshot = {
  id: string;
  status: string;
  subscriptionId: string | null;
  checkoutId: string;
  amountMinor: number;
  dueDate: string | null;
  paymentDate: string | null;
  confirmedDate: string | null;
};

export interface BillingReconciliationProvider {
  listPaymentsByCheckout(providerCheckoutId: string): Promise<BillingProviderPaymentSnapshot[]>;
}

export interface BillingProvider {
  readonly name: "ASAAS";
  diagnostic(): Promise<BillingProviderDiagnostic>;
  findCustomerByExternalReference(externalReference: string): Promise<BillingProviderCustomer | null>;
  createCustomer(input: BillingProviderCustomerInput): Promise<BillingProviderCustomer>;
  retrieveCustomer(providerCustomerId: string): Promise<BillingProviderCustomer>;
  createRecurringCheckout(input: BillingProviderRecurringCheckoutInput): Promise<BillingProviderCheckout>;
  cancelCheckout(providerCheckoutId: string): Promise<BillingProviderCheckout>;
}

export type BillingProviderErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_CONFIGURATION"
  | "INVALID_RESPONSE"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "DUPLICATE_REMOTE_MAPPING";

export class BillingProviderError extends Error {
  constructor(
    public code: BillingProviderErrorCode,
    options: {
      status?: number;
      providerCode?: string;
      retryable?: boolean;
      outcomeUnknown?: boolean;
      rateLimitResetSeconds?: number;
      cause?: unknown;
    } = {},
  ) {
    super(`Falha segura no provider de billing: ${code}.`, { cause: options.cause });
    this.name = "BillingProviderError";
    this.status = options.status ?? null;
    this.providerCode = options.providerCode ?? null;
    this.retryable = options.retryable ?? false;
    this.outcomeUnknown = options.outcomeUnknown ?? false;
    this.rateLimitResetSeconds = options.rateLimitResetSeconds ?? null;
  }

  readonly status: number | null;
  readonly providerCode: string | null;
  readonly retryable: boolean;
  readonly outcomeUnknown: boolean;
  readonly rateLimitResetSeconds: number | null;
}
