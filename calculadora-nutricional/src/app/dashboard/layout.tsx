import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";
import { canManageOrganizationSettings } from "@/features/settings/services/organization-settings";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const context = await getCurrentSaaSContext();
    const accessibleModules: SaaSModuleKey[] = context
        ? [SAAS_MODULES.TABLES, SAAS_MODULES.CUSTOM_INGREDIENTS, SAAS_MODULES.ENTERPRISE_LABELS].filter((moduleKey) =>
            contextHasModuleAccess(context, moduleKey),
        )
        : [];
    const canManageSettings = Boolean(context && canManageOrganizationSettings(context));

    return (
        <DashboardShell accessibleModules={accessibleModules} canManageSettings={canManageSettings}>
            {children}
        </DashboardShell>
    );
}
