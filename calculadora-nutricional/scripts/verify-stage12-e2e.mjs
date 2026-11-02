import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const baseUrl = "http://127.0.0.1:3012";
const localDatabaseUrl = "postgresql://calculadora_local:calculadora_local@127.0.0.1:54329/calculadora_nutricional?schema=public";
const password = process.env.STAGE12_E2E_PASSWORD;
const secret = process.env.NEXTAUTH_SECRET;
let currentStep = "initialization";

if (!password || password.length < 16) throw new Error("STAGE12_E2E_PASSWORD local com 16+ caracteres é obrigatória.");
if (!secret || secret.length < 32) throw new Error("NEXTAUTH_SECRET local com 32+ caracteres é obrigatório.");

for (const key of ["POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL"]) {
  if (process.env[key] !== localDatabaseUrl) {
    throw new Error(`${key} deve apontar explicitamente para ${localDatabaseUrl}.`);
  }
}

const testEnv = {
  ...process.env,
  NEXTAUTH_URL: baseUrl,
  APP_URL: baseUrl,
  NEXT_PUBLIC_APP_URL: baseUrl,
  CONTROL_PLANE_ENABLED: "true",
  CUSTOMER_PLAN_UI_ENABLED: "true",
  PIX_AUTOMATICO_ENABLED: "false",
  TREASURY_AUTOMATION_ENABLED: "false",
  STAGE11_BROWSER_PASSWORD: password,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: options.env ?? testEnv,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} falhou: ${(result.stderr || result.stdout || "sem detalhe").trim()}`);
  }
  return result.stdout.trim();
}

function fixture(command) {
  const output = run("npx", ["-y", "tsx", "scripts/stage11-browser-fixture.ts", command]);
  return JSON.parse(output.split("\n").at(-1));
}

function browser(session, ...args) {
  try {
    return run("npx", ["-y", "agent-browser", "--session", session, ...args]);
  } catch (error) {
    throw new Error(`E2E falhou em ${currentStep}: ${error instanceof Error ? error.message : "erro desconhecido"}`);
  }
}

async function waitForServer(server, logs) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Servidor E2E encerrou antes do teste. ${logs.join("").slice(-4_000)}`);
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return;
    } catch {
      // O processo ainda está inicializando.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Servidor E2E não ficou pronto. ${logs.join("").slice(-4_000)}`);
}

