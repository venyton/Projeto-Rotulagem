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
  for (const { pattern, reason } of forbiddenPatterns) {
    if (pattern.test(content)) {
      errors.push(`${relative(root, file)}: ${reason}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Security source checks passed.");
