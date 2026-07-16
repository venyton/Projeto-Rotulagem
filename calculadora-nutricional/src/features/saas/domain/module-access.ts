import type { SaaSModuleKey } from "./modules";

type TimedModuleSetting = {
  moduleKey: string;
  enabled: boolean;
  expiresAt?: Date | null;
};

type ProfileModuleSetting = {
  moduleKey: string;
  enabled: boolean;
};

export type ModuleAccessInput = {
  moduleKey: SaaSModuleKey;
  now?: Date;
  organizationEntitlements: TimedModuleSetting[];
  profilePermissions?: ProfileModuleSetting[] | null;
  hasProfile: boolean;
  role: string;
  memberGrants: TimedModuleSetting[];
  profileControlledModules: readonly SaaSModuleKey[];
};

function isActive(setting: TimedModuleSetting, now: Date) {
  return setting.enabled && (!setting.expiresAt || setting.expiresAt.getTime() > now.getTime());
}

export function hasEffectiveModuleAccess(input: ModuleAccessInput) {
  const now = input.now ?? new Date();
  const organizationHasModule = input.organizationEntitlements.some(
    (item) => item.moduleKey === input.moduleKey && isActive(item, now),
  );

  if (!organizationHasModule) return false;

  const profilePermission = input.profilePermissions?.find(
    (item) => item.moduleKey === input.moduleKey,
  );
  if (profilePermission) return profilePermission.enabled;

  if (input.hasProfile && input.profileControlledModules.includes(input.moduleKey)) {
    return false;
  }

  if (input.role === "OWNER" || input.role === "ADMIN") return true;

  return input.memberGrants.some(
    (item) => item.moduleKey === input.moduleKey && isActive(item, now),
  );
}
