import { AlertCircle, CheckCircle2, TicketPercent } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";
import { listCommercialBenefits } from "@/features/commercial-catalog/services/commercial-benefits-management";

import { activateCouponAction, createCouponAction } from "../actions";

function localInput(date: Date) { return date.toISOString().slice(0, 16); }

function displayDiscount(coupon: { discountType: string; discountValue: number; currency: string | null }) {
  return coupon.discountType === "PERCENT"
    ? `${(coupon.discountValue / 100).toLocaleString("pt-BR")}%`
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: coupon.currency ?? "BRL" }).format(coupon.discountValue / 100);
}

const statusLabel = { DRAFT: "Rascunho", ACTIVE: "Ativo", INACTIVE: "Inativo", ARCHIVED: "Arquivado" } as const;

export default async function CouponsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [access, data, feedback] = await Promise.all([
    requirePlatformPagePermission({ permission: PLATFORM_PERMISSIONS.CATALOG_READ, action: "platform.commercial.coupons.viewed", targetId: "/admin/commercial/coupons" }),
    listCommercialBenefits(), searchParams,
  ]);
  const canManage = access.permissionKeys.includes(PLATFORM_PERMISSIONS.CATALOG_MANAGE);
  const canActivate = access.permissionKeys.includes(PLATFORM_PERMISSIONS.CATALOG_PUBLISH);
  const error = typeof feedback.error === "string" ? feedback.error : null;
  const success = typeof feedback.success === "string" ? feedback.success : null;
  const now = new Date();

  return <>
    <PageHeader title="Cupons comerciais" actions={<Badge variant="outline">{data.coupons.length} cadastrados</Badge>} />
    {error ? <Alert variant="destructive"><AlertCircle /><AlertTitle>Operação não concluída</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    {success ? <Alert><CheckCircle2 /><AlertTitle>Operação concluída</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}

    {canManage ? <Card>
      <CardHeader><CardTitle>Criar cupom</CardTitle></CardHeader>
      <CardContent><form action={createCouponAction} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2"><Label htmlFor="coupon-code">Código exibido no checkout</Label><Input id="coupon-code" name="code" required minLength={3} maxLength={40} pattern="[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*" placeholder="PILOTO-2026" /></div>
          <div className="space-y-2"><Label htmlFor="coupon-name">Nome interno</Label><Input id="coupon-name" name="name" required minLength={3} maxLength={120} /></div>
          <div className="space-y-2"><Label htmlFor="coupon-type">Tipo de desconto</Label><select id="coupon-type" name="discountType" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="PERCENT">Percentual (%)</option><option value="FIXED">Valor fixo (R$)</option></select></div>
          <div className="space-y-2"><Label htmlFor="coupon-value">Desconto</Label><Input id="coupon-value" name="discountValue" required inputMode="decimal" placeholder="15,00" /></div>
          <div className="space-y-2"><Label htmlFor="coupon-start">Válido a partir de</Label><Input id="coupon-start" name="startsAt" type="datetime-local" required defaultValue={localInput(now)} /></div>
          <div className="space-y-2"><Label htmlFor="coupon-end">Válido até</Label><Input id="coupon-end" name="endsAt" type="datetime-local" required defaultValue={localInput(new Date(now.getTime() + 30 * 86_400_000))} /></div>
          <div className="space-y-2"><Label htmlFor="coupon-max">Usos totais máximos</Label><Input id="coupon-max" name="maxRedemptions" type="number" min={1} placeholder="Sem limite" /></div>
          <div className="space-y-2"><Label htmlFor="coupon-max-org">Usos por organização</Label><Input id="coupon-max-org" name="maxRedemptionsPerOrganization" type="number" min={1} required defaultValue={1} /></div>
        </div>
        <fieldset className="space-y-2">
          <legend className="font-medium">Planos elegíveis · selecione um ou mais</legend>
          {data.plans.length ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{data.plans.map((plan) => <label key={plan.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" name="planId" value={plan.id} className="size-4 accent-primary" /><span>{plan.name} <span className="text-muted-foreground">({plan.code})</span></span></label>)}</div> : <p className="text-sm text-muted-foreground">Nenhum plano ativo e publicado.</p>}
        </fieldset>
        <Alert><TicketPercent /><AlertTitle>Será salvo como rascunho</AlertTitle><AlertDescription>O código só poderá ser usado após ativação.</AlertDescription></Alert>
        <Button type="submit" disabled={!data.plans.length}>Salvar rascunho</Button>
      </form></CardContent>
    </Card> : null}

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Cupons cadastrados</h2>
      {data.coupons.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum cupom cadastrado.</CardContent></Card> : <div className="grid gap-4 xl:grid-cols-2">{data.coupons.map((coupon) => <Card key={coupon.id}>
        <CardHeader><div className="flex flex-wrap items-start justify-between gap-2"><div><CardTitle>{coupon.codeNormalized}</CardTitle><CardDescription>{coupon.name}</CardDescription></div><Badge variant={coupon.status === "ACTIVE" ? "secondary" : "outline"}>{statusLabel[coupon.status]}</Badge></div></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-xl font-semibold">{displayDiscount(coupon)}</p>
          <p><span className="text-muted-foreground">Validade:</span> {coupon.startsAt.toLocaleString("pt-BR")} até {coupon.endsAt.toLocaleString("pt-BR")}</p>
          <p><span className="text-muted-foreground">Resgates:</span> {coupon._count.redemptions} de {coupon.maxRedemptions ?? "ilimitados"} · máximo de {coupon.maxRedemptionsPerOrganization} por organização</p>
          <p><span className="text-muted-foreground">Planos:</span> {coupon.plans.map((item) => item.plan.name).join(", ")}</p>
          {coupon.status === "DRAFT" && canActivate ? <form action={activateCouponAction} className="space-y-2 rounded-md bg-muted/50 p-3"><input type="hidden" name="couponId" value={coupon.id} /><label className="flex items-start gap-2"><input type="checkbox" required className="mt-1 size-4 accent-primary" /><span>Confirmo ativar este código nas datas e planos exibidos.</span></label><Button type="submit" variant="secondary">Ativar cupom</Button></form> : null}
        </CardContent>
      </Card>)}</div>}
    </section>
  </>;
}
