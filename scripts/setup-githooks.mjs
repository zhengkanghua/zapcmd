import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const gitDirExists = existsSync(".git");
const hooksPath = process.platform === "win32" ? ".githooks/windows" : ".githooks/posix";
const hookFileExists = existsSync(`${hooksPath}/pre-commit`);

if (!gitDirExists || !hookFileExists) {
  process.exit(0);
}

const result = spawnSync("git", ["config", "core.hooksPath", hooksPath], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
