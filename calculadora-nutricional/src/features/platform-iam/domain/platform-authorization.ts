export const PLATFORM_ROLES = {
  OWNER: "PLATFORM_OWNER",
  ADMIN: "PLATFORM_ADMIN",
  CUSTOMER_ADMIN: "CUSTOMER_ADMIN",
  BILLING_ADMIN: "BILLING_ADMIN",
  PRODUCT_ADMIN: "PRODUCT_ADMIN",
  SUPPORT_AGENT: "SUPPORT_AGENT",
  SECURITY_ADMIN: "SECURITY_ADMIN",
  AUDITOR: "AUDITOR",
  OPS_ADMIN: "OPS_ADMIN",
} as const;

export type PlatformRoleKey = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

export const PLATFORM_PERMISSIONS = {
  ACCESS: "platform.access",
  ORGANIZATIONS_READ: "platform.organizations.read",
  ORGANIZATIONS_UPDATE: "platform.organizations.update",
  USERS_READ: "platform.users.read",
  USERS_SUSPEND: "platform.users.suspend",
  BILLING_READ: "platform.billing.read",
  BILLING_RECONCILE: "platform.billing.reconcile",
  BILLING_REFUND: "platform.billing.refund",
  BILLING_CONFIGURATION_MANAGE: "platform.billing.configuration.manage",
  CATALOG_READ: "platform.catalog.read",
  CATALOG_MANAGE: "platform.catalog.manage",
  CATALOG_PUBLISH: "platform.catalog.publish",
  ENTITLEMENTS_READ: "platform.entitlements.read",
  ENTITLEMENTS_OVERRIDE: "platform.entitlements.override",
  SECURITY_OPERATORS_READ: "platform.security.operators.read",
  SECURITY_OPERATORS_MANAGE: "platform.security.operators.manage",
  SECURITY_RESET_2FA: "platform.security.reset_2fa",
  SUPPORT_METADATA_READ: "platform.support.metadata.read",
  SUPPORT_ACCESS_REQUEST: "platform.support.access_request",
  AUDIT_READ: "platform.audit.read",
  OPERATIONS_READ: "platform.operations.read",
  OPERATIONS_REPROCESS: "platform.operations.reprocess",
  CONFIGURATION_READ: "platform.configuration.read",
  CONFIGURATION_MANAGE: "platform.configuration.manage",
} as const;

export type PlatformPermissionKey = (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS];

export type PlatformAccessSource = "ASSIGNMENT" | "BREAK_GLASS";

export type PlatformAssignmentInput = {
  roleKey: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  startsAt: Date;
  expiresAt: Date | null;
  permissionKeys: readonly string[];
};

export type PlatformAuthorizationDecision = {
  allowed: boolean;
  source: PlatformAccessSource | null;
  roleKeys: PlatformRoleKey[];
  permissionKeys: PlatformPermissionKey[];
  denialReason:
    | "unauthenticated"
    | "inactive_assignment"
    | "permission_missing"
    | "break_glass_requires_2fa"
    | null;
};

const knownRoles = new Set<string>(Object.values(PLATFORM_ROLES));
const knownPermissions = new Set<string>(Object.values(PLATFORM_PERMISSIONS));

function uniqueKnownRoles(values: readonly string[]) {
  return [...new Set(values.filter((value): value is PlatformRoleKey => knownRoles.has(value)))];
}

function uniqueKnownPermissions(values: readonly string[]) {
  return [...new Set(values.filter((value): value is PlatformPermissionKey => knownPermissions.has(value)))];
}

export function isActivePlatformAssignment(assignment: PlatformAssignmentInput, now: Date) {
  return assignment.status === "ACTIVE"
    && assignment.startsAt.getTime() <= now.getTime()
    && (assignment.expiresAt === null || assignment.expiresAt.getTime() > now.getTime());
}

export function resolvePlatformAuthorization(input: {
  authenticated: boolean;
  requestedPermission: PlatformPermissionKey;
  assignments: readonly PlatformAssignmentInput[];
  breakGlassEmail: boolean;
  twoFactorEnabled: boolean;
  now?: Date;
}): PlatformAuthorizationDecision {
  if (!input.authenticated) {
    return {
      allowed: false,
      source: null,
      roleKeys: [],
      permissionKeys: [],
      denialReason: "unauthenticated",
    };
  }

  if (input.breakGlassEmail && input.twoFactorEnabled) {
    return {
      allowed: true,
      source: "BREAK_GLASS",
      roleKeys: [PLATFORM_ROLES.OWNER],
      permissionKeys: Object.values(PLATFORM_PERMISSIONS),
      denialReason: null,
    };
  }

  const now = input.now ?? new Date();
  const activeAssignments = input.assignments.filter((assignment) =>
    isActivePlatformAssignment(assignment, now),
  );
  const roleKeys = uniqueKnownRoles(activeAssignments.map((assignment) => assignment.roleKey));
  const permissionKeys = uniqueKnownPermissions(
    activeAssignments.flatMap((assignment) => assignment.permissionKeys),
  );
  const allowed = permissionKeys.includes(input.requestedPermission);

  return {
    allowed,
    source: allowed ? "ASSIGNMENT" : null,
    roleKeys,
    permissionKeys,
    denialReason: allowed
      ? null
      : input.breakGlassEmail && !input.twoFactorEnabled
        ? "break_glass_requires_2fa"
        : activeAssignments.length === 0
          ? "inactive_assignment"
          : "permission_missing",
  };
}
