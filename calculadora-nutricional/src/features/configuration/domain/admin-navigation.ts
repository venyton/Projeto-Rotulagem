export const ADMIN_NAVIGATION_KEYS = [
  "dashboard",
  "metrics",
  "organizations",
  "billing",
  "coupons",
  "grants",
  "catalog",
  "privileged-sessions",
  "operators",
  "audit",
  "settings",
  "internal-settings",
] as const;

export type AdminNavigationKey = (typeof ADMIN_NAVIGATION_KEYS)[number];

export type AdminNavigationOverride = {
  key: AdminNavigationKey;
  enabled?: boolean;
  label?: string;
  order?: number;
};

export function isAdminNavigationKey(value: string): value is AdminNavigationKey {
  return (ADMIN_NAVIGATION_KEYS as readonly string[]).includes(value);
}
