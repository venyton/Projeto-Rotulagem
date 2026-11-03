import { AlertCircle, CheckCircle2, Gift, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { listCommercialBenefits } from "@/features/commercial-catalog/services/commercial-benefits-management";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";

import { createGrantAction, createOverrideAction, revokeGrantAction } from "../actions";

function localInput(date: Date) { return date.toISOString().slice(0, 16); }
function date(value: Date | null) { return value ? value.toLocaleString("pt-BR") : "Sem expiração"; }

const sourceLabel = { COURTESY: "Cortesia", PARTNER: "Parceiro", SUPPORT: "Suporte", MIGRATION: "Migração", OTHER: "Outro" } as const;
const modeLabel = { ENABLE: "Forçar habilitado", DISABLE: "Forçar desabilitado", SET_LIMIT: "Definir limite" } as const;
const featureTypeLabel = { BOOLEAN: "Sim ou não", QUOTA: "Limite contratado", METERED: "Uso medido", SEAT_LIMIT: "Vagas" } as const;
const organizationState = { ACTIVE: "Ativa", SUSPENDED: "Suspensa", ARCHIVED: "Arquivada" } as const;

export default async function GrantsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await requirePlatformPagePermission({ permission: PLATFORM_PERMISSIONS.ENTITLEMENTS_READ, action: "platform.commercial.grants.viewed", targetId: "/admin/commercial/grants" });
  const [data, feedback] = await Promise.all([
    listCommercialBenefits(), searchParams,
  ]);
  const canOverride = access.permissionKeys.includes(PLATFORM_PERMISSIONS.ENTITLEMENTS_OVERRIDE);
  const error = typeof feedback.error === "string" ? feedback.error : null;
  const success = typeof feedback.success === "string" ? feedback.success : null;
  const now = new Date();

  return <>
    <PageHeader title="Benefícios e exceções" actions={<Badge variant="outline">{data.grants.length} concessões</Badge>} />
    {error ? <Alert variant="destructive"><AlertCircle /><AlertTitle>Operação não concluída</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    {success ? <Alert><CheckCircle2 /><AlertTitle>Operação concluída</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}

    {canOverride ? <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Conceder recursos</CardTitle></CardHeader>
        <CardContent><form action={createGrantAction} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="grant-org">Organização</Label><select id="grant-org" name="organizationId" required defaultValue="" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="" disabled>Selecione uma organização</option>{data.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} · {organizationState[organization.status]}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="grant-source">Motivo da concessão</Label><select id="grant-source" name="sourceType" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="COURTESY">Cortesia</option><option value="PARTNER">Parceria</option><option value="SUPPORT">Compensação de suporte</option><option value="MIGRATION">Migração</option><option value="OTHER">Outro</option></select></div>
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="grant-start">Começa em</Label><Input id="grant-start" name="startsAt" type="datetime-local" required defaultValue={localInput(now)} /></div><div className="space-y-2"><Label htmlFor="grant-end">Expira em</Label><Input id="grant-end" name="expiresAt" type="datetime-local" /></div></div>
          <label className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm"><input type="checkbox" name="confirmPermanent" value="yes" className="mt-1 size-4 accent-primary" /><span>Sem data de expiração: manter a concessão permanentemente.</span></label>
          <div className="space-y-2"><Label htmlFor="grant-reason">Justificativa registrada</Label><Textarea id="grant-reason" name="reason" required minLength={12} maxLength={500} /></div>
          <fieldset className="space-y-2"><legend className="font-medium">Recursos · selecione um ou mais</legend><div className="max-h-72 space-y-2 overflow-y-auto pr-1">{data.features.map((feature) => <div key={feature.id} className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3 rounded-lg border p-3"><label className="flex items-start gap-2 text-sm"><input type="checkbox" name="featureDefinitionId" value={feature.id} className="mt-1 size-4 accent-primary" /><span><strong>{feature.name}</strong><span className="block text-muted-foreground">{featureTypeLabel[feature.type]}{feature.unit ? ` · ${feature.unit}` : ""}</span></span></label>{feature.type === "BOOLEAN" ? null : <Input name={`limit:${feature.id}`} type="number" min={0} aria-label={`Limite de ${feature.name}`} placeholder="Limite" />}</div>)}</div></fieldset>
          <Alert><Gift /><AlertTitle>Não altera a cobrança</AlertTitle><AlertDescription>Os recursos são liberados durante o período da concessão.</AlertDescription></Alert>
          <Button type="submit" disabled={!data.organizations.length}>Conceder recursos</Button>
        </form></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Forçar recurso para uma organização</CardTitle></CardHeader>
        <CardContent><form action={createOverrideAction} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="override-org">Organização</Label><select id="override-org" name="organizationId" required defaultValue="" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="" disabled>Selecione uma organização</option>{data.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="override-feature">Recurso</Label><select id="override-feature" name="featureDefinitionId" required defaultValue="" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="" disabled>Selecione um recurso</option>{data.features.map((feature) => <option key={feature.id} value={feature.id}>{feature.name} · {featureTypeLabel[feature.type]}</option>)}</select></div>
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="override-mode">Resultado</Label><select id="override-mode" name="mode" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="ENABLE">Habilitar</option><option value="DISABLE">Desabilitar</option><option value="SET_LIMIT">Definir limite</option></select></div><div className="space-y-2"><Label htmlFor="override-limit">Limite (somente para “Definir limite”)</Label><Input id="override-limit" name="limitValue" type="number" min={0} /></div></div>
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="override-start">Começa em</Label><Input id="override-start" name="startsAt" type="datetime-local" required defaultValue={localInput(now)} /></div><div className="space-y-2"><Label htmlFor="override-end">Expira em</Label><Input id="override-end" name="expiresAt" type="datetime-local" /></div></div>
          <label className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm"><input type="checkbox" name="confirmPermanent" value="yes" className="mt-1 size-4 accent-primary" /><span>Sem data de expiração: manter esta exceção permanentemente.</span></label>
          <div className="space-y-2"><Label htmlFor="override-reason">Justificativa registrada</Label><Textarea id="override-reason" name="reason" required minLength={12} maxLength={500} /></div>
          <Alert variant="destructive"><ShieldAlert /><AlertTitle>Esta exceção prevalece sobre plano e concessão.</AlertTitle></Alert>
          <Button type="submit" variant="destructive" disabled={!data.organizations.length || !data.features.length}>Aplicar exceção</Button>
        </form></CardContent>
      </Card>
    </div> : <Alert><ShieldAlert /><AlertTitle>Seu perfil permite consultar, mas não conceder recursos nem aplicar exceções.</AlertTitle></Alert>}

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Concessões registradas</h2>
      {data.grants.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma concessão registrada.</CardContent></Card> : <div className="grid gap-4 xl:grid-cols-2">{data.grants.map((grant) => {
        const permanent = grant.expiresAt === null;
        const active = !grant.revokedAt && grant.startsAt <= now && (!grant.expiresAt || grant.expiresAt > now);
        return <Card key={grant.id} className={permanent && !grant.revokedAt ? "border-destructive/50" : undefined}>
          <CardHeader><div className="flex flex-wrap items-start justify-between gap-2"><div><CardTitle>{grant.organization.name}</CardTitle><CardDescription>{sourceLabel[grant.sourceType]} · {grant.createdByUser.email}</CardDescription></div><div className="flex gap-2">{permanent ? <Badge variant="destructive">Permanente</Badge> : null}<Badge variant={active ? "secondary" : "outline"}>{grant.revokedAt ? "Revogada" : active ? "Ativa" : "Inativa"}</Badge></div></div></CardHeader>
          <CardContent className="space-y-3 text-sm"><p>{grant.reason}</p><p className="text-muted-foreground">{grant.startsAt.toLocaleString("pt-BR")} → {date(grant.expiresAt)}</p><div className="flex flex-wrap gap-2">{grant.features.map((feature) => <Badge key={feature.featureDefinition.key} variant="outline">{feature.featureDefinition.name}{feature.limitValue !== null ? `: ${feature.limitValue}` : ""}</Badge>)}</div>
            {active && canOverride ? <form action={revokeGrantAction} className="flex flex-col gap-2 rounded-md bg-muted/50 p-3"><input type="hidden" name="grantId" value={grant.id} /><Label htmlFor={`grant-revoke-${grant.id}`}>Motivo para revogar</Label><Input id={`grant-revoke-${grant.id}`} name="reason" required minLength={12} maxLength={500} /><Button type="submit" variant="outline">Revogar concessão</Button></form> : null}
          </CardContent>
        </Card>;
      })}</div>}
    </section>

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Exceções aplicadas</h2>
      {data.overrides.length === 0 ? <Card><CardContent className="py-8 text-sm text-muted-foreground">Nenhuma exceção registrada.</CardContent></Card> : <div className="grid gap-3 md:grid-cols-2">{data.overrides.map((override) => <Card key={override.id}><CardHeader><div className="flex items-start justify-between gap-2"><div><CardTitle className="text-base">{override.organization.name}</CardTitle><CardDescription>{override.featureDefinition.name}</CardDescription></div><Badge variant="destructive">{modeLabel[override.mode]}</Badge></div></CardHeader><CardContent className="space-y-2 text-sm"><p>{override.reason}</p><p className="text-muted-foreground">Limite: {override.limitValue ?? "Não se aplica"} · expira: {date(override.expiresAt)}</p></CardContent></Card>)}</div>}
    </section>
  </>;
}
