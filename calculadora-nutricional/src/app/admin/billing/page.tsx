import Link from "next/link";
import { AlertCircle, CheckCircle2, CreditCard } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getAsaasSetupStatus } from "@/features/billing/integrations/asaas/asaas-settings";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";
import { listBillingOperationsForAdministration } from "@/features/platform-iam/services/customer-administration";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { getRolloutFlags } from "@/features/rollout/services/feature-flags";

import { reprocessWebhookAction } from "./actions";

function date(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value) : "—";
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value / 100);
}

function billingState(value: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativa", TRIALING: "Em teste", PAST_DUE: "Em atraso", UNPAID: "Não paga",
    CANCELED: "Cancelada", INCOMPLETE: "Pendente", INCOMPLETE_EXPIRED: "Expirada",
    PAUSED: "Pausada", PENDING: "Pendente", PROCESSING: "Processando",
    SUCCEEDED: "Concluído", FAILED: "Falhou", EXPIRED: "Expirado", RECEIVED: "Recebido",
    CONFIRMED: "Confirmado", PAID: "Pago", REFUNDED: "Estornado", OPEN: "Aberto",
    RETRYING: "Nova tentativa", DEAD_LETTER: "Falha final", SYNC_ERROR: "Falha de sincronização",
  };
  return labels[value] ?? value;
}

export default async function BillingOperationsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [access, data, feedback] = await Promise.all([
    requirePlatformPagePermission({ permission: PLATFORM_PERMISSIONS.BILLING_READ, action: "platform.billing.operations.viewed", targetId: "/admin/billing" }),
    listBillingOperationsForAdministration(),
    searchParams,
  ]);
  const canReprocess = access.permissionKeys.includes(PLATFORM_PERMISSIONS.OPERATIONS_REPROCESS);
  const [asaas, rollout] = await Promise.all([getAsaasSetupStatus(), getRolloutFlags()]);
  const configured = asaas.configured;
  const error = typeof feedback.error === "string" ? feedback.error : null;
  const success = typeof feedback.success === "string" ? feedback.success : null;

  return <>
    <PageHeader title="Cobranças e assinaturas" actions={<div className="flex flex-wrap gap-2"><Badge variant="outline">Asaas · {configured ? "credencial pronta" : "sem credencial"}</Badge><Badge variant={rollout[ROLLOUT_FLAGS.BILLING_ASAAS] ? "default" : "secondary"}>Integração {rollout[ROLLOUT_FLAGS.BILLING_ASAAS] ? "ativa" : "pausada"}</Badge><Badge variant={rollout[ROLLOUT_FLAGS.BILLING_WEBHOOK_PROCESSING] ? "default" : "secondary"}>Webhooks {rollout[ROLLOUT_FLAGS.BILLING_WEBHOOK_PROCESSING] ? "ativos" : "pausados"}</Badge></div>} />
    {error ? <Alert variant="destructive"><AlertCircle /><AlertTitle>Operação não concluída</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    {success ? <Alert><CheckCircle2 /><AlertTitle>Operação concluída</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}
    {!configured ? <Alert><CreditCard /><AlertTitle>Integração externa desativada · dados locais</AlertTitle></Alert> : null}
    {!canReprocess ? <Alert><AlertTitle>Reprocessamento indisponível para este perfil</AlertTitle></Alert> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card><CardHeader><CardDescription>Assinaturas recentes</CardDescription><CardTitle>{data.subscriptions.length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Checkouts pendentes</CardDescription><CardTitle>{data.checkouts.length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Cobranças recentes</CardDescription><CardTitle>{data.charges.length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Webhooks pendentes</CardDescription><CardTitle>{data.webhooks.length}</CardTitle></CardHeader></Card></div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Assinaturas</CardTitle><CardDescription>Até 50 atualizações recentes</CardDescription></CardHeader><CardContent className="space-y-2">{data.subscriptions.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma assinatura registrada.</p> : data.subscriptions.map((item) => <div key={item.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><Button asChild variant="link" className="h-auto p-0"><Link href={`/admin/organizations/${item.organization.id}`}>{item.organization.name}</Link></Button><Badge variant="outline">{billingState(item.status)}</Badge></div><p className="mt-1 text-muted-foreground">{item.planVersion ? `${item.planVersion.plan.name} v${item.planVersion.versionNumber}` : "Plano histórico"} · atualizado {date(item.updatedAt)}</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Cobranças</CardTitle></CardHeader><CardContent className="space-y-2">{data.charges.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma cobrança registrada.</p> : data.charges.map((item) => <div key={item.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><Link className="font-medium underline-offset-4 hover:underline" href={`/admin/organizations/${item.organization.id}`}>{item.organization.name}</Link><Badge variant="outline">{billingState(item.status)}</Badge></div><p className="mt-1 text-muted-foreground">{money(item.amountMinor, item.currency)} · {date(item.paidAt ?? item.updatedAt)}</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Checkouts que exigem atenção</CardTitle></CardHeader><CardContent className="space-y-2">{data.checkouts.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum checkout pendente.</p> : data.checkouts.map((item) => <div key={item.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><Link className="font-medium underline-offset-4 hover:underline" href={`/admin/organizations/${item.organization.id}`}>{item.organization.name}</Link><Badge variant={item.status === "FAILED" ? "destructive" : "outline"}>{billingState(item.status)}</Badge></div><p className="mt-1 text-muted-foreground">{item.lastErrorCode || "Sem código de erro"} · {date(item.updatedAt)}</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Eventos recebidos (webhooks)</CardTitle></CardHeader><CardContent className="space-y-2">{data.webhooks.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento pendente.</p> : data.webhooks.map((event) => <div key={event.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><strong>{event.type}</strong><p className="text-muted-foreground">{event.organization?.name || "Organização não identificada"} · {billingState(event.status)} · {event.lastErrorCode || "Sem código de erro"}</p></div>{canReprocess ? <form action={reprocessWebhookAction}><input type="hidden" name="eventId" value={event.id} />{event.organization ? <input type="hidden" name="organizationId" value={event.organization.id} /> : null}<Button type="submit" variant="outline">Reprocessar evento</Button></form> : null}</div>)}</CardContent></Card>
    </div>
  </>;
}
