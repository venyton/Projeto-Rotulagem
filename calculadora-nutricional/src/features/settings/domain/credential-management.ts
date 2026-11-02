// BILLING is a historical tenant role preserved by the migration baseline. It
// deliberately falls through to the least-privileged branch in every policy
// below; preserving the database value must not recreate broad authority.
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "BILLING";

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
    if (input.actorRole === "ADMIN") return input.targetRole === "MEMBER";
    return input.targetRole === "MEMBER";
}

export function canGrantManagedProfilePermissions(input: {
    hasGlobalAuthority: boolean;
    actorRole: WorkspaceRole;
    actorPermissions: readonly string[];
    requestedPermissions: readonly string[];
}) {
    if (input.hasGlobalAuthority || input.actorRole === "OWNER" || input.actorRole === "ADMIN") {
        return true;
    }

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
