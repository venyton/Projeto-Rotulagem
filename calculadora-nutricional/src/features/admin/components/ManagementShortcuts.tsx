import Link from "next/link";
import {
  BadgeDollarSign,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileClock,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Tags,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  PLATFORM_PERMISSIONS,
  type PlatformPermissionKey,
} from "@/features/platform-iam/domain/platform-authorization";
import type {
  AdminNavigationKey,
  AdminNavigationOverride,
} from "@/features/configuration/domain/admin-navigation";

export type ManagementShortcut = {
  href: string;
  label: string;
  navigationKey: AdminNavigationKey;
  permission: PlatformPermissionKey;
  icon: LucideIcon;
};

const SHORTCUTS: ManagementShortcut[] = [
  { href: "/admin/organizations", label: "Organizações", navigationKey: "organizations", permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_READ, icon: Building2 },
  { href: "/admin/billing", label: "Cobranças e assinaturas", navigationKey: "billing", permission: PLATFORM_PERMISSIONS.BILLING_READ, icon: ReceiptText },
  { href: "/admin/catalog", label: "Pacotes e acessos", navigationKey: "catalog", permission: PLATFORM_PERMISSIONS.CATALOG_READ, icon: BadgeDollarSign },
  { href: "/admin/commercial/coupons", label: "Cupons", navigationKey: "coupons", permission: PLATFORM_PERMISSIONS.CATALOG_READ, icon: Tags },
  { href: "/admin/commercial/grants", label: "Grants e limites", navigationKey: "grants", permission: PLATFORM_PERMISSIONS.ENTITLEMENTS_READ, icon: CircleDollarSign },
  { href: "/admin/metrics", label: "Métricas e consumo", navigationKey: "metrics", permission: PLATFORM_PERMISSIONS.OPERATIONS_READ, icon: ChartNoAxesCombined },
  { href: "/admin/audit", label: "Auditoria", navigationKey: "audit", permission: PLATFORM_PERMISSIONS.AUDIT_READ, icon: FileClock },
  { href: "/admin/security/privileged-sessions", label: "Sessões privilegiadas", navigationKey: "privileged-sessions", permission: PLATFORM_PERMISSIONS.ACCESS, icon: ShieldCheck },
  { href: "/admin/security/operators", label: "Operadores", navigationKey: "operators", permission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_READ, icon: UsersRound },
  { href: "/admin/settings", label: "Configurações", navigationKey: "settings", permission: PLATFORM_PERMISSIONS.CONFIGURATION_READ, icon: Settings2 },
];

export function getVisibleManagementShortcuts(
  permissions: PlatformPermissionKey[],
  navigationOverrides: AdminNavigationOverride[],
) {
  const permissionSet = new Set(permissions);
  const overrideMap = new Map(navigationOverrides.map((override) => [override.key, override]));

  return SHORTCUTS
    .map((item, index) => ({ item, index, override: overrideMap.get(item.navigationKey) }))
    .filter(({ item, override }) => permissionSet.has(item.permission) && override?.enabled !== false)
    .sort((left, right) => (left.override?.order ?? left.index) - (right.override?.order ?? right.index))
    .map(({ item, override }) => ({
      ...item,
      label: override?.label?.trim() || item.label,
    }));
}

export function ManagementShortcuts({
  permissions,
  navigationOverrides,
}: {
  permissions: PlatformPermissionKey[];
  navigationOverrides: AdminNavigationOverride[];
}) {
  const shortcuts = getVisibleManagementShortcuts(permissions, navigationOverrides);

  return (
    <section aria-labelledby="management-shortcuts-title">
      <Card aria-labelledby="management-shortcuts-title">
        <h2 id="management-shortcuts-title" className="px-6 pt-6 text-base font-semibold">Áreas de gestão</h2>
        <CardContent>
          {shortcuts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma área disponível para este perfil.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Button key={item.href} asChild variant="outline" className="w-full justify-start">
                    <Link href={item.href}>
                      <Icon data-icon="inline-start" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
