// BILLING is a historical tenant role preserved by the migration baseline. It
// deliberately falls through to the least-privileged branch in every policy
// below; preserving the database value must not recreate broad authority.
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "BILLING";

// The organization owner is established by ownership, never by assigning a profile.
export function roleForAssignableProfile(systemKey: string): "ADMIN" | "MEMBER" | null {
    if (systemKey === "OWNER") return null;
    return systemKey === "ADMIN" ? "ADMIN" : "MEMBER";
}

export function canManageOrganizationMember(input: {
    hasGlobalAuthority: boolean;
    sameOrganization: boolean;
    isSelf: boolean;
    actorRole: WorkspaceRole;
    targetRole: WorkspaceRole;
}) {
    if (input.isSelf) return false;
    if (input.hasGlobalAuthority) return true;
    if (!input.sameOrganization) return false;
    if (input.actorRole === "OWNER") return input.targetRole !== "OWNER";
    if (input.actorRole === "ADMIN") return input.targetRole === "MEMBER" || input.targetRole === "ADMIN";
    return false;
}

export function canGrantManagedProfilePermissions(input: {
    hasGlobalAuthority: boolean;
    actorRole: WorkspaceRole;
    actorPermissions: readonly string[];
    requestedPermissions: readonly string[];
}) {
    if (!input.hasGlobalAuthority && input.actorRole !== "OWNER" && input.actorRole !== "ADMIN") return false;

    const actorPermissions = new Set(input.actorPermissions);
    return input.requestedPermissions.every((permission) => actorPermissions.has(permission));
}

export function canResetManagedMemberPassword(input: {
    hasGlobalAuthority: boolean;
    sameOrganization: boolean;
    isSelf: boolean;
    actorRole: WorkspaceRole;
    targetRole: WorkspaceRole;
}) {
    if (input.isSelf) return false;
    if (input.hasGlobalAuthority) return true;
    if (!input.sameOrganization) return false;
    if (input.actorRole === "OWNER") return input.targetRole !== "OWNER";
    if (input.actorRole === "ADMIN") return input.targetRole === "MEMBER";
    return false;
}
