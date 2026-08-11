"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { consumeRequestRateLimit, getRequestRateLimit } from "@/lib/security/request-rate-limit";
import { normalizeLupaStyleConfig, type LupaStyleConfig } from "@/features/tables/domain/fop-lupa";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { canManageOrganizationSettings } from "@/features/settings/services/organization-settings";
import { databaseIdSchema } from "@/lib/validation/identifiers";

const inputSchema = z.object({
  tableId: databaseIdSchema,
  scope: z.enum(["table", "tenant"]),
  config: z.unknown(),
}).strict();

function readTableUiState(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export type SaveLupaStyleResult =
  | { ok: true; scope: "table" | "tenant"; config: LupaStyleConfig }
  | { ok: false; message: string };

export async function saveLupaStyle(input: unknown): Promise<SaveLupaStyleResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Configuração da lupa inválida." };

  const context = await getCurrentSaaSContext();
  if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TABLES)) {
    return { ok: false, message: "Sem permissão para alterar a lupa." };
  }

  const rateLimit = await consumeRequestRateLimit(
    parsed.data.scope === "tenant" ? "lupa-tenant-write" : "lupa-table-write",
    context.user.id,
    getRequestRateLimit(parsed.data.scope === "tenant" ? "workspaceWrites" : "tableWrites"),
  );
  if (!rateLimit.allowed) {
    return { ok: false, message: "Limite temporário de gravações atingido. Tente novamente mais tarde." };
  }

  const table = await prisma.generatedTable.findFirst({
    where: { id: parsed.data.tableId, organizationId: context.organization.id },
    select: { id: true, uiState: true },
  });
  if (!table) return { ok: false, message: "Tabela não encontrada ou sem permissão." };

  const config = normalizeLupaStyleConfig(parsed.data.config);

  if (parsed.data.scope === "tenant") {
    if (!canManageOrganizationSettings(context)) {
      return { ok: false, message: "Seu perfil não pode alterar o padrão global da organização." };
    }

    await prisma.$transaction([
      prisma.organization.update({
        where: { id: context.organization.id },
        data: { lupaStyleConfig: config as Prisma.InputJsonValue },
      }),
      prisma.securityAuditLog.create({
        data: {
          organizationId: context.organization.id,
          userId: context.user.id,
          action: "organization.lupa_style.updated",
          riskLevel: "INFO",
          metadata: { tableId: table.id, scope: "tenant", config } as Prisma.InputJsonValue,
        },
      }),
    ]);
  } else {
    const uiState = readTableUiState(table.uiState);
    await prisma.generatedTable.update({
      where: { id: table.id },
      data: {
        uiState: { ...uiState, lupaStyle: config } as Prisma.InputJsonValue,
      },
    });
  }

  revalidatePath(`/dashboard/edit/${table.id}`);
  revalidatePath(`/dashboard/edit/${table.id}/lupa`);
  revalidatePath("/dashboard/tables");

  return { ok: true, scope: parsed.data.scope, config };
}
