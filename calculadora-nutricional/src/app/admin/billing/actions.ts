"use server";

import { redirect } from "next/navigation";

import { getAsaasSetupStatus } from "@/features/billing/integrations/asaas/asaas-settings";
import { processBillingWebhookEvent, reconcileCheckoutAttempt } from "@/features/billing/services/webhooks";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { authorizePlatformRequest } from "@/features/platform-iam/services/platform-access";
import { prisma } from "@/lib/prisma";
import { isDatabaseId } from "@/lib/validation/identifiers";

function value(formData: FormData, key: string) {
  const current = formData.get(key);
  return typeof current === "string" ? current : "";
}

function returnTo(organizationId: string | null, key: "error" | "success", message: string) {
  const base = organizationId ? `/admin/organizations/${organizationId}` : "/admin/billing";
  return `${base}?${key}=${encodeURIComponent(message)}`;
}

export async function reconcileCheckoutAction(formData: FormData) {
  const organizationId = value(formData, "organizationId");
  const attemptId = value(formData, "attemptId");
  if (!isDatabaseId(organizationId) || !isDatabaseId(attemptId)) redirect(returnTo(null, "error", "Referência de checkout inválida."));
  const access = await authorizePlatformRequest({
    permission: PLATFORM_PERMISSIONS.BILLING_RECONCILE,
    action: "platform.billing.checkout.reconcile.requested",
    targetType: "BILLING_CHECKOUT",
    targetId: attemptId,
  });
  if (!access.allowed || !access.user) redirect(returnTo(organizationId, "error", "Permissão insuficiente para reconciliar."));
  if (!(await getAsaasSetupStatus()).configured) {
    redirect(returnTo(organizationId, "error", "Sandbox Asaas ainda não configurado. Nenhuma chamada externa foi feita."));
  }
  try {
    await reconcileCheckoutAttempt({ organizationId, attemptId, actorUserId: access.user.id });
    await prisma.securityAuditLog.create({ data: {
      organizationId, userId: access.user.id, action: "platform.billing.checkout.reconciled", riskLevel: "MEDIUM",
      actorRole: access.roleKeys.join(","), permission: PLATFORM_PERMISSIONS.BILLING_RECONCILE,
      targetType: "BILLING_CHECKOUT", targetId: attemptId, result: "SUCCESS",
    } });
  } catch {
    redirect(returnTo(organizationId, "error", "Reconciliação não concluída; o estado persistido foi preservado."));
  }
  redirect(returnTo(organizationId, "success", "Checkout reconciliado a partir do provedor."));
}

export async function reprocessWebhookAction(formData: FormData) {
  const organizationId = value(formData, "organizationId") || null;
  const eventId = value(formData, "eventId");
  if (!isDatabaseId(eventId) || (organizationId !== null && !isDatabaseId(organizationId))) {
    redirect(returnTo(null, "error", "Referência de evento inválida."));
  }
  const access = await authorizePlatformRequest({
    permission: PLATFORM_PERMISSIONS.OPERATIONS_REPROCESS,
    action: "platform.billing.webhook.reprocess.requested",
    targetType: "BILLING_WEBHOOK_EVENT",
    targetId: eventId,
  });
  if (!access.allowed || !access.user) redirect(returnTo(organizationId, "error", "Permissão insuficiente para reprocessar."));
  const event = await prisma.billingWebhookEvent.findFirst({
    where: { id: eventId, ...(organizationId ? { organizationId } : {}) },
    select: { organizationId: true },
  });
  if (!event) redirect(returnTo(organizationId, "error", "Evento não encontrado no escopo informado."));
  try {
    await processBillingWebhookEvent(eventId);
    await prisma.securityAuditLog.create({ data: {
      organizationId: event.organizationId, userId: access.user.id, action: "platform.billing.webhook.reprocessed", riskLevel: "MEDIUM",
      actorRole: access.roleKeys.join(","), permission: PLATFORM_PERMISSIONS.OPERATIONS_REPROCESS,
      targetType: "BILLING_WEBHOOK_EVENT", targetId: eventId, result: "SUCCESS",
    } });
  } catch {
    redirect(returnTo(organizationId, "error", "O evento continua pendente ou falhou novamente; consulte o código sanitizado."));
  }
  redirect(returnTo(organizationId, "success", "Evento reprocessado com auditoria."));
}
