import { notFound, redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, CreditCard, ReceiptText, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { canManageOrganizationBilling } from "@/features/billing/domain/billing-authorization";
import { cancelCheckoutAction, startRecurringCheckoutAction } from "@/features/billing/actions/checkout-actions";
import { BillingSubmitButton } from "@/features/billing/components/BillingSubmitButton";
import { getOrganizationBillingOverview } from "@/features/billing/services/checkout";
import { getAsaasProviderDiagnostic } from "@/features/billing/services/provider-diagnostic";
import { getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { isRolloutFeatureEnabled } from "@/features/rollout/services/feature-flags";

const intervalLabels = {
  MONTHLY: "mensal",
  QUARTERLY: "trimestral",
  SEMIANNUAL: "semestral",
  YEARLY: "anual",
} as const;

const errorMessages: Record<string, string> = {
  invalid_price: "A oferta selecionada não está mais disponível. Atualize a página e escolha outra.",
  invalid_coupon: "O cupom não existe, expirou, não se aplica ao plano ou atingiu o limite de uso.",
  customer_required: "Informe os dados de faturamento para criar o customer no ambiente de pagamento.",
  in_progress: "Já existe uma tentativa sendo preparada. Aguarde alguns instantes antes de tentar novamente.",
  reconciliation: "O resultado da tentativa anterior é incerto e precisa de reconciliação antes de um novo checkout.",
  not_found: "A tentativa informada não pertence a este workspace ou não existe.",
  not_cancelable: "Este checkout não pode mais ser cancelado por essa ação.",
  configuration: "A origem pública da aplicação ainda não está configurada.",
  provider: "O ambiente de pagamento não respondeu de forma segura. Nenhuma confirmação financeira foi assumida.",
  persistence: "Não foi possível registrar a tentativa com segurança.",
  rate_limit: "Muitas tentativas em pouco tempo. Aguarde antes de tentar novamente.",
};

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amountMinor / 100);
}

