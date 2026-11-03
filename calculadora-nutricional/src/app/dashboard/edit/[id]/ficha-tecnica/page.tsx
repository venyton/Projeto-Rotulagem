import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { ProductSheetEditor } from "@/features/product-technical-sheets/components/ProductSheetEditor";
import { readProductSheet } from "@/features/product-technical-sheets/domain/product-sheet";
import { isDatabaseId } from "@/lib/validation/identifiers";

export default async function ProductSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getCurrentSaaSContext();
  if (!context) redirect("/login");
  if (!contextHasModuleAccess(context, SAAS_MODULES.TABLES)) return <ModuleGateMessage moduleKey={SAAS_MODULES.TABLES} />;
  if (!contextHasModuleAccess(context, SAAS_MODULES.EXPORTS)) return <ModuleGateMessage moduleKey={SAAS_MODULES.EXPORTS} />;
  if (!isDatabaseId(id)) redirect("/dashboard");
  const [table, laws, approved, organization] = await Promise.all([
    prisma.generatedTable.findFirst({ where: { id, organizationId: context.organization.id }, select: { title: true, productTechnicalSheet: { select: { data: true } } } }),
    prisma.productLegislation.findMany({ where: { organizationId: context.organization.id }, select: { id: true, number: true, title: true }, orderBy: { number: "asc" }, take: 500 }),
    contextHasModuleAccess(context, SAAS_MODULES.ENTERPRISE_LABELS) ? prisma.enterpriseLabelVersion.findFirst({ where: { baseTableId: id, approvalStatus: "APPROVED", project: { organizationId: context.organization.id, market: "br" } }, orderBy: { updatedAt: "desc" }, select: { legalData: true } }) : Promise.resolve(null),
    prisma.organization.findUnique({ where: { id: context.organization.id }, select: { legalName: true, name: true } }),
  ]);
  if (!table) redirect("/dashboard");
  const sheet = readProductSheet(table.productTechnicalSheet?.data);
  const legal = approved?.legalData && typeof approved.legalData === "object" && !Array.isArray(approved.legalData) ? approved.legalData : {};
  const defaults: Record<string, string> = { company: organization?.legalName || organization?.name || "" };
  if (typeof legal.ingredientsStatement === "string") defaults.ingredients = legal.ingredientsStatement;
  if (typeof legal.allergenStatement === "string") defaults.allergens = legal.allergenStatement;
  const lockedLabels = [typeof legal.ingredientsStatement === "string" && legal.ingredientsStatement ? "ingredients" : "", typeof legal.allergenStatement === "string" && legal.allergenStatement ? "allergens" : ""].filter(Boolean);
  return <div className="app-page flex flex-col gap-6"><PageHeader title="Gerar Ficha Técnica" description="Complete e revise as informações antes de gerar o documento." /><ProductSheetEditor tableId={id} title={table.title} initial={{ ...sheet, fields: { ...defaults, ...sheet.fields, ...Object.fromEntries(lockedLabels.map(key => [key, defaults[key]])) } }} initialLaws={laws} lockedLabels={lockedLabels} isNew={!table.productTechnicalSheet} /></div>;
}
