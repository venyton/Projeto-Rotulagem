export type AdministrativeOrganizationStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

const organizationStatuses = new Set<AdministrativeOrganizationStatus>(["ACTIVE", "SUSPENDED", "ARCHIVED"]);
const subscriptionStatuses = new Set([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "INCOMPLETE",
  "INCOMPLETE_EXPIRED",
  "UNPAID",
  "PAUSED",
]);

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export type OrganizationAdminFilters = {
  page: number;
  query: string;
  status: AdministrativeOrganizationStatus | null;
  plan: string;
  billing: string | null;
};

export function parseOrganizationAdminFilters(
  values: Record<string, string | string[] | undefined>,
): OrganizationAdminFilters {
  const rawPage = Number(one(values.page));
  const status = one(values.status)?.toUpperCase() ?? "";
  const billing = one(values.billing)?.toUpperCase() ?? "";

  return {
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 1_000) : 1,
    query: (one(values.q) ?? "").trim().slice(0, 100),
    status: organizationStatuses.has(status as AdministrativeOrganizationStatus)
      ? status as AdministrativeOrganizationStatus
      : null,
    plan: (one(values.plan) ?? "").trim().slice(0, 64),
    billing: subscriptionStatuses.has(billing) ? billing : null,
  };
}

export function maskedDocumentLabel(input: {
  kind: "UNCLASSIFIED" | "INDIVIDUAL" | "COMPANY";
  cpfLastFour: string | null;
  cnpjLastFour: string | null;
}) {
  if (input.kind === "COMPANY" && input.cnpjLastFour) return `CNPJ •••• ${input.cnpjLastFour}`;
  if (input.kind === "INDIVIDUAL" && input.cpfLastFour) return `CPF •••• ${input.cpfLastFour}`;
  return "Documento não informado";
}

export function assertOrganizationStatusTransition(
  current: AdministrativeOrganizationStatus,
  next: AdministrativeOrganizationStatus,
) {
  if (current === next) return;
  const allowed = (current === "ACTIVE" && next === "SUSPENDED")
    || (current === "SUSPENDED" && next === "ACTIVE");
  if (!allowed) throw new Error("Transição administrativa de status não permitida.");
}

export function sanitizeAdministrativeReason(value: unknown) {
  if (typeof value !== "string") throw new Error("Justificativa obrigatória.");
  const reason = value.trim().replace(/\s+/g, " ");
  if (reason.length < 12 || reason.length > 500) {
    throw new Error("A justificativa deve ter entre 12 e 500 caracteres.");
  }
  return reason;
}
