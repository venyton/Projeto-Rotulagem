import assert from "node:assert/strict";
import test from "node:test";

import {
    canGrantManagedProfilePermissions,
    canManageOrganizationMember,
    canResetManagedMemberPassword,
} from "./credential-management";

test("impede escalada por redefinição de credencial", () => {
    assert.equal(canResetManagedMemberPassword({
        hasGlobalAuthority: false,
        sameOrganization: true,
        isSelf: false,
        actorRole: "MEMBER",
        targetRole: "OWNER",
    }), false);
    assert.equal(canResetManagedMemberPassword({
        hasGlobalAuthority: false,
        sameOrganization: true,
        isSelf: false,
        actorRole: "ADMIN",
        targetRole: "OWNER",
    }), false);
    assert.equal(canResetManagedMemberPassword({
        hasGlobalAuthority: false,
        sameOrganization: true,
        isSelf: false,
        actorRole: "ADMIN",
        targetRole: "MEMBER",
    }), true);
    assert.equal(canResetManagedMemberPassword({
        hasGlobalAuthority: false,
        sameOrganization: true,
        isSelf: false,
        actorRole: "OWNER",
        targetRole: "ADMIN",
    }), true);
    assert.equal(canResetManagedMemberPassword({
        hasGlobalAuthority: true,
        sameOrganization: false,
        isSelf: false,
        actorRole: "MEMBER",
        targetRole: "OWNER",
    }), true);
});

test("obriga a própria conta a usar o fluxo com senha atual e 2FA", () => {
    assert.equal(canResetManagedMemberPassword({
        hasGlobalAuthority: true,
        sameOrganization: true,
        isSelf: true,
        actorRole: "OWNER",
        targetRole: "OWNER",
    }), false);
});

test("impede troca do próprio perfil e gerenciamento acima da hierarquia", () => {
    assert.equal(canManageOrganizationMember({
        hasGlobalAuthority: false,
        sameOrganization: true,
        isSelf: true,
        actorRole: "MEMBER",
        targetRole: "MEMBER",
    }), false);
    assert.equal(canManageOrganizationMember({
        hasGlobalAuthority: false,
        sameOrganization: true,
        isSelf: false,
        actorRole: "MEMBER",
        targetRole: "ADMIN",
    }), false);
    assert.equal(canManageOrganizationMember({
        hasGlobalAuthority: false,
        sameOrganization: true,
        isSelf: false,
        actorRole: "ADMIN",
        targetRole: "MEMBER",
    }), true);
});

test("delegado só pode atribuir um subconjunto das próprias permissões", () => {
    assert.equal(canGrantManagedProfilePermissions({
        hasGlobalAuthority: false,
        actorRole: "MEMBER",
        actorPermissions: ["SETTINGS", "TABLES"],
        requestedPermissions: ["TABLES"],
    }), true);
    assert.equal(canGrantManagedProfilePermissions({
        hasGlobalAuthority: false,
        actorRole: "MEMBER",
        actorPermissions: ["SETTINGS", "TABLES"],
        requestedPermissions: ["TABLES", "EXPORTS"],
    }), false);
});
