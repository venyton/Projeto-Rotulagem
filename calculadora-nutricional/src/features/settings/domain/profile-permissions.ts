import { MODULE_CATALOG, SAAS_MODULES, type SaaSModuleKey } from "@/features/saas/domain/modules";

export const PROFILE_PERMISSION_MODULES = [
    SAAS_MODULES.TABLES,
    SAAS_MODULES.CUSTOM_INGREDIENTS,
    SAAS_MODULES.TECHNICAL_SHEETS,
    SAAS_MODULES.OPEN_FOOD_FACTS,
    SAAS_MODULES.ENTERPRISE_LABELS,
    SAAS_MODULES.EXPORTS,
    SAAS_MODULES.AI_IMPORT,
    SAAS_MODULES.SETTINGS,
] as const satisfies readonly SaaSModuleKey[];

export const DASHBOARD_NAV_MODULES = [
    SAAS_MODULES.TABLES,
    SAAS_MODULES.CUSTOM_INGREDIENTS,
    SAAS_MODULES.TECHNICAL_SHEETS,
    SAAS_MODULES.ENTERPRISE_LABELS,
    SAAS_MODULES.SETTINGS,
] as const satisfies readonly SaaSModuleKey[];

export function isProfilePermissionModule(moduleKey: SaaSModuleKey) {
    return PROFILE_PERMISSION_MODULES.some((profileModuleKey) => profileModuleKey === moduleKey);
}

export function getProfilePermissionDefinition(moduleKey: SaaSModuleKey) {
    return MODULE_CATALOG.find((module) => module.key === moduleKey);
}
