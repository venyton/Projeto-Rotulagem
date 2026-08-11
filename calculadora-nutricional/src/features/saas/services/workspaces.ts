import { randomBytes } from "node:crypto";

import { OrganizationKind, OrganizationRole, Prisma, SaaSModuleKey } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ALL_SAAS_MODULES, DEFAULT_WORKSPACE_MODULES } from "@/features/saas/domain/modules";

type WorkspaceUser = {
  id: string;
  email: string;
  name?: string | null;
};

type EnsureWorkspaceOptions = {
  organizationName?: string | null;
  organizationKind?: OrganizationKind;
  legalName?: string | null;
  tradeName?: string | null;
  cnpjHash?: string | null;
  cnpjLastFour?: string | null;
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

function defaultEntitlements(organizationId: string, modules: readonly SaaSModuleKey[], source: string) {
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
        kind: options.organizationKind ?? OrganizationKind.INDIVIDUAL,
        legalName: options.legalName?.trim() || null,
        tradeName: options.tradeName?.trim() || null,
        cnpjHash: options.cnpjHash ?? null,
        cnpjLastFour: options.cnpjLastFour ?? null,
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

/**
 * Provisiona entitlements ausentes no login, fora do caminho de leitura das páginas.
 * A consulta de contexto permanece sem efeitos colaterais e continua usando um
 * fallback em memória para sessões já abertas durante a migração.
 */
export async function ensureOrganizationEntitlementsForUser(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId, active: true, organization: { status: "ACTIVE" } },
    select: { organizationId: true },
  });

  await Promise.all(
    memberships.map((membership) =>
      prisma.organizationEntitlement.createMany({
        data: defaultEntitlements(membership.organizationId, ALL_SAAS_MODULES, "SYSTEM_DEFAULT"),
        skipDuplicates: true,
      })
    )
  );
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
