import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import {
  authorizePlatformRequest,
  resolveCurrentPlatformAccess,
} from "@/features/platform-iam/services/platform-access";
import { getAdminNavigationConfiguration } from "@/features/configuration/services/configuration-service";
import { getGlobalSaaSMetrics } from "@/features/saas/services/saas-metrics";
import { PlatformManagementOverview } from "@/features/admin/components/PlatformManagementOverview";

export default async function AdminPage() {
  const [access, navigationOverrides] = await Promise.all([
    resolveCurrentPlatformAccess(PLATFORM_PERMISSIONS.ACCESS),
    getAdminNavigationConfiguration(),
  ]);
  let metrics: Awaited<ReturnType<typeof getGlobalSaaSMetrics>> | null = null;

  if (
    access.allowed &&
    access.permissionKeys.includes(PLATFORM_PERMISSIONS.OPERATIONS_READ)
  ) {
    const metricsAccess = await authorizePlatformRequest({
      permission: PLATFORM_PERMISSIONS.OPERATIONS_READ,
      action: "platform.metrics.overview.viewed",
      targetType: "ADMIN_ROUTE",
      targetId: "/admin",
    });

    if (metricsAccess.allowed) {
      metrics = await getGlobalSaaSMetrics();
    }
  }

  return (
    <PlatformManagementOverview
      accessSource={access.source}
      metrics={metrics}
      navigationOverrides={navigationOverrides ?? []}
      permissions={access.permissionKeys}
      updatedAt={metrics ? new Date() : null}
    />
  );
}
