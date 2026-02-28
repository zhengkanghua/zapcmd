import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const gitDirExists = existsSync(".git");
const hookFileExists = existsSync(".githooks/pre-commit");

if (!gitDirExists || !hookFileExists) {
  process.exit(0);
}

const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

