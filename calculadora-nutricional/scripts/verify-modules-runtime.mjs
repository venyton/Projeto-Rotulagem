import { randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const baseUrl = process.env.MODULE_TEST_BASE_URL || "http://localhost:3100";
const modules = [
  "TABLES",
  "CUSTOM_INGREDIENTS",
  "TECHNICAL_SHEETS",
  "OPEN_FOOD_FACTS",
  "ENTERPRISE_LABELS",
  "EXPORTS",
  "AI_IMPORT",
  "SETTINGS",
];
const guardedPages = [
  "/dashboard/tables",
  "/dashboard/ingredients",
  "/dashboard/ingredients/technical-sheets",
  "/dashboard/enterprise",
  "/dashboard/settings",
];

const suffix = randomBytes(6).toString("hex");
const email = `ui-module-test-${suffix}@example.invalid`;
const password = `Aa!${randomBytes(12).toString("hex")}`;
let userId;
let organizationId;
let profileId;

function mergeCookies(current, response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return current;
  const values = new Map(
    current.split("; ").filter(Boolean).map((value) => {
      const separator = value.indexOf("=");
      return [value.slice(0, separator), value.slice(separator + 1)];
    }),
  );
  for (const part of raw.split(/,(?=\s*[^;,]+=)/)) {
    const pair = part.trim().split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) values.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  return [...values].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
}

async function setModule(moduleKey, enabled) {
  await prisma.organizationProfilePermission.update({
    where: { organizationProfileId_moduleKey: { organizationProfileId: profileId, moduleKey } },
    data: { enabled },
  });
}

async function main() {
  const user = await prisma.user.create({
    data: { email, name: "UI Module Test", password: await hash(password, 10) },
  });
  userId = user.id;
  const organization = await prisma.organization.create({
    data: { ownerId: userId, name: "UI Module Test", slug: `ui-module-test-${suffix}` },
  });
  organizationId = organization.id;
  const profile = await prisma.organizationProfile.create({
    data: { organizationId, name: "Teste UI", description: "Teste", systemKey: `UI_${suffix}` },
  });
  profileId = profile.id;

  await prisma.organizationMember.create({
    data: { organizationId, userId, profileId, role: "MEMBER", active: true },
  });
  await prisma.organizationEntitlement.createMany({
    data: modules.map((moduleKey) => ({ organizationId, moduleKey, enabled: true, source: "TEST" })),
  });
  await prisma.organizationProfilePermission.createMany({
    data: modules.map((moduleKey) => ({ organizationProfileId: profileId, moduleKey, enabled: false })),
  });
  await prisma.generatedTable.create({
    data: {
      userId,
      title: "Produto teste",
      portion: 100,
      uom: "g",
      householdMeasure: "100 g",
      popGroup: "ADULTS",
    },
  });

  let cookies = "";
  let response = await request(`${baseUrl}/api/auth/csrf`);
  cookies = mergeCookies(cookies, response);
  const { csrfToken } = await response.json();
  response = await request(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: `${baseUrl}/dashboard`, json: "true" }),
  });
  cookies = mergeCookies(cookies, response);
  if (!cookies.includes("session-token=")) throw new Error("Login temporário falhou.");

  const get = async (path) => {
    const result = await request(`${baseUrl}${path}`, { headers: { Cookie: cookies } });
    return { status: result.status, text: await result.text() };
  };

  for (const path of guardedPages) {
    const result = await get(path);
    if (result.status !== 200 || !result.text.includes("Recurso indisponível")) {
      throw new Error(`Gate inativo falhou em ${path}.`);
    }
  }
  const inactiveHome = await get("/dashboard");
  if (
    inactiveHome.text.includes("/dashboard/tables") ||
    inactiveHome.text.includes("/dashboard/enterprise") ||
    inactiveHome.text.includes("/dashboard/settings")
  ) {
    throw new Error("A home exibiu módulo inativo.");
  }
  console.log("paginas-inativas-ocultas:ok");

  await prisma.organizationProfilePermission.updateMany({
    where: { organizationProfileId: profileId },
    data: { enabled: true },
  });
  for (const path of guardedPages) {
    const result = await get(path);
    if (result.status !== 200 || result.text.includes("Recurso indisponível")) {
      throw new Error(`Módulo ativo falhou em ${path}.`);
    }
  }
  const activeHome = await get("/dashboard");
  if (
    !activeHome.text.includes("/dashboard/tables") ||
    !activeHome.text.includes("/dashboard/settings")
  ) {
    throw new Error("A home não exibiu todos os módulos ativos.");
  }
  console.log("paginas-ativas-visiveis:ok");

  response = await request(`${baseUrl}/api/open-food-facts/products?query=3017620422003`, {
    headers: { Cookie: cookies },
  });
  const openFoodFactsPayload = await response.json();
  if (response.status !== 200 || !openFoodFactsPayload?.products?.length) {
    throw new Error("Open Food Facts ativo não retornou produto.");
  }
  await setModule("OPEN_FOOD_FACTS", false);
  response = await request(`${baseUrl}/api/open-food-facts/products?query=3017620422003`, {
    headers: { Cookie: cookies },
  });
  if (response.status !== 403) throw new Error("Open Food Facts desativado aceitou a busca.");
  await setModule("OPEN_FOOD_FACTS", true);
  console.log("open-food-facts-api-respeita-perfil:ok");

  await setModule("TECHNICAL_SHEETS", false);
  await setModule("AI_IMPORT", false);
  await setModule("EXPORTS", false);
  let ingredients = await get("/dashboard/ingredients");
  if (ingredients.text.includes("Importar ficha técnica com IA") || ingredients.text.includes(">Exportar<")) {
    throw new Error("Controles embutidos inativos foram renderizados.");
  }
  await setModule("TECHNICAL_SHEETS", true);
  ingredients = await get("/dashboard/ingredients");
  if (!ingredients.text.includes("Fichas técnicas") || ingredients.text.includes("Importar ficha técnica com IA")) {
    throw new Error("Gate de fichas técnicas e IA está inconsistente.");
  }
  await setModule("AI_IMPORT", true);
  ingredients = await get("/dashboard/ingredients");
  if (!ingredients.text.includes("Importar ficha técnica com IA")) {
    throw new Error("IA ativa não apareceu.");
  }
  console.log("modulos-embutidos-respeitam-perfil:ok");

  await setModule("OPEN_FOOD_FACTS", false);
  let tablePage = await get("/dashboard/new");
  if (tablePage.text.includes("Buscar produtos por código de barras")) {
    throw new Error("Open Food Facts inativo apareceu na tabela.");
  }
  await setModule("OPEN_FOOD_FACTS", true);
  tablePage = await get("/dashboard/new");
  if (!tablePage.text.includes("Buscar produtos por código de barras")) {
    throw new Error("Open Food Facts ativo não apareceu na tabela.");
  }
  console.log("open-food-facts-embutido:ok");
}

try {
  await main();
} finally {
  if (userId) await prisma.generatedTable.deleteMany({ where: { userId } });
  if (organizationId) await prisma.organization.deleteMany({ where: { id: organizationId } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
