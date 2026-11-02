import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { AdminNavigationOverride } from "@/features/configuration/domain/admin-navigation";
import type { PlatformPermissionKey } from "@/features/platform-iam/domain/platform-authorization";

export function AdminShell({
  children,
  permissions,
  navigationOverrides,
}: {
  children: React.ReactNode;
  permissions: PlatformPermissionKey[];
  navigationOverrides?: AdminNavigationOverride[];
}) {
  return (
    <DashboardShell
      accessibleModules={[]}
      canAccessPlatformManagement
      platformAdmin={{
        permissions,
        navigationOverrides,
      }}
    >
      {children}
    </DashboardShell>
  );
}
