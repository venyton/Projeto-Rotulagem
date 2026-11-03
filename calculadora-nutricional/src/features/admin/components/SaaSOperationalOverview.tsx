import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  CircleAlert,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { getGlobalSaaSMetrics } from "@/features/saas/services/saas-metrics";

export type GlobalSaaSMetrics = Awaited<ReturnType<typeof getGlobalSaaSMetrics>>;

type DetailShortcut = { href: string; label: string } | null;

const number = new Intl.NumberFormat("pt-BR");
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const month = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function moneyFromMinorUnits(amountMinor: number) {
  return money.format(amountMinor / 100);
}

function alertTitle(code: string) {
  switch (code) {
    case "FAILED_WEBHOOKS": return "Webhooks com falha";
    case "STALLED_WEBHOOKS": return "Webhooks sem progresso";
    case "CHECKOUT_RECONCILIATION_REQUIRED": return "Checkouts aguardando reconciliação";
    case "PAST_DUE_SUBSCRIPTIONS": return "Assinaturas vencidas ou não pagas";
    default: return "Pendência operacional";
  }
}

function usageLabel(metricKey: string) {
  switch (metricKey) {
    case "ai_imports_monthly": return "Importações com IA";
    case "api_requests": return "Chamadas de API";
    case "exports": return "Exportações";
    default: return metricKey.replaceAll("_", " ");
  }
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <Icon aria-hidden="true" />
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}

export function SaaSOperationalOverview({
  metrics,
  detailShortcut,
}: {
  metrics: GlobalSaaSMetrics;
  detailShortcut: DetailShortcut;
}) {
  const operationalCount = metrics.operationalAlerts.reduce(
    (total, item) => total + item.count,
    0,
  );

  return (
    <>
      <section aria-labelledby="saas-summary-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="saas-summary-title" className="text-lg font-semibold">Resumo da operação</h2>
          <Badge variant="outline">{month.format(metrics.period.start)} · UTC</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Building2}
            label="Organizações ativas"
            value={number.format(metrics.activeOrganizations)}
            detail={`${number.format(metrics.totalOrganizations)} no total`}
          />
          <MetricCard
            icon={UsersRound}
            label="Assinaturas ativas"
            value={number.format(metrics.activeSubscriptions)}
            detail={`${number.format(metrics.trials)} em período de teste`}
          />
          <MetricCard
            icon={Banknote}
            label="MRR conciliado"
            value={moneyFromMinorUnits(metrics.reconciledMrrMinor)}
            detail={`ARR anualizado: ${moneyFromMinorUnits(metrics.reconciledArrMinor)}`}
          />
          <MetricCard
            icon={CircleAlert}
            label="Pendências sinalizadas"
            value={number.format(operationalCount)}
            detail={(
              <span className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span>{number.format(metrics.pastDue)} assinaturas vencidas</span>
                <span>{number.format(metrics.failedWebhooks)} webhooks falhos</span>
                <span>{number.format(metrics.stalledWebhooks)} webhooks parados</span>
                <span>{number.format(metrics.reconciliationRequired)} reconciliações</span>
              </span>
            )}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Atenção operacional</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {metrics.operationalAlerts.length === 0 ? (
                <Alert>
                  <CheckCircle2 aria-hidden="true" />
                  <AlertTitle>Nenhuma pendência operacional ativa</AlertTitle>
                </Alert>
            ) : metrics.operationalAlerts.map((item) => (
              <Alert key={item.code} variant={item.severity === "critical" ? "destructive" : "default"}>
                <CircleAlert aria-hidden="true" />
                <AlertTitle>
                  <span className="flex flex-wrap items-center gap-2">
                    {alertTitle(item.code)}
                    <Badge variant={item.severity === "critical" ? "destructive" : "warning"}>
                      {item.severity === "critical" ? "Crítica" : "Atenção"}
                    </Badge>
                    <Badge variant="outline">{number.format(item.count)}</Badge>
                  </span>
                </AlertTitle>
                <AlertDescription>
                  <span>{item.message}</span>
                  {detailShortcut ? (
                    <Button asChild variant="link" size="sm">
                      <Link href={detailShortcut.href}>
                        Ver {detailShortcut.label.toLowerCase()}
                        <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </AlertDescription>
              </Alert>
            ))}
            <p className="text-xs text-muted-foreground">
              Nos últimos 30 dias: {number.format(metrics.incidents)} eventos de risco alto ou crítico e {number.format(metrics.canceledRecently)} cancelamentos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Activity aria-hidden="true" />
            <CardTitle>Consumo por recurso</CardTitle>
            <CardDescription>{month.format(metrics.period.start)} · UTC</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.usage.length === 0 ? (
              <Empty className="px-3 py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Activity aria-hidden="true" /></EmptyMedia>
                  <EmptyTitle>Sem consumo registrado</EmptyTitle>
                  <EmptyDescription>Nenhum recurso medido neste período.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-3">
                {metrics.usage.slice(0, 5).map((item) => (
                  <li key={item.metricKey} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                    <span className="min-w-0 capitalize">{usageLabel(item.metricKey)}</span>
                    <Badge variant="secondary">{number.format(item.quantity)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

    </>
  );
}
