import Link from "next/link";
import { AlertCircle, CheckCircle2, CreditCard, KeyRound, ShieldCheck, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { getAsaasSetupStatus } from "@/features/billing/integrations/asaas/asaas-settings";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";
import { getOrganizationForAdministration } from "@/features/platform-iam/services/customer-administration";
import { isDatabaseId } from "@/lib/validation/identifiers";

import { reprocessWebhookAction, reconcileCheckoutAction } from "../../billing/actions";
import { updateOrganizationStatusAction } from "../actions";

function date(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value) : "—";
}

function money(amountMinor: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amountMinor / 100);
}

function subscriptionState(value: string) {
  const labels: Record<string, string> = { ACTIVE: "Ativa", TRIALING: "Em teste", PAST_DUE: "Em atraso", UNPAID: "Não paga", CANCELED: "Cancelada", INCOMPLETE: "Pendente", PAUSED: "Pausada", PENDING: "Pendente", PROCESSING: "Processando", SUCCEEDED: "Concluído", FAILED: "Falhou", EXPIRED: "Expirado", RECEIVED: "Recebido", CONFIRMED: "Confirmado", PAID: "Pago", REFUNDED: "Estornado", RETRYING: "Nova tentativa", DEAD_LETTER: "Falha final" };
  return labels[value] ?? value;
}

function billingInterval(value: string) {
  const labels: Record<string, string> = { MONTHLY: "mensal", QUARTERLY: "trimestral", SEMIANNUAL: "semestral", YEARLY: "anual" };
  return labels[value] ?? value;
}

function organizationKind(value: string) {
  const labels: Record<string, string> = { COMPANY: "Empresa", INDIVIDUAL: "Pessoa física", UNCLASSIFIED: "Não classificada" };
  return labels[value] ?? value;
}

function memberRole(value: string) {
  const labels: Record<string, string> = { OWNER: "Responsável", ADMIN: "Administrador", MEMBER: "Membro" };
  return labels[value] ?? value;
}

function entitlementSource(value: string) {
  const labels: Record<string, string> = { PLAN: "Plano", GRANT: "Concessão", OVERRIDE: "Exceção", DEFAULT: "Padrão" };
  return labels[value] ?? value;
}

const organizationState = { ACTIVE: "Ativa", SUSPENDED: "Suspensa", ARCHIVED: "Arquivada" } as const;

function PermissionNotice({ children }: { children: React.ReactNode }) {
  return <Alert><ShieldCheck /><AlertTitle>Seu perfil não tem acesso a esta seção</AlertTitle><AlertDescription>{children}</AlertDescription></Alert>;
}

