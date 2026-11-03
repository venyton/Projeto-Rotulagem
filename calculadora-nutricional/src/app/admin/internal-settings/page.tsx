import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { INGREDIENT_QUANTITY_PRECISION_KEY } from "@/features/configuration/domain/ingredient-precision";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";
import { prisma } from "@/lib/prisma";

function auditDetail(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    scope: typeof record.scopeKey === "string" ? record.scopeKey : "—",
    previous: typeof record.previousValue === "number" ? String(record.previousValue) : "padrão herdado",
    next: typeof record.newValue === "number" ? String(record.newValue) : "padrão herdado",
  };
}

export default async function InternalSettingsPage() {
  await requirePlatformPagePermission({ permission: PLATFORM_PERMISSIONS.CONFIGURATION_READ, action: "platform.internal_settings.viewed", targetId: "/admin/internal-settings" });
  const events = await prisma.securityAuditLog.findMany({
    where: { action: { in: ["configuration.created", "configuration.updated", "configuration.reset"] }, metadata: { path: ["key"], equals: INGREDIENT_QUANTITY_PRECISION_KEY } },
    orderBy: { createdAt: "desc" }, take: 25,
    select: { id: true, createdAt: true, metadata: true, user: { select: { email: true } } },
  });

  return <div className="flex flex-col gap-6">
    <PageHeader title="Configurações internas" description="Parâmetros internos da plataforma." />
    <Alert><AlertTitle>Precisão de ingredientes</AlertTitle><AlertDescription>O limite administrativo anterior não é mais aplicado. O editor aceita quantidades com até 80 casas decimais em gramas; a apresentação nutricional mantém suas próprias regras.</AlertDescription></Alert>
    <section className="flex flex-col gap-3" aria-labelledby="precision-history">
      <h2 id="precision-history" className="text-xl font-semibold">Últimas alterações de precisão</h2>
      {events.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p> : <ul className="flex flex-col gap-3">{events.map((event) => {
        const detail = auditDetail(event.metadata);
        return <li key={event.id} className="text-sm"><p>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(event.createdAt)} · {event.user?.email ?? "Usuário removido"}</p><p className="text-muted-foreground">{detail?.scope}: {detail?.previous} → {detail?.next}</p></li>;
      })}</ul>}
    </section>
  </div>;
}
