import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");

const forbiddenFiles = [
  "src/app/api/debug-auth/route.ts",
  "src/app/api/debug/force-migrate/route.ts",
  "src/app/dashboard/debug/page.tsx",
];

const forbiddenPatterns = [
  { pattern: /\$queryRawUnsafe\b/, reason: "raw SQL query" },
  { pattern: /\$executeRawUnsafe\b/, reason: "raw SQL execution" },
  { pattern: /dangerouslySetInnerHTML\b/, reason: "unreviewed HTML injection sink" },
  { pattern: /\beval\s*\(/, reason: "dynamic code execution" },
  { pattern: /\bnew\s+Function\s*\(/, reason: "dynamic code execution" },
];

const requiredSecurityPatterns = [
  {
    file: "src/features/commercial-catalog/services/catalog-management.ts",
    pattern: /authorizePrivilegedPlatformRequest/,
    reason: "catalog publication must require privileged authorization",
  },
  {
    file: "src/features/commercial-catalog/services/commercial-benefits-management.ts",
    pattern: /authorizePrivilegedPlatformRequest/,
    reason: "commercial grants and overrides must require privileged authorization",
  },
  {
    file: "src/app/admin/organizations/actions.ts",
    pattern: /authorizePrivilegedPlatformRequest/,
    reason: "organization suspension must require privileged authorization",
  },
  {
    file: "src/features/platform-iam/services/operator-management.ts",
    pattern: /authorizePrivilegedPlatformRequest/,
    reason: "operator management must require privileged authorization",
  },
  {
    file: "src/lib/security/totp.ts",
    pattern: /afterTimeStep/,
    reason: "TOTP verification must retain replay protection",
  },
  {
    file: "src/app/admin/layout.tsx",
    pattern: /CONTROL_PLANE/,
    reason: "the control plane must retain its server-side rollout gate",
  },
  {
    file: "src/features/billing/services/checkout.ts",
    pattern: /BILLING_CHECKOUT/,
    reason: "outbound checkout must retain its server-side rollout gate",
  },
  {
    file: "src/app/api/webhooks/asaas/route.ts",
    pattern: /BILLING_WEBHOOK_PROCESSING/,
    reason: "automatic webhook processing must retain its independent rollout gate",
  },
  {
    file: "src/lib/auth.ts",
    pattern: /(?=[\s\S]*externalIdentity)(?=[\s\S]*verifiedOAuthEmail)/,
    reason: "OAuth identities must be provider-bound and email linking must be verified",
  },
  {
    file: "src/lib/security/request-body.ts",
    pattern: /(?=[\s\S]*byteLength\s*>\s*maxBytes)(?=[\s\S]*TextDecoder\("utf-8",\s*\{\s*fatal:\s*true\s*\}\))/,
    reason: "request body parsing must enforce real byte limits and strict UTF-8 decoding",
  },
];

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const errors = [];

for (const file of forbiddenFiles) {
  if (existsSync(join(root, file))) {
    errors.push(`${file}: debug surface must not be deployed`);
  }
}

for (const requirement of requiredSecurityPatterns) {
  const absolutePath = join(root, requirement.file);
  if (!existsSync(absolutePath) || !requirement.pattern.test(readFileSync(absolutePath, "utf8"))) {
    errors.push(`${requirement.file}: ${requirement.reason}`);
  }
}

for (const file of walk(sourceRoot)) {
  if (!/\.(?:js|jsx|ts|tsx)$/.test(file)) continue;

  const content = readFileSync(file, "utf8");
  const sourcePath = relative(root, file).replaceAll("\\", "/");
  const isClientModule = /^\s*["']use client["'];?/m.test(content);
  const isServerActionModule = sourcePath.includes("/actions/");
  const isServerService = sourcePath.includes("/services/") && (
    content.includes('from "@/lib/prisma"') ||
    content.includes("from '@/lib/prisma'") ||
    content.includes('from "node:') ||
    content.includes("from 'node:") ||
    content.includes("getServerSession")
  );

  if (isClientModule && (
    content.includes("@prisma/client") ||
    content.includes("@/lib/prisma") ||
    /@\/features\/[^/]+\/services\//.test(content) ||
    /@\/features\/billing\/(?:integrations|persistence)\//.test(content) ||
    content.includes("ASAAS_API_KEY")
  )) {
    errors.push(`${sourcePath}: client module imports persistence or server service`);
  }

  if (/NEXT_PUBLIC_(?:CONTROL_PLANE|BILLING|CUSTOMER_PLAN|PIX_AUTOMATICO|TREASURY_AUTOMATION)/.test(content)) {
    errors.push(`${sourcePath}: rollout security flags must remain server-side`);
  }

  if (
    /https:\/\/api(?:-sandbox)?\.asaas\.com/.test(content)
    && sourcePath !== "src/features/billing/integrations/asaas/config.ts"
    && !sourcePath.endsWith(".test.ts")
  ) {
    errors.push(`${sourcePath}: Asaas endpoint must remain centralized in the safe configuration`);
  }

  if (sourcePath.includes("/domain/") && content.includes("@prisma/client")) {
    errors.push(`${sourcePath}: domain module must not depend on the Prisma persistence model`);
  }

  if (isServerActionModule && !/^\s*["']use server["'];?/m.test(content)) {
    errors.push(`${sourcePath}: action module must declare use server`);
  }

  if (isServerService && !/^\s*import\s+["']server-only["'];?/m.test(content)) {
    errors.push(`${sourcePath}: service with server infrastructure must import server-only`);
  }

  if (
    sourcePath.startsWith("src/app/api/") &&
    /export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE)\b/.test(content) &&
    !content.includes("rejectCrossOriginRequest") &&
    !(
      sourcePath === "src/app/api/webhooks/asaas/route.ts" &&
      content.includes("verifyAsaasWebhookRequest")
    )
  ) {
    errors.push(`${sourcePath}: mutating route handler must enforce same-origin requests`);
  }

  if (
    sourcePath.startsWith("src/app/api/") &&
    /\b(?:request|req)\.(?:json|text|arrayBuffer)\s*\(/.test(content)
  ) {
    errors.push(`${sourcePath}: API request bodies must use a bounded stream reader`);
  }

  for (const { pattern, reason } of forbiddenPatterns) {
    if (pattern.test(content)) {
      errors.push(`${sourcePath}: ${reason}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Security source checks passed.");
