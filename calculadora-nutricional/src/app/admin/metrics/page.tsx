import Link from "next/link";
import { Activity, Banknote, Building2, CheckCircle2, CircleAlert, UsersRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";
import { getGlobalSaaSMetrics, listTenantSaaSMetrics } from "@/features/saas/services/saas-metrics";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}

function date(value: Date | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value) : "Sem atividade registrada";
}

const usageLabel = (key: string) => ({
  ai_imports_monthly: "Importações com IA",
  api_requests: "Chamadas de API",
  exports: "Exportações",
}[key] ?? key.replaceAll("_", " "));

function stateLabel(value: string) {
  const labels: Record<string, string> = { ACTIVE: "Ativa", TRIALING: "Em teste", PAST_DUE: "Em atraso", UNPAID: "Não paga", CANCELED: "Cancelada", SUSPENDED: "Suspensa", INCOMPLETE: "Pendente" };
  return labels[value] ?? value;
}

function alertTitle(code: string) {
  const labels: Record<string, string> = { FAILED_WEBHOOKS: "Notificações financeiras com falha", STALLED_WEBHOOKS: "Notificações sem progresso", CHECKOUT_RECONCILIATION_REQUIRED: "Checkouts aguardando conciliação", PAST_DUE_SUBSCRIPTIONS: "Assinaturas em atraso" };
  return labels[code] ?? "Pendência operacional";
}

export default async function MetricsPage() {
  await requirePlatformPagePermission({ permission: PLATFORM_PERMISSIONS.OPERATIONS_READ, action: "platform.metrics.viewed", targetId: "/admin/metrics" });
  const [global, tenants] = await Promise.all([getGlobalSaaSMetrics(), listTenantSaaSMetrics()]);

  return <>
    <PageHeader title="Métricas e consumo" actions={<Badge variant="outline">{global.period.start.toLocaleDateString("pt-BR", { timeZone: "UTC" })} – {new Date(global.period.end.getTime() - 1).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · UTC</Badge>} />
    {global.operationalAlerts.length === 0 ? (
      <Alert><CheckCircle2 /><AlertTitle>Nenhum alerta operacional ativo</AlertTitle></Alert>
    ) : global.operationalAlerts.map((alert) => (
      <Alert key={alert.code} variant={alert.severity === "critical" ? "destructive" : "default"}>
        <CircleAlert />
        <AlertTitle>{alert.count} · {alertTitle(alert.code)}</AlertTitle>
        <AlertDescription>{alert.message}</AlertDescription>
      </Alert>
    ))}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardHeader><Building2 /><CardDescription>Organizações ativas</CardDescription><CardTitle>{global.activeOrganizations}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{global.totalOrganizations} no total</CardContent></Card>
      <Card><CardHeader><UsersRound /><CardDescription>Assinaturas ativas / em teste</CardDescription><CardTitle>{global.activeSubscriptions} / {global.trials}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Conversão observada: {global.observedConversionPercent}%</CardContent></Card>
      <Card><CardHeader><Banknote /><CardDescription>Receita mensal recorrente conciliada (MRR)</CardDescription><CardTitle>{money(global.reconciledMrrMinor)}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Projeção anual (ARR): {money(global.reconciledArrMinor)}</CardContent></Card>
      <Card><CardHeader><CircleAlert /><CardDescription>Assinaturas em atraso / eventos financeiros falhos</CardDescription><CardTitle>{global.pastDue} / {global.failedWebhooks}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{global.stalledWebhooks} eventos sem progresso · {global.reconciliationRequired} checkouts a conciliar</CardContent></Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <Card><CardHeader><CardTitle>Saúde por organização</CardTitle></CardHeader><CardContent className="space-y-3">{tenants.rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma organização disponível.</p> : tenants.rows.map((tenant) => <article key={tenant.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={`/admin/organizations/${tenant.id}`} className="font-medium underline-offset-4 hover:underline">{tenant.name}</Link><p className="text-muted-foreground">{tenant.planName ? `${tenant.planName} v${tenant.planVersion}` : "Sem plano"} · {stateLabel(tenant.subscriptionStatus || tenant.status)}</p></div><Badge variant={tenant.failures30d ? "destructive" : "outline"}>{tenant.failures30d} falhas em 30 dias</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-4"><span>Vagas <strong className="text-foreground">{tenant.seats}</strong></span><span>Tabelas <strong className="text-foreground">{tenant.tables}</strong></span><span>Ingredientes <strong className="text-foreground">{tenant.ingredients}</strong></span><span>Importações IA/mês <strong className="text-foreground">{tenant.aiExtractions}</strong></span><span>Exportações/mês <strong className="text-foreground">{tenant.exports}</strong></span><span>Projetos Enterprise <strong className="text-foreground">{tenant.enterpriseProjects}</strong></span><span>Chamadas API/mês <strong className="text-foreground">{tenant.apiRequests}</strong></span><span>Usuários ativos/30d <strong className="text-foreground">{tenant.activeUsers30d}</strong></span></div><p className="mt-3 text-xs text-muted-foreground">Atividade: {date(tenant.lastActivityAt)}</p></article>)}</CardContent></Card>
      <div className="space-y-4"><Card><CardHeader><Activity /><CardTitle>Uso por recurso</CardTitle></CardHeader><CardContent className="space-y-2">{global.usage.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum consumo medido neste período.</p> : global.usage.map((item) => <div key={item.metricKey} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"><span className="truncate">{usageLabel(item.metricKey)}</span><Badge variant="secondary">{item.quantity}</Badge></div>)}</CardContent></Card><Card><CardHeader><CircleAlert /><CardTitle>Sinais operacionais · 30 dias</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{global.incidents} eventos de risco alto ou crítico</p><p>{global.canceledRecently} cancelamentos</p></CardContent></Card></div>
    </div>
  </>;
}
