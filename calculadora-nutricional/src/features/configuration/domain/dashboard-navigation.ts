import { SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";

export type DashboardNavigationKey = "home" | "tables" | "ingredients" | "enterprise";

export type DashboardNavigationOverride = {
  key: DashboardNavigationKey;
  enabled: boolean;
  label?: string;
  order?: number;
};

export const DASHBOARD_NAVIGATION_CONTRACT: Record<DashboardNavigationKey, {
  href: string;
  moduleKey?: SaaSModuleKey;
}> = {
  home: { href: "/dashboard" },
  tables: { href: "/dashboard/tables", moduleKey: SAAS_MODULES.TABLES },
  ingredients: { href: "/dashboard/ingredients", moduleKey: SAAS_MODULES.CUSTOM_INGREDIENTS },
  enterprise: { href: "/dashboard/enterprise", moduleKey: SAAS_MODULES.ENTERPRISE_LABELS },
};

export function isDashboardNavigationKey(value: string): value is DashboardNavigationKey {
  return value in DASHBOARD_NAVIGATION_CONTRACT;
}
