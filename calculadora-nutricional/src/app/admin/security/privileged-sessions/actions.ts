"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  PLATFORM_PERMISSIONS,
  type PlatformPermissionKey,
} from "@/features/platform-iam/domain/platform-authorization";
import {
  approvePrivilegedSession,
  requestPrivilegedSession,
  revokePrivilegedSession,
} from "@/features/platform-iam/services/privileged-sessions";
import { isDatabaseId } from "@/lib/validation/identifiers";

const knownPermissions = new Set<string>(Object.values(PLATFORM_PERMISSIONS));

function value(formData: FormData, key: string) {
  const current = formData.get(key);
  return typeof current === "string" ? current : "";
}

function destination(kind: "error" | "success", message: string) {
  return `/admin/security/privileged-sessions?${kind}=${encodeURIComponent(message)}`;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "A operação privilegiada não foi concluída.";
}

export async function requestPrivilegedSessionAction(formData: FormData) {
  const permission = value(formData, "permission");
  if (!knownPermissions.has(permission)) redirect(destination("error", "Permissão inválida."));
  let activated = false;
  try {
    const session = await requestPrivilegedSession({
      permission: permission as PlatformPermissionKey,
      purpose: value(formData, "purpose"),
      justification: value(formData, "justification"),
      ticketReference: value(formData, "ticketReference"),
      targetType: value(formData, "targetType"),
      targetId: value(formData, "targetId"),
      durationMinutes: value(formData, "durationMinutes"),
      twoFactorCode: value(formData, "twoFactorCode"),
    });
    activated = session.status === "ACTIVE";
    revalidatePath("/admin", "layout");
  } catch (error) {
    redirect(destination("error", message(error)));
  }
  redirect(destination(
    "success",
    activated
      ? "Acesso privilegiado ativado e vinculado a esta sessão."
      : "Pedido crítico registrado; outro Security Admin deve aprovar antes do vencimento.",
  ));
}

export async function approvePrivilegedSessionAction(formData: FormData) {
  const id = value(formData, "privilegedSessionId");
  if (!isDatabaseId(id)) redirect(destination("error", "Sessão privilegiada inválida."));
  try {
    await approvePrivilegedSession({
      privilegedSessionId: id,
      twoFactorCode: value(formData, "twoFactorCode"),
    });
    revalidatePath("/admin", "layout");
  } catch (error) {
    redirect(destination("error", message(error)));
  }
  redirect(destination("success", "Pedido crítico aprovado com MFA e maker-checker."));
}

export async function revokePrivilegedSessionAction(formData: FormData) {
  const id = value(formData, "privilegedSessionId");
  if (!isDatabaseId(id)) redirect(destination("error", "Sessão privilegiada inválida."));
  try {
    await revokePrivilegedSession(id);
    revalidatePath("/admin", "layout");
  } catch (error) {
    redirect(destination("error", message(error)));
  }
  redirect(destination("success", "Sessão revogada imediatamente."));
}
