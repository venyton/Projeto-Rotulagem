export type EffectiveEntitlementSource =
  | "ORGANIZATION_BLOCK"
  | "OVERRIDE"
  | "GRANT"
  | "PLAN_VERSION"
  | "LEGACY_MODULE"
  | "LEGACY_POLICY_V1"
  | "DEFAULT_DENY";

type TimedEntitlement = {
  id: string;
  startsAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
};

export type FeatureEntitlementInput = {
  featureKey: string;
  featureType: "BOOLEAN" | "QUOTA" | "METERED" | "SEAT_LIMIT";
  moduleKey: string;
  organizationStatus: string;
  policyVersion: number;
  at?: Date;
  overrides: Array<TimedEntitlement & {
    mode: "ENABLE" | "DISABLE" | "SET_LIMIT";
    limitValue: number | null;
  }>;
  grants: Array<TimedEntitlement & {
    enabled: boolean;
    limitValue: number | null;
  }>;
  planFeature: {
    enabled: boolean;
    limitValue: number | null;
    validUntil: Date | null;
  } | null;
  legacyModules: Array<{
    moduleKey: string;
    enabled: boolean;
    usageLimit: number | null;
    expiresAt: Date | null;
  }>;
};

export type EffectiveFeatureEntitlement = {
  featureKey: string;
  enabled: boolean;
  limit: number | null;
  source: EffectiveEntitlementSource;
  validUntil: Date | null;
  reasonCode:
    | "organization_inactive"
    | "override_disable"
    | "override_enable"
    | "override_limit"
    | "grant"
    | "plan_version"
    | "legacy_module"
    | "legacy_policy_v1"
    | "not_entitled";
};

function isActive(item: TimedEntitlement, at: Date) {
  return item.startsAt.getTime() <= at.getTime()
    && (item.expiresAt === null || item.expiresAt.getTime() > at.getTime());
}

function newestActive<T extends TimedEntitlement>(items: T[], at: Date) {
  return items
    .filter((item) => isActive(item, at))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))[0] ?? null;
}

function normalizedLimit(featureType: FeatureEntitlementInput["featureType"], value: number | null) {
  if (featureType === "BOOLEAN") return null;
  return value !== null && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function resolveFeatureEntitlement(input: FeatureEntitlementInput): EffectiveFeatureEntitlement {
  const at = input.at ?? new Date();
  const base = { featureKey: input.featureKey };

  if (input.organizationStatus !== "ACTIVE") {
    return {
      ...base,
      enabled: false,
      limit: null,
      source: "ORGANIZATION_BLOCK",
      validUntil: null,
      reasonCode: "organization_inactive",
    };
  }

  const override = newestActive(input.overrides, at);
  if (override) {
    if (override.mode === "DISABLE") {
      return { ...base, enabled: false, limit: null, source: "OVERRIDE", validUntil: override.expiresAt, reasonCode: "override_disable" };
    }
    return {
      ...base,
      enabled: true,
      limit: normalizedLimit(input.featureType, override.limitValue),
      source: "OVERRIDE",
      validUntil: override.expiresAt,
      reasonCode: override.mode === "SET_LIMIT" ? "override_limit" : "override_enable",
    };
  }

  const grant = newestActive(input.grants, at);
  if (grant?.enabled) {
    return {
      ...base,
      enabled: true,
      limit: normalizedLimit(input.featureType, grant.limitValue),
      source: "GRANT",
      validUntil: grant.expiresAt,
      reasonCode: "grant",
    };
  }

  if (input.planFeature?.enabled) {
    return {
      ...base,
      enabled: true,
      limit: normalizedLimit(input.featureType, input.planFeature.limitValue),
      source: "PLAN_VERSION",
      validUntil: input.planFeature.validUntil,
      reasonCode: "plan_version",
    };
  }

  const legacyModule = input.legacyModules.find((item) =>
    item.moduleKey === input.moduleKey
      && item.enabled
      && (item.expiresAt === null || item.expiresAt.getTime() > at.getTime()),
  );
  if (legacyModule) {
    return {
      ...base,
      enabled: true,
      limit: normalizedLimit(input.featureType, legacyModule.usageLimit),
      source: "LEGACY_MODULE",
      validUntil: legacyModule.expiresAt,
      reasonCode: "legacy_module",
    };
  }

  if (input.policyVersion === 1) {
    return {
      ...base,
      enabled: true,
      limit: null,
      source: "LEGACY_POLICY_V1",
      validUntil: null,
      reasonCode: "legacy_policy_v1",
    };
  }

  return {
    ...base,
    enabled: false,
    limit: null,
    source: "DEFAULT_DENY",
    validUntil: null,
    reasonCode: "not_entitled",
  };
}
