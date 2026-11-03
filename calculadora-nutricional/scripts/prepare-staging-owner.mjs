import { pathToFileURL } from "node:url";

// Provisionamento manual, deliberadamente separado das migrations comuns.
// A confirmação do operador não prova, por si só, que o alvo é homologação.
export function validateStagingInput(env) {
  const { SOIZI_STAGING_DATABASE_URL: url, SOIZI_STAGING_EXPECTED_HOST: host,
    SOIZI_STAGING_EXPECTED_DATABASE: database, SOIZI_STAGING_PASSWORD: password,
    SOIZI_STAGING_CONFIRM: confirmation } = env;
  if (!url || !host || !database || !password || confirmation !== "CONFIRMO_HOMOLOGACAO") {
    throw new Error("Informe URL, host e banco de homologação confirmados, senha e confirmação explícita.");
  }
  let target;
  try { target = new URL(url); } catch { throw new Error("URL de homologação inválida."); }
  if (!["postgres:", "postgresql:"].includes(target.protocol)
    || target.hostname !== host || decodeURIComponent(target.pathname.slice(1)) !== database
    || !host.endsWith(".neon.tech") || target.searchParams.get("sslmode") !== "require") {
    throw new Error("Alvo não corresponde ao host e banco Neon confirmados com SSL obrigatório.");
  }
  if (password.length < 16 || password.length > 256 || password !== password.trim()
    || password.toLowerCase().includes("admin")
    || !/[a-z]/.test(password) || !/[A-Z]/.test(password)
    || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
    throw new Error("A senha deve ter 16 a 256 caracteres, letras maiúsculas e minúsculas, número e símbolo, sem conter admin.");
  }
  return { url, database, password };
}

async function main() {
  const { url, database, password } = validateStagingInput(process.env);
  const { PrismaClient } = await import("@prisma/client");
  const { hash } = await import("bcryptjs");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const modules = ["TABLES", "CUSTOM_INGREDIENTS", "TECHNICAL_SHEETS", "OPEN_FOOD_FACTS", "ENTERPRISE_LABELS", "EXPORTS", "AI_IMPORT", "API_ACCESS", "SETTINGS"];
  try {
    const passwordHash = await hash(password, 12);
    await prisma.$transaction(async (tx) => {
      const [current] = await tx.$queryRaw`SELECT current_database() AS name`;
      if (current.name !== database) throw new Error("Banco conectado diverge do alvo confirmado.");
      if (await tx.user.findUnique({ where: { email: "admin@soizi.com.br" }, select: { id: true } })) {
        throw new Error("Conta já existe: nada foi alterado; revise-a manualmente.");
      }
      const definitions = await tx.featureDefinition.findMany({
        where: { isActive: true, key: { in: modules.map((key) => key.toLowerCase()) } },
        select: { key: true },
      });
      if (definitions.length !== modules.length) throw new Error("Catálogo de funcionalidades incompleto; aplique e valide as migrations primeiro.");
      const user = await tx.user.create({ data: { email: "admin@soizi.com.br", name: "Admin Homologação", password: passwordHash } });
      const organization = await tx.organization.create({
        data: { ownerId: user.id, name: "Admin Homologação", slug: `admin-homologacao-${user.id}`, entitlementPolicyVersion: 2 },
      });
      await tx.organizationMember.create({ data: { userId: user.id, organizationId: organization.id, role: "OWNER" } });
      await tx.organizationEntitlement.createMany({ data: modules.map((moduleKey) => ({ organizationId: organization.id, moduleKey, enabled: true, source: "STAGING_TEST" })) });
      await tx.securityAuditLog.create({ data: {
        organizationId: organization.id, actorType: "SYSTEM", action: "staging.test_owner.provisioned",
        riskLevel: "HIGH", targetType: "USER", targetId: user.id, reason: "Provisionamento manual de homologação sem acesso global de plataforma.",
      } });
    });
    console.log("Conta e workspace de homologação criados. Ative 2FA e solicite PLATFORM_OWNER pelo fluxo administrativo autorizado.");
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    // Não imprimir exceções de conexão, URLs ou credenciais do driver.
    console.error("Provisionamento não concluído; confira o alvo, os pré-requisitos e se a conta já existe.");
    process.exitCode = 1;
  });
}
