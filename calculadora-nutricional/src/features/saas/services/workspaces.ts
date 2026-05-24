import { randomBytes } from "node:crypto";

import { OrganizationRole, Prisma, SaaSModuleKey } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { DEFAULT_WORKSPACE_MODULES } from "@/features/saas/domain/modules";

type WorkspaceUser = {
  id: string;
  email: string;
  name?: string | null;
};

type EnsureWorkspaceOptions = {
  organizationName?: string | null;
  modules?: SaaSModuleKey[];
  entitlementSource?: string;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

async function createUniqueSlug(seed: string) {
  const base = normalizeSlug(seed) || "workspace";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = randomBytes(3).toString("hex");
    const slug = `${base}-${suffix}`;
    const existing = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }

  return `${base}-${Date.now().toString(36)}`;
}

function defaultEntitlements(organizationId: string, modules: SaaSModuleKey[], source: string) {
  return modules.map((moduleKey) => ({
    organizationId,
    moduleKey: moduleKey as SaaSModuleKey,
    enabled: true,
    source,
  }));
}

export async function ensureDefaultWorkspaceForUser(user: WorkspaceUser, options: EnsureWorkspaceOptions = {}) {
  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      userId: user.id,
      active: true,
      organization: { status: "ACTIVE" },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (existingMember) return existingMember.organization;

  const organizationName = options.organizationName?.trim() || user.name?.trim() || user.email.split("@")[0] || "Workspace";
  const slug = await createUniqueSlug(organizationName);
  const modules = options.modules?.length ? options.modules : DEFAULT_WORKSPACE_MODULES;
  const entitlementSource = options.entitlementSource || "DEFAULT";

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        ownerId: user.id,
        name: organizationName,
        slug,
      },
    });

    const member = await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: OrganizationRole.OWNER,
      },
    });

    await tx.organizationEntitlement.createMany({
      data: defaultEntitlements(organization.id, modules, entitlementSource),
      skipDuplicates: true,
    });

    await tx.participantModuleGrant.createMany({
      data: modules.map((moduleKey) => ({
        organizationMemberId: member.id,
        moduleKey: moduleKey as SaaSModuleKey,
        enabled: true,
      })),
      skipDuplicates: true,
    });

    return organization;
  });
}

export async function createSecurityAuditLog(
  tx: Prisma.TransactionClient,
  input: {
    organizationId?: string | null;
    userId?: string | null;
    action: string;
    riskLevel?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return tx.securityAuditLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      riskLevel: input.riskLevel ?? "INFO",
      metadata: input.metadata,
    },
  });
}
