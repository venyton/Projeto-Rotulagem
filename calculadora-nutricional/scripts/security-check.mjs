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
    /@\/features\/[^/]+\/services\//.test(content)
  )) {
    errors.push(`${sourcePath}: client module imports persistence or server service`);
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
    !content.includes("rejectCrossOriginRequest")
  ) {
    errors.push(`${sourcePath}: mutating route handler must enforce same-origin requests`);
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
