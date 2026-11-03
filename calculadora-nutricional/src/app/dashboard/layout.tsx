import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { connection } from "next/server";
import { ALL_SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";
import {
    contextHasModuleAccess,
    getCurrentSaaSContext,
    listAvailableSaaSOrganizations,
} from "@/features/saas/services/entitlements";
import { canManageOrganizationSettings } from "@/features/settings/services/organization-settings";
import { canManageOrganizationBilling } from "@/features/billing/domain/billing-authorization";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { resolveCurrentPlatformAccess } from "@/features/platform-iam/services/platform-access";
import { ROLLOUT_FLAGS } from "@/features/rollout/domain/feature-flags";
import { isRolloutFeatureEnabled } from "@/features/rollout/services/feature-flags";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await connection();
    const context = await getCurrentSaaSContext();
    const accessibleModules: SaaSModuleKey[] = context
        ? ALL_SAAS_MODULES.filter((moduleKey) =>
            contextHasModuleAccess(context, moduleKey),
        )
        : [];
    const canManageSettings = Boolean(context && canManageOrganizationSettings(context));
    const [customerPlanUiEnabled, controlPlaneEnabled] = await Promise.all([
        isRolloutFeatureEnabled(ROLLOUT_FLAGS.CUSTOMER_PLAN_UI),
        isRolloutFeatureEnabled(ROLLOUT_FLAGS.CONTROL_PLANE),
    ]);
    const canManageBilling = Boolean(
        customerPlanUiEnabled
        && context
        && canManageOrganizationBilling(context.member.role),
    );
    const [organizations, platformAccess] = await Promise.all([
        listAvailableSaaSOrganizations(),
        controlPlaneEnabled
            ? resolveCurrentPlatformAccess(PLATFORM_PERMISSIONS.ACCESS)
            : Promise.resolve(null),
    ]);

    return (
        <DashboardShell
            accessibleModules={accessibleModules}
            canManageSettings={canManageSettings}
            canManageBilling={canManageBilling}
            canAccessPlatformManagement={Boolean(platformAccess?.allowed)}
            organizations={organizations}
            activeOrganizationId={context?.organization.id ?? null}
        >
            {children}
        </DashboardShell>
    );
}
