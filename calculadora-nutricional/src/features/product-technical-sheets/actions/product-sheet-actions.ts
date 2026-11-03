"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isDatabaseId } from "@/lib/validation/identifiers";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { requireModuleAccess } from "@/features/saas/services/entitlements";
import { productSheetSchema } from "@/features/product-technical-sheets/domain/product-sheet";
import { consumeRequestRateLimit, getRequestRateLimit } from "@/lib/security/request-rate-limit";

async function authorized() {
  const context = await requireModuleAccess(SAAS_MODULES.EXPORTS);
  await requireModuleAccess(SAAS_MODULES.TABLES);
  const limit = await consumeRequestRateLimit("table_writes", context.user.id, getRequestRateLimit("tableWrites"));
  if (!limit.allowed) throw new Error("Limite temporário de gravações atingido.");
  return context;
}

export async function saveProductSheet(tableId: string, raw: unknown) {
  try {
    const context = await authorized();
    if (!isDatabaseId(tableId) || JSON.stringify(raw).length > 200_000) return { error: "Dados da ficha inválidos." };
    const parsed = productSheetSchema.safeParse(raw);
    if (!parsed.success) return { error: "Dados da ficha inválidos." };
    const table = await prisma.generatedTable.findFirst({ where: { id: tableId, organizationId: context.organization.id }, select: { id: true } });
    if (!table) return { error: "Produto não encontrado." };
    const ids = [...new Set(parsed.data.laws.map(law => law.id))];
    const count = await prisma.productLegislation.count({ where: { id: { in: ids }, organizationId: context.organization.id } });
    if (count !== ids.length) return { error: "Uma legislação selecionada não está disponível." };
    let logo = parsed.data.logo;
    if (logo) {
      const bytes = Buffer.from(logo, "base64");
      if (bytes.length > 120_000) return { error: "A logomarca excede o limite permitido." };
      try {
        const image = sharp(bytes, { limitInputPixels: 5_000_000, failOn: "error" });
        const metadata = await image.metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format || "")) return { error: "Formato de logomarca inválido." };
        logo = (await image.resize(300, 90, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer()).toString("base64");
      } catch { return { error: "Logomarca inválida." }; }
    }
    const data = { ...parsed.data, logo: logo || "" };
    await prisma.productTechnicalSheet.upsert({ where: { tableId }, create: { tableId, organizationId: context.organization.id, data: data as Prisma.InputJsonValue }, update: { data: data as Prisma.InputJsonValue } });
    revalidatePath(`/dashboard/edit/${tableId}/ficha-tecnica`);
    return { success: true };
  } catch { return { error: "Não foi possível salvar a ficha. Confira seu acesso e tente novamente." }; }
}

const lawInput = z.object({ id: z.string().optional(), number: z.string().trim().min(1).max(160), title: z.string().trim().min(1).max(500) }).strict();
export async function saveProductLegislation(raw: unknown) {
  try {
    const context = await authorized();
    if (JSON.stringify(raw).length > 4_000) return { error: "Dados da legislação inválidos." };
    const parsed = lawInput.safeParse(raw);
    if (!parsed.success || (parsed.data.id && !isDatabaseId(parsed.data.id))) return { error: "Informe número e título válidos." };
    const { id, number, title } = parsed.data;
    if (id) {
      const updated = await prisma.productLegislation.updateMany({ where: { id, organizationId: context.organization.id }, data: { number, title } });
      if (!updated.count) return { error: "Legislação não encontrada." };
      return { law: { id, number, title } };
    }
    const count = await prisma.productLegislation.count({ where: { organizationId: context.organization.id } });
    if (count >= 500) return { error: "Limite de legislações atingido." };
    const law = await prisma.productLegislation.create({ data: { organizationId: context.organization.id, number, title }, select: { id: true, number: true, title: true } });
    return { law };
  } catch { return { error: "Não foi possível salvar a legislação." }; }
}
export async function deleteProductLegislation(id: string) {
  try {
    const context = await authorized();
    if (!isDatabaseId(id)) return { error: "Legislação inválida." };
    const deleted = await prisma.productLegislation.deleteMany({ where: { id, organizationId: context.organization.id } });
    return deleted.count ? { success: true } : { error: "Legislação não encontrada." };
  } catch { return { error: "Não foi possível excluir a legislação." }; }
}
