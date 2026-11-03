import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const output = mkdtempSync(join(tmpdir(), "soizi-package-content-"));
try {
  const compiler = requireCompilerPath();
  const compilation = spawnSync(process.execPath, [compiler,
    "src/lib/validation/package-content.ts", "src/lib/validation/package-content.test.ts",
    "--outDir", output, "--module", "commonjs", "--moduleResolution", "node",
    "--target", "es2022", "--esModuleInterop", "--skipLibCheck",
  ], { stdio: "inherit" });
  if (compilation.status !== 0) process.exitCode = compilation.status ?? 1;
  else {
    const result = spawnSync(process.execPath, ["--test", join(output, "package-content.test.js")], {
      stdio: "inherit", env: { ...process.env, NODE_PATH: resolve("node_modules") },
    });
    process.exitCode = result.status ?? 1;
  }
} finally {
  // Apenas o diretório efêmero criado por mkdtempSync nesta execução.
  rmSync(output, { recursive: true, force: true });
}

function requireCompilerPath() {
  return resolve("node_modules/typescript/bin/tsc");
}
