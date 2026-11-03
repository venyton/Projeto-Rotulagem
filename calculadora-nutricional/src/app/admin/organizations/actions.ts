"use server";

import type { OrganizationStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { sanitizeAdministrativeReason } from "@/features/platform-iam/domain/customer-administration";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { authorizePrivilegedPlatformRequest } from "@/features/platform-iam/services/privileged-sessions";
import { updateOrganizationAdministrativeStatus } from "@/features/platform-iam/services/customer-administration";
import { isDatabaseId } from "@/lib/validation/identifiers";

function value(formData: FormData, key: string) {
  const current = formData.get(key);
  return typeof current === "string" ? current : "";
}

function destination(organizationId: string, key: "error" | "success", message: string) {
  return `/admin/organizations/${organizationId}?${key}=${encodeURIComponent(message)}`;
}

export async function updateOrganizationStatusAction(formData: FormData) {
  const organizationId = value(formData, "organizationId");
  if (!isDatabaseId(organizationId)) redirect("/admin/organizations?error=Organização+inválida.");

  const access = await authorizePrivilegedPlatformRequest({
    permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_UPDATE,
    action: "platform.organization.status.update.requested",
    targetType: "ORGANIZATION",
    targetId: organizationId,
  });
  if (!access.allowed || !access.user) redirect(destination(organizationId, "error", "Permissão insuficiente para alterar o status."));

  try {
    const nextStatus = value(formData, "nextStatus") as OrganizationStatus;
    if (nextStatus !== "ACTIVE" && nextStatus !== "SUSPENDED") throw new Error("Status inválido.");
    const reason = sanitizeAdministrativeReason(value(formData, "reason"));
    await updateOrganizationAdministrativeStatus({
      organizationId,
      nextStatus,
      reason,
      actorUserId: access.user.id,
      actorRole: access.roleKeys.join(","),
      privilegedSessionId: access.privilegedSessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "A organização permaneceu inalterada.";
    redirect(destination(organizationId, "error", message));
  }
  redirect(destination(organizationId, "success", "Status atualizado e evento de auditoria registrado."));
}
