import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const sharedValidationRoot = join(sourceRoot, "lib", "validation");
const duplicatedSnippets = [
  {
    value: "/^[A-Za-z0-9_-]{1,100}$/",
    reason: "use isDatabaseId, databaseIdSchema or safeResourceIdSchema",
  },
  {
    value: "/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/",
    reason: "use the shared email validator",
  },
  {
    value: "/^\\d{8,14}$/",
    reason: "use barcodeSchema",
  },
  {
    value: "/^\\d{6}$/",
    reason: "use totpCodeSchema",
  },
  {
    value: "/^[a-f0-9]{64}$/",
    reason: "use passwordResetTokenSchema",
  },
];

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const errors = [];
for (const file of walk(sourceRoot)) {
  if (!/\.(?:js|jsx|ts|tsx)$/.test(file) || file.startsWith(sharedValidationRoot)) continue;

  const content = readFileSync(file, "utf8");
  for (const snippet of duplicatedSnippets) {
    if (content.includes(snippet.value)) {
      errors.push(`${relative(root, file)}: ${snippet.reason}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Validation boundary checks passed.");
