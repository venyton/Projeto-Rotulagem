export type BillingWorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "BILLING";

export function canManageOrganizationBilling(role: BillingWorkspaceRole) {
  // BILLING é um valor histórico preservado. Ele permanece sem autoridade até
  // existir permission granular e migração explícita aprovada.
  return role === "OWNER" || role === "ADMIN";
}
