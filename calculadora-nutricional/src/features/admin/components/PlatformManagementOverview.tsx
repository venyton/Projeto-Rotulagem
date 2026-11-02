import Link from "next/link";
import { Building2, ChartNoAxesCombined, KeyRound, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import type {
  PlatformAccessSource,
  PlatformPermissionKey,
} from "@/features/platform-iam/domain/platform-authorization";
import type { AdminNavigationOverride } from "@/features/configuration/domain/admin-navigation";
import {
  getVisibleManagementShortcuts,
  ManagementShortcuts,
} from "@/features/admin/components/ManagementShortcuts";
import {
  SaaSOperationalOverview,
  type GlobalSaaSMetrics,
} from "@/features/admin/components/SaaSOperationalOverview";

type OverviewProps = {
  accessSource: PlatformAccessSource | null;
  metrics: GlobalSaaSMetrics | null;
  navigationOverrides: AdminNavigationOverride[];
  permissions: PlatformPermissionKey[];
  updatedAt: Date | null;
};

export function PlatformManagementOverview({
  accessSource,
  metrics,
  navigationOverrides,
  permissions,
  updatedAt,
}: OverviewProps) {
  const shortcuts = getVisibleManagementShortcuts(permissions, navigationOverrides);
  const organizationsShortcut = shortcuts.find((item) => item.navigationKey === "organizations");
  const metricsShortcut = shortcuts.find((item) => item.navigationKey === "metrics");
  const detailShortcut = shortcuts.find((item) => item.navigationKey === "billing")
    ?? metricsShortcut
    ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestão SaaS"
        actions={<div className="flex flex-wrap items-center gap-2">
          {organizationsShortcut ? (
            <Button asChild>
              <Link href={organizationsShortcut.href}>
                <Building2 data-icon="inline-start" aria-hidden="true" />
                Ver organizações
              </Link>
            </Button>
          ) : null}
          {metrics && metricsShortcut ? (
            <Button asChild variant="outline">
              <Link href={metricsShortcut.href}>
                <ChartNoAxesCombined data-icon="inline-start" aria-hidden="true" />
                Métricas completas
              </Link>
            </Button>
          ) : null}
          {updatedAt ? <Badge variant="outline">Atualizado às {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(updatedAt)}</Badge> : null}
        </div>}
      />

      {accessSource === "BREAK_GLASS" ? (
        <Alert variant="destructive">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>Acesso emergencial em uso</AlertTitle>
          <AlertDescription>
            Sessão com 2FA e auditoria. Uso limitado a recuperação da plataforma.
          </AlertDescription>
        </Alert>
      ) : null}

      {metrics ? (
        <SaaSOperationalOverview metrics={metrics} detailShortcut={detailShortcut} />
      ) : (
        <Alert>
          <KeyRound aria-hidden="true" />
          <AlertTitle>Indicadores operacionais restritos</AlertTitle>
          <AlertDescription>
            Este perfil não tem permissão para consultar métricas globais.
          </AlertDescription>
        </Alert>
      )}

      <ManagementShortcuts
        permissions={permissions}
        navigationOverrides={navigationOverrides}
      />
    </div>
  );
}
