import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AdminShell } from "@/features/platform-iam/components/AdminShell";
import { getAdminNavigationConfiguration } from "@/features/configuration/services/configuration-service";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { isRolloutFeatureEnabled } from "@/features/rollout/services/feature-flags";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  if (!await isRolloutFeatureEnabled(ROLLOUT_FLAGS.CONTROL_PLANE)) notFound();
  const access = await requirePlatformPagePermission({
    permission: PLATFORM_PERMISSIONS.ACCESS,
    action: "platform.admin.shell.accessed",
    targetId: "/admin",
  });
  const navigationOverrides = await getAdminNavigationConfiguration();

  return (
    <AdminShell
      permissions={access.permissionKeys}
      navigationOverrides={navigationOverrides ?? undefined}
    >
      {children}
    </AdminShell>
  );
}