function dateTime(value: Date | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value) : "—";
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; canceled?: string }>;
}) {
  if (!await isRolloutFeatureEnabled(ROLLOUT_FLAGS.CUSTOMER_PLAN_UI)) notFound();
  const context = await getCurrentSaaSContext();
  if (!context) redirect("/login");
  if (!canManageOrganizationBilling(context.member.role)) redirect("/dashboard");
  const params = await searchParams;
  const [overview, diagnostic, checkoutRolloutEnabled] = await Promise.all([
    getOrganizationBillingOverview(context.organization.id),
    getAsaasProviderDiagnostic(),
    isRolloutFeatureEnabled(ROLLOUT_FLAGS.BILLING_CHECKOUT),
  ]);
  const customerMapped = overview.mapping?.status === "ACTIVE";
  const checkoutEnabled = diagnostic.configured
    && checkoutRolloutEnabled
    && overview.offers.length > 0;

  return (
    <div className="app-page flex flex-col gap-6">
      <PageHeader
        title="Faturamento"
        description="Consulte o contrato do workspace e inicie uma contratação em uma página hospedada pelo Asaas."
      />

      {!diagnostic.configured ? (
        <Alert>
          <Clock3 aria-hidden="true" />
          <AlertTitle>{diagnostic.errorCode === "ROLLOUT_DISABLED"
            ? "Faturamento temporariamente indisponível"
            : diagnostic.environment === "sandbox" ? "Sandbox aguardando credencial" : "Integração Asaas indisponível"}</AlertTitle>
          <AlertDescription>
            {diagnostic.errorCode === "ROLLOUT_DISABLED"
              ? "A equipe ainda não habilitou a integração de billing para este ambiente."
              : diagnostic.environment === "sandbox"
                ? "Nenhum checkout externo será criado até a chave Sandbox ser configurada e habilitada. Produção permanece protegida por um gate separado."
                : "A configuração de Produção está incompleta ou bloqueada pelas proteções do ambiente."}
          </AlertDescription>
        </Alert>
      ) : null}
      {params?.error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Checkout não iniciado</AlertTitle>
          <AlertDescription>{errorMessages[params.error] ?? "Não foi possível iniciar a contratação com segurança."}</AlertDescription>
        </Alert>
      ) : null}
      {params?.canceled ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Cancelamento solicitado</AlertTitle>
          <AlertDescription>O checkout foi cancelado no provider. Isso não altera cobranças já confirmadas.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Iniciar contratação</CardTitle>
            <CardDescription>O preço e a versão do plano são relidos no servidor antes da criação.</CardDescription>
            <CardAction><Badge variant="secondary">Cartão hospedado</Badge></CardAction>
          </CardHeader>
          <CardContent>
            {overview.offers.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><ReceiptText aria-hidden="true" /></EmptyMedia>
                  <EmptyTitle>Nenhuma oferta publicada</EmptyTitle>
                  <EmptyDescription>Um operador precisa publicar plano e preço antes de liberar contratação.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <form action={startRecurringCheckoutAction}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="billing-price">Oferta</FieldLabel>
                    <NativeSelect id="billing-price" name="billingPriceId" required defaultValue="">
                      <NativeSelectOption value="" disabled>Selecione plano e período</NativeSelectOption>
                      {overview.offers.map((offer) => (
                        <NativeSelectOption key={offer.id} value={offer.id}>
                          {offer.planVersion.plan.name} v{offer.planVersion.versionNumber} — {money(offer.amountMinor, offer.currency)} / {intervalLabels[offer.billingInterval]}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldDescription>O checkout expira em 30 minutos. Uma nova versão não altera contratos já confirmados.</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="billing-coupon">Cupom (opcional)</FieldLabel>
                    <Input id="billing-coupon" name="couponCode" autoComplete="off" minLength={3} maxLength={40} placeholder="PILOTO-2026" />
                    <FieldDescription>O código é validado novamente no servidor e o valor final fica registrado como snapshot do checkout.</FieldDescription>
                  </Field>

                  {!customerMapped ? (
                    <FieldGroup className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="billing-document">CPF ou CNPJ</FieldLabel>
                        <Input id="billing-document" name="cpfCnpj" inputMode="numeric" autoComplete="off" required />
                        <FieldDescription>Enviado diretamente ao Asaas; o documento completo não é persistido no mapping local.</FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="billing-email">Email de faturamento</FieldLabel>
                        <Input id="billing-email" name="email" type="email" defaultValue={context.user.email} required />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="billing-phone">Telefone</FieldLabel>
                        <Input id="billing-phone" name="mobilePhone" inputMode="tel" autoComplete="tel" />
                        <FieldDescription>Opcional. Informe DDD e número.</FieldDescription>
                      </Field>
                    </FieldGroup>
                  ) : (
                    <Alert>
                      <ShieldCheck aria-hidden="true" />
                      <AlertTitle>Customer de cobrança vinculado</AlertTitle>
                      <AlertDescription>O checkout reutilizará o identificador remoto já reconciliado, sem solicitar o documento novamente.</AlertDescription>
                    </Alert>
                  )}

                  <Alert>
                    <CreditCard aria-hidden="true" />
                    <AlertTitle>Pagamento fora da SoIZI</AlertTitle>
                    <AlertDescription>A SoIZI não recebe número do cartão nem CVV. Voltar pela página de sucesso não ativa o plano; a confirmação virá por webhook ou reconciliação.</AlertDescription>
                  </Alert>
                  <BillingSubmitButton disabled={!checkoutEnabled} />
                  {!checkoutEnabled ? <p className="text-sm text-muted-foreground">A ação será habilitada quando a flag de checkout, o Sandbox e uma oferta publicada estiverem disponíveis.</p> : null}
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contrato atual</CardTitle>
            <CardDescription>Somente estados reconciliados concedem entitlements.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {overview.subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma assinatura registrada para este workspace.</p>
            ) : overview.subscriptions.map((subscription) => (
              <div key={subscription.id} className="flex flex-col gap-1 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{subscription.planVersion?.plan.name ?? "Plano histórico"}</span>
                  <Badge variant="secondary">{subscription.status}</Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {subscription.billingPrice ? `${money(subscription.couponRedemption && !subscription.couponRedemption.revokedAt ? subscription.couponRedemption.finalAmountMinor : subscription.billingPrice.amountMinor, subscription.billingPrice.currency)} / ${intervalLabels[subscription.billingPrice.billingInterval]}` : "Preço histórico"}
                </span>
                {subscription.couponRedemption && !subscription.couponRedemption.revokedAt ? <span className="text-xs text-muted-foreground">Cupom {subscription.couponRedemption.coupon.codeNormalized}: −{money(subscription.couponRedemption.appliedDiscountMinor, subscription.couponRedemption.currency)}</span> : null}
                <span className="text-xs text-muted-foreground">Período até {dateTime(subscription.currentPeriodEnd)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tentativas recentes</CardTitle>
          <CardDescription>O histórico separa link criado de pagamento confirmado.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {overview.checkouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tentativa de checkout registrada.</p>
          ) : overview.checkouts.map((attempt) => (
            <div key={attempt.id} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Tentativa de {dateTime(attempt.createdAt)}</span>
                <Badge variant="secondary">{attempt.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Expira em {dateTime(attempt.expiresAt)}.</p>
              {attempt.status === "ACTIVE" && attempt.checkoutUrl && diagnostic.configured ? (
                <form action={cancelCheckoutAction}>
                  <input type="hidden" name="attemptId" value={attempt.id} />
                  <Button type="submit" variant="outline">Cancelar checkout</Button>
                </form>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cobranças</CardTitle>
          <CardDescription>Valores e estados serão preenchidos por eventos e reconciliação autoritativa.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.charges.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><ReceiptText aria-hidden="true" /></EmptyMedia>
                <EmptyTitle>Nenhuma cobrança reconciliada</EmptyTitle>
                <EmptyDescription>O retorno do checkout não cria uma cobrança confirmada por conta própria.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : overview.charges.map((charge) => (
            <div key={charge.id} className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
              <div><p className="font-medium">{money(charge.amountMinor, charge.currency)}</p><p className="text-sm text-muted-foreground">Vencimento {dateTime(charge.dueDate)}</p></div>
              <Badge variant="secondary">{charge.status}</Badge>
            </div>
          ))}
        </CardContent>
        <CardFooter className="border-t text-sm text-muted-foreground">IDs do provider e dados de cartão não são exibidos.</CardFooter>
      </Card>
    </div>
  );
}