async function main() {
  const suffix = randomUUID().slice(0, 8);
  const ownerSession = `soizi-stage12-owner-${suffix}`;
  const memberSession = `soizi-stage12-member-${suffix}`;
  const logs = [];
  let server;

  const prepared = fixture("prepare");
  try {
    server = spawn("npm", ["run", "dev", "--", "--port", "3012"], {
      cwd: projectRoot,
      env: testEnv,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (chunk) => logs.push(chunk.toString()));
    server.stderr.on("data", (chunk) => logs.push(chunk.toString()));
    await waitForServer(server, logs);

    currentStep = "owner credentials";
    browser(ownerSession, "open", `${baseUrl}/login`);
    browser(ownerSession, "wait", "--load", "networkidle");
    browser(ownerSession, "wait", "5000");
    browser(ownerSession, "fill", "#email", prepared.email);
    browser(ownerSession, "fill", "#password", password);
    assert.equal(browser(ownerSession, "get", "value", "#email"), prepared.email);
    assert.equal(browser(ownerSession, "get", "value", "#password").length, password.length);
    browser(ownerSession, "eval", "document.querySelector('#login-form').requestSubmit(); true");
    currentStep = "owner MFA challenge";
    browser(ownerSession, "wait", "1500");
    const ownerChallenge = browser(ownerSession, "get", "text", "body");
    assert.match(ownerChallenge, /Verificação em duas etapas/, `Desafio MFA ausente. Página: ${ownerChallenge.slice(0, 500)}`);
    const currentCode = fixture("code").code;
    browser(ownerSession, "fill", "#twoFactorCode", currentCode);
    browser(ownerSession, "click", "button[form='login-form']");
    currentStep = "owner dashboard redirect";
    browser(ownerSession, "wait", "--url", "**/dashboard");

    currentStep = "table creation regression";
    browser(ownerSession, "open", `${baseUrl}/dashboard/new`);
    browser(ownerSession, "wait", "--text", "Nova tabela nutricional");
    const tableRegression = browser(ownerSession, "get", "text", "body");
    assert.match(tableRegression, /Adicione ingredientes, revise os cálculos/);
    browser(ownerSession, "fill", "textarea[placeholder^='ex: Barra']", "Produto E2E Stage 12");
    browser(ownerSession, "fill", "input[type='number'][placeholder='ex: 20']", "100");
    browser(ownerSession, "find", "role", "button", "click", "--name", "Salvar projeto");
    browser(ownerSession, "wait", "--url", "**/dashboard/edit/*");
    assert.match(browser(ownerSession, "get", "url"), /\/dashboard\/edit\/[a-z0-9]+$/i);
    browser(ownerSession, "open", `${baseUrl}/dashboard/tables`);
    browser(ownerSession, "wait", "--text", "Produto E2E Stage 12");

    currentStep = "billing fail-closed";
    browser(ownerSession, "open", `${baseUrl}/dashboard/billing`);
    browser(ownerSession, "wait", "--text", "Sandbox aguardando credencial");
    const billing = browser(ownerSession, "get", "text", "body");
    assert.match(billing, /nenhum checkout externo será criado/i);
    assert.match(billing, /Pagamento fora da SoIZI/);

    currentStep = "control plane owner access";
    browser(ownerSession, "open", `${baseUrl}/admin`);
    browser(ownerSession, "wait", "--text", "Control Plane");
    browser(ownerSession, "open", `${baseUrl}/admin/metrics`);
    browser(ownerSession, "wait", "--text", "Métricas e consumo");
    const metrics = browser(ownerSession, "get", "text", "body");
    assert.match(metrics, /alerta operacional|alertas operacionais/i);

    currentStep = "tenant member login";
    browser(memberSession, "open", `${baseUrl}/login`);
    browser(memberSession, "wait", "--load", "networkidle");
    browser(memberSession, "wait", "2000");
    browser(memberSession, "fill", "#email", prepared.memberEmail);
    browser(memberSession, "fill", "#password", password);
    browser(memberSession, "eval", "document.querySelector('#login-form').requestSubmit(); true");
    browser(memberSession, "wait", "--url", "**/dashboard");
    currentStep = "tenant member admin denial";
    browser(memberSession, "open", `${baseUrl}/admin`);
    browser(memberSession, "wait", "--url", "**/dashboard");
    assert.equal(browser(memberSession, "get", "url"), `${baseUrl}/dashboard`);

    currentStep = "mobile overflow";
    browser(ownerSession, "set", "viewport", "390", "844");
    browser(ownerSession, "open", `${baseUrl}/admin/metrics`);
    const overflow = browser(ownerSession, "eval", "JSON.stringify({innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth})");
    assert.match(overflow, /\"innerWidth\":390,\"scrollWidth\":390/);

    console.log(JSON.stringify({
      target: baseUrl,
      database: "127.0.0.1:54329/calculadora_nutricional",
      ownerLoginWithMfa: true,
      tenantMemberAdminDenied: true,
      tableCreationRegressionPassed: true,
      checkoutFailClosedWithoutKey: true,
      controlPlaneAndMetricsRendered: true,
      mobileOverflow: false,
    }));
  } catch (error) {
    const serverTail = logs.join("").slice(-6_000);
    throw new Error(`${error instanceof Error ? error.message : "Falha E2E"}\nServer log:\n${serverTail}`);
  } finally {
    for (const session of [ownerSession, memberSession]) {
      try { browser(session, "close"); } catch { /* A sessão pode não ter sido aberta. */ }
    }
    if (server?.pid) {
      try { process.kill(-server.pid, "SIGTERM"); } catch { /* O servidor já pode ter encerrado. */ }
    }
    fixture("cleanup");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha desconhecida no E2E local.");
  process.exitCode = 1;
});
