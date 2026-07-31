import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ALL_SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";
import {
    contextHasModuleAccess,
    getCurrentSaaSContext,
    listAvailableSaaSOrganizations,
} from "@/features/saas/services/entitlements";
import { canManageOrganizationSettings } from "@/features/settings/services/organization-settings";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const context = await getCurrentSaaSContext();
    const accessibleModules: SaaSModuleKey[] = context
        ? ALL_SAAS_MODULES.filter((moduleKey) =>
            contextHasModuleAccess(context, moduleKey),
        )
        : [];
    const canManageSettings = Boolean(context && canManageOrganizationSettings(context));
    const organizations = await listAvailableSaaSOrganizations();

    return (
        <DashboardShell
            accessibleModules={accessibleModules}
            canManageSettings={canManageSettings}
            organizations={organizations}
            activeOrganizationId={context?.organization.id ?? null}
        >
            {children}
        </DashboardShell>
    );
}
