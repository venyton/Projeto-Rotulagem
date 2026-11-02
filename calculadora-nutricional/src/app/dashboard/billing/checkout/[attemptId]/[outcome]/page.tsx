import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Clock3 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { canManageOrganizationBilling } from "@/features/billing/domain/billing-authorization";
import { checkoutReturnCopy } from "@/features/billing/domain/checkout";
import { verifyCheckoutReturn } from "@/features/billing/services/checkout";
import { getCurrentSaaSContext } from "@/features/saas/services/entitlements";

export default async function CheckoutReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string; outcome: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const context = await getCurrentSaaSContext();
  if (!context) redirect("/login");
  if (!canManageOrganizationBilling(context.member.role)) redirect("/dashboard");
  const [{ attemptId, outcome }, query] = await Promise.all([params, searchParams]);
  const validOutcome = outcome === "success" || outcome === "cancel" || outcome === "expired" ? outcome : null;
  const validState = validOutcome ? await verifyCheckoutReturn({
    organizationId: context.organization.id,
    attemptId,
    state: query.state ?? "",
  }) : false;

  if (!validOutcome || !validState) {
    return (
      <div className="app-page flex flex-col gap-6">
        <PageHeader title="Retorno de checkout" />
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Retorno inválido</AlertTitle>
          <AlertDescription>O estado informado não corresponde a uma tentativa deste workspace. Nenhuma alteração financeira foi feita.</AlertDescription>
        </Alert>
        <Button asChild variant="outline"><Link href="/dashboard/billing">Voltar ao faturamento</Link></Button>
      </div>
    );
  }

  const copy = checkoutReturnCopy(validOutcome);
  return (
    <div className="app-page flex flex-col gap-6">
      <PageHeader title="Retorno de checkout" description="Esta página informa a navegação; o provider continua sendo a fonte do estado financeiro." />
      <Card>
        <CardHeader>
          <Clock3 aria-hidden="true" />
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Confirmação assíncrona</AlertTitle>
            <AlertDescription>Não feche decisões de acesso com base nesta URL. Webhooks idempotentes e reconciliação atualizarão assinatura e cobranças.</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter><Button asChild><Link href="/dashboard/billing">Acompanhar faturamento</Link></Button></CardFooter>
      </Card>
    </div>
  );
}
