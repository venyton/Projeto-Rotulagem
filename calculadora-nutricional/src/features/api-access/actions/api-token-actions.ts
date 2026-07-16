"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { API_TOKEN_PREFIX, hashApiToken } from "@/features/api-access/services/api-token-auth";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";

export type ApiTokenActionState = {
  error?: string;
  success?: boolean;
  token?: string;
};

const EXPIRATION_DAYS = new Set([30, 90, 365]);

export async function createApiAccessToken(
  _previousState: ApiTokenActionState,
  formData: FormData,
): Promise<ApiTokenActionState> {
  let context: Awaited<ReturnType<typeof requireModuleAccess>>;
  try {
    context = await requireModuleAccess(SAAS_MODULES.API_ACCESS);
  } catch (error) {
    if (error instanceof ModuleAccessError) return { error: error.message };
    throw error;
  }

  const name = String(formData.get("name") || "").trim();
  const expirationDays = Number(formData.get("expirationDays"));
  if (name.length < 2 || name.length > 80 || !EXPIRATION_DAYS.has(expirationDays)) {
    return { error: "Informe um nome e uma validade válidos." };
  }

  const rawToken = `${API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

  const created = await prisma.apiAccessToken.create({
    data: {
      organizationId: context.organization.id,
      userId: context.user.id,
      name,
      tokenHash: hashApiToken(rawToken),
      tokenPrefix: rawToken.slice(0, 12),
      lastFour: rawToken.slice(-4),
      expiresAt,
    },
    select: { id: true },
  });

  await prisma.securityAuditLog.create({
    data: {
      organizationId: context.organization.id,
      userId: context.user.id,
      action: "api.token.created",
      riskLevel: "INFO",
      metadata: { tokenId: created.id, name, expiresAt: expiresAt.toISOString() },
    },
  });

  revalidatePath("/dashboard/api-access");
  return { success: true, token: rawToken };
}

export async function revokeApiAccessToken(formData: FormData) {
  const tokenId = String(formData.get("tokenId") || "");
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(tokenId)) return;

  let context: Awaited<ReturnType<typeof requireModuleAccess>>;
  try {
    context = await requireModuleAccess(SAAS_MODULES.API_ACCESS);
  } catch {
    return;
  }

  const result = await prisma.apiAccessToken.updateMany({
    where: {
      id: tokenId,
      organizationId: context.organization.id,
      userId: context.user.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return;

  await prisma.securityAuditLog.create({
    data: {
      organizationId: context.organization.id,
      userId: context.user.id,
      action: "api.token.revoked",
      riskLevel: "INFO",
      metadata: { tokenId },
    },
  });

  revalidatePath("/dashboard/api-access");
}
