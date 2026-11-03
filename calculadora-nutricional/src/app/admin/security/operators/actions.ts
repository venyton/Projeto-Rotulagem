"use server";

import { redirect } from "next/navigation";

import {
  createPlatformOperatorAssignment,
  revokePlatformOperatorAssignment,
} from "@/features/platform-iam/services/operator-management";
import { isDatabaseId } from "@/lib/validation/identifiers";
import { platformRoleKeySchema } from "@/lib/validation/platform-iam";

function value(formData: FormData, key: string) {
  const current = formData.get(key);
  return typeof current === "string" ? current : "";
}

function destination(kind: "error" | "success", message: string) {
  return `/admin/security/operators?${kind}=${encodeURIComponent(message)}`;
}

export async function createOperatorAssignmentAction(formData: FormData) {
  const userId = value(formData, "userId");
  const platformRoleKey = platformRoleKeySchema.safeParse(value(formData, "platformRoleKey"));
  if (!isDatabaseId(userId) || !platformRoleKey.success) {
    redirect(destination("error", "Pessoa ou perfil de acesso inválido."));
  }
  const rawExpiry = value(formData, "expiresAt");
  const expiresAt = rawExpiry ? new Date(rawExpiry) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) redirect(destination("error", "Expiração inválida."));
  try {
    await createPlatformOperatorAssignment({ userId, platformRoleKey: platformRoleKey.data, expiresAt });
  } catch (error) {
    redirect(destination("error", error instanceof Error ? error.message : "Assignment não criado."));
  }
  redirect(destination("success", "Assignment criado e auditado."));
}

export async function revokeOperatorAssignmentAction(formData: FormData) {
  const assignmentId = value(formData, "assignmentId");
  if (!isDatabaseId(assignmentId)) redirect(destination("error", "Assignment inválido."));
  try {
    await revokePlatformOperatorAssignment(assignmentId);
  } catch (error) {
    redirect(destination("error", error instanceof Error ? error.message : "Assignment não revogado."));
  }
  redirect(destination("success", "Assignment e sessões privilegiadas associadas foram revogados."));
}