export default async function OrganizationDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, feedback] = await Promise.all([params, searchParams]);
  if (!isDatabaseId(id)) notFound();
  const access = await requirePlatformPagePermission({
    permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_READ,
    action: "platform.organization.detail.viewed",
    targetId: id,
  });
  const detail = await getOrganizationForAdministration(id, access.permissionKeys);
  if (!detail) notFound();

  const { organization, members, billing, entitlements, audit, security } = detail;
  const canUpdate = access.permissionKeys.includes(PLATFORM_PERMISSIONS.ORGANIZATIONS_UPDATE);
  const canReconcile = access.permissionKeys.includes(PLATFORM_PERMISSIONS.BILLING_RECONCILE);
  const canReprocess = access.permissionKeys.includes(PLATFORM_PERMISSIONS.OPERATIONS_REPROCESS);
  const asaasConfigured = (await getAsaasSetupStatus()).configured;
  const error = typeof feedback.error === "string" ? feedback.error : null;
  const success = typeof feedback.success === "string" ? feedback.success : null;
  const activeMembers = members?.filter((member) => member.active).length ?? 0;
  const twoFactorMembers = members?.filter((member) => member.active && member.user.twoFactorEnabled).length ?? 0;

  return (
    <>
      <PageHeader
        title={organization.name}
        description={`Documento ${organization.document} · criada em ${date(organization.createdAt)}`}
        actions={<div className="flex flex-wrap gap-2"><Badge variant={organization.status === "ACTIVE" ? "secondary" : "destructive"}>{organizationState[organization.status]}</Badge><Button asChild variant="outline"><Link href="/admin/organizations">Voltar às organizações</Link></Button></div>}
      />

      {error ? <Alert variant="destructive"><AlertCircle /><AlertTitle>Operação não concluída</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {success ? <Alert><CheckCircle2 /><AlertTitle>Operação concluída</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}
      {!asaasConfigured ? <Alert><CreditCard /><AlertTitle>Asaas sem credencial · reconciliação desativada</AlertTitle></Alert> : null}

      <Tabs defaultValue="overview" className="gap-4">
        <div className="overflow-x-auto pb-1"><TabsList><TabsTrigger value="overview">Resumo</TabsTrigger><TabsTrigger value="subscription">Assinatura</TabsTrigger><TabsTrigger value="entitlements">Recursos</TabsTrigger><TabsTrigger value="members">Pessoas</TabsTrigger><TabsTrigger value="security">Segurança</TabsTrigger><TabsTrigger value="audit">Auditoria</TabsTrigger><TabsTrigger value="support">Suporte</TabsTrigger></TabsList></div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card><CardHeader><CardDescription>Status</CardDescription><CardTitle>{organizationState[organization.status]}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Responsável</CardDescription><CardTitle className="text-base">{organization.owner.name || organization.owner.email}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{organization.owner.email}</CardContent></Card>
            <Card><CardHeader><CardDescription>Membros ativos</CardDescription><CardTitle>{members === null ? "Restrito" : activeMembers}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Política de acesso</CardDescription><CardTitle>v{organization.entitlementPolicyVersion}</CardTitle></CardHeader></Card>
          </div>
          <Card><CardHeader><CardTitle>Dados da organização</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm md:grid-cols-2"><p><span className="text-muted-foreground">Identificador:</span> {organization.slug}</p><p><span className="text-muted-foreground">Tipo:</span> {organizationKind(organization.kind)}</p><p><span className="text-muted-foreground">Razão social:</span> {organization.legalName || "—"}</p><p><span className="text-muted-foreground">Nome fantasia:</span> {organization.tradeName || "—"}</p><p><span className="text-muted-foreground">Atualizada em:</span> {date(organization.updatedAt)}</p></CardContent></Card>
          {canUpdate && organization.status !== "ARCHIVED" ? <Card><CardHeader><CardTitle>{organization.status === "ACTIVE" ? "Suspender acesso" : "Reativar acesso"}</CardTitle></CardHeader><CardContent><form action={updateOrganizationStatusAction} className="space-y-3"><input type="hidden" name="organizationId" value={organization.id} /><input type="hidden" name="nextStatus" value={organization.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} /><div className="space-y-2"><Label htmlFor="status-reason">Motivo da alteração</Label><Input id="status-reason" name="reason" required minLength={12} maxLength={500} placeholder="Descreva o motivo" /></div><label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1 size-4 accent-primary" /><span>Confirmo: o acesso muda; dados e assinatura permanecem.</span></label><Button type="submit" variant={organization.status === "ACTIVE" ? "destructive" : "default"}>{organization.status === "ACTIVE" ? "Suspender organização" : "Reativar organização"}</Button></form></CardContent></Card> : null}
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          {!billing ? <PermissionNotice>É necessária a permission <code>platform.billing.read</code>.</PermissionNotice> : <>
            <Card><CardHeader><CardTitle>Assinaturas</CardTitle><CardDescription>Status confirmado após conciliação do pagamento</CardDescription></CardHeader><CardContent className="space-y-3">{billing.subscriptions.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma assinatura registrada.</p> : billing.subscriptions.map((item) => <div key={item.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.planVersion ? `${item.planVersion.plan.name} v${item.planVersion.versionNumber}` : "Plano histórico"}</strong><Badge variant="outline">{subscriptionState(item.status)}</Badge></div><p className="mt-2 text-muted-foreground">{item.billingPrice ? `${money(item.couponRedemption && !item.couponRedemption.revokedAt ? item.couponRedemption.finalAmountMinor : item.billingPrice.amountMinor, item.billingPrice.currency)} · cobrança ${billingInterval(item.billingPrice.billingInterval)}` : "Preço não vinculado"} · período até {date(item.currentPeriodEnd)}</p>{item.couponRedemption && !item.couponRedemption.revokedAt ? <p className="mt-1 text-muted-foreground">Cupom {item.couponRedemption.coupon.codeNormalized}: −{money(item.couponRedemption.appliedDiscountMinor, item.couponRedemption.currency)}</p> : null}</div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Checkouts</CardTitle></CardHeader><CardContent className="space-y-3">{billing.checkouts.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum checkout registrado.</p> : billing.checkouts.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="flex gap-2"><Badge variant="outline">{subscriptionState(item.status)}</Badge>{item.lastErrorCode ? <Badge variant="destructive">{item.lastErrorCode}</Badge> : null}</div><p className="mt-2 text-muted-foreground">Criado em {date(item.createdAt)} · expira {date(item.expiresAt)}</p></div>{canReconcile ? <form action={reconcileCheckoutAction}><input type="hidden" name="organizationId" value={organization.id} /><input type="hidden" name="attemptId" value={item.id} /><Button type="submit" variant="outline" disabled={!asaasConfigured}>Consultar e reconciliar no Asaas</Button></form> : null}</div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Cobranças recentes</CardTitle></CardHeader><CardContent className="space-y-2">{billing.charges.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma cobrança reconciliada.</p> : billing.charges.map((charge) => <div key={charge.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span>{money(charge.amountMinor, charge.currency)} · {date(charge.createdAt)}</span><Badge variant="outline">{charge.status}</Badge></div>)}</CardContent></Card>
            {billing.pendingWebhooks.length ? <Card><CardHeader><CardTitle>Eventos pendentes</CardTitle></CardHeader><CardContent className="space-y-2">{billing.pendingWebhooks.map((event) => <div key={event.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><strong>{event.type}</strong><p className="text-muted-foreground">{event.status} · tentativa {event.processingAttempts} · {event.lastErrorCode || "sem código"}</p></div>{canReprocess ? <form action={reprocessWebhookAction}><input type="hidden" name="organizationId" value={organization.id} /><input type="hidden" name="eventId" value={event.id} /><Button type="submit" variant="outline">Reprocessar evento</Button></form> : null}</div>)}</CardContent></Card> : null}
          </>}
        </TabsContent>

        <TabsContent value="entitlements">{!entitlements ? <PermissionNotice>Permissão necessária: <code>platform.entitlements.read</code>.</PermissionNotice> : <Card><CardHeader><CardTitle>Recursos liberados</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2">{entitlements.map((item) => <div key={item.featureKey} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><strong>{item.featureKey}</strong><Badge variant={item.enabled ? "secondary" : "outline"}>{item.enabled ? "Liberado" : "Bloqueado"}</Badge></div><p className="mt-2 text-muted-foreground">Origem: {entitlementSource(item.source)} · limite: {item.limit ?? "sem limite"} · válido até: {date(item.validUntil)}</p></div>)}</div></CardContent></Card>}</TabsContent>

        <TabsContent value="members">{!members ? <PermissionNotice>Permissão necessária: <code>platform.users.read</code>.</PermissionNotice> : <Card><CardHeader><CardTitle>Pessoas com acesso</CardTitle></CardHeader><CardContent className="space-y-2">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><strong>{member.user.name || member.user.email}</strong><p className="text-muted-foreground">{member.user.email} · {member.profile?.name || "Sem perfil"}</p></div><div className="flex gap-2"><Badge variant="outline">{memberRole(member.role)}</Badge><Badge variant={member.active ? "secondary" : "destructive"}>{member.active ? "Ativo" : "Suspenso"}</Badge></div></div>)}</CardContent></Card>}</TabsContent>

        <TabsContent value="security" className="space-y-4">{!security || !members ? <PermissionNotice>Permissões de leitura de segurança e pessoas são necessárias.</PermissionNotice> : <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><UsersRound /><CardDescription>Pessoas ativas com 2FA</CardDescription><CardTitle>{twoFactorMembers} de {activeMembers}</CardTitle></CardHeader></Card><Card><CardHeader><KeyRound /><CardDescription>Chaves de API ativas</CardDescription><CardTitle>{security.activeApiTokens}</CardTitle></CardHeader></Card><Card><CardHeader><AlertCircle /><CardDescription>Alertas de segurança altos ou críticos</CardDescription><CardTitle>{security.elevatedSecurityEvents}</CardTitle></CardHeader></Card></div>}</TabsContent>

        <TabsContent value="audit">{!audit ? <PermissionNotice>Permissão necessária: <code>platform.audit.read</code>.</PermissionNotice> : <Card><CardHeader><CardTitle>Últimos 50 eventos</CardTitle></CardHeader><CardContent className="space-y-2">{audit.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p> : audit.map((event) => <div key={event.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{event.action}</strong><Badge variant="outline">{event.result}</Badge></div><p className="mt-1 text-muted-foreground">{date(event.createdAt)} · {event.user?.email || "sistema"} · risco {event.riskLevel}</p>{event.reason ? <p className="mt-2">Motivo: {event.reason}</p> : null}</div>)}</CardContent></Card>}</TabsContent>

        <TabsContent value="support"><Alert><ShieldCheck /><AlertTitle>Conteúdo do cliente protegido</AlertTitle><AlertDescription>A gestão exibe metadados administrativos, não tabelas, documentos, receitas ou projetos.</AlertDescription></Alert></TabsContent>
      </Tabs>
    </>
  );
}
