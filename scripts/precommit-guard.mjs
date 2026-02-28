import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getStagedFiles() {
  const result = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const stagedFiles = getStagedFiles();

if (stagedFiles.length === 0) {
  process.exit(0);
}

run("npm", ["run", "lint"]);
run("npm", ["run", "typecheck"]);

const relatedTargets = stagedFiles.filter(
  (file) => file.startsWith("src/") && (file.endsWith(".ts") || file.endsWith(".vue"))
);

if (relatedTargets.length > 0) {
  run("npm", ["run", "test:related", "--", ...relatedTargets]);
}

const hasTestTypecheckTargets = stagedFiles.some(
  (file) =>
    file.includes("__tests__/") ||
    file.endsWith(".test.ts") ||
    file.endsWith(".spec.ts") ||
    file === "vitest.config.ts" ||
    file === "tsconfig.test.json"
);

if (hasTestTypecheckTargets) {
  run("npm", ["run", "typecheck:test"]);
}

const hasRustChanges = stagedFiles.some(
  (file) =>
    file.startsWith("src-tauri/") ||
    file.endsWith(".rs") ||
    file.endsWith("Cargo.toml") ||
    file.endsWith("Cargo.lock")
);

if (hasRustChanges) {
  run("cargo", ["check", "--manifest-path", "src-tauri/Cargo.toml"]);
}
