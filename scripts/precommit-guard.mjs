import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPrecommitGuardPlan } from "./precommit-guard-lib.mjs";

function normalizeGitPath(value) {
  return value.replace(/\\/g, "/");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.error) {
    console.error(`[precommit-guard] 无法执行命令：${command}`);
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function execText(command, args) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "precommit-guard-"));
  const stdoutPath = path.join(tmpDir, "stdout.txt");

  const stdoutFd = fs.openSync(stdoutPath, "w");
  try {
    const result = spawnSync(command, args, {
      stdio: ["ignore", stdoutFd, "inherit"],
      shell: false
    });

    if (result.error) {
      console.error(`[precommit-guard] 无法执行命令：${command}`);
      console.error(result.error);
      process.exit(1);
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }

    return fs.readFileSync(stdoutPath, "utf8");
  } finally {
    try {
      fs.closeSync(stdoutFd);
    } catch {}
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

function getStagedFiles() {
  const stdout = execText("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeGitPath);
}

function formatFileList(files, limit = 20) {
  if (files.length <= limit) {
    return files;
  }
  const shown = files.slice(0, limit);
  return [...shown, `…（另有 ${files.length - limit} 个文件）`];
}

function formatCommand(command, args) {
  const joined = [command, ...args].join(" ");
  if (joined.length <= 180) {
    return joined;
  }
  return `${command} ${args[0]} ${args[1]} …（共 ${Math.max(0, args.length - 2)} 个参数）`;
}

function printCoveragePlan(decision, commandsToRun) {
  console.log("");
  console.log("[precommit-guard] 命中触发规则：将追加执行 npm run test:coverage");
  console.log("");
  console.log("触发原因 / 命中文件：");

  decision.reasons.forEach((reason, idx) => {
    console.log(`  ${idx + 1}. ${reason.title}`);
    formatFileList(reason.files).forEach((file) => {
      console.log(`     - ${file}`);
    });
  });

  console.log("");
  console.log("将运行的命令清单：");
  commandsToRun.forEach(({ command, args }) => {
    console.log(`  - ${formatCommand(command, args)}`);
  });
  console.log("");
}

const stagedFiles = getStagedFiles();
const plan = buildPrecommitGuardPlan(stagedFiles);
if (plan.skip) {
  console.log("[precommit-guard] 仅文档/说明类改动：跳过本地门禁检查。");
  process.exit(0);
}
const commandsToRun = [...plan.commands];
if (plan.highRiskRustMatches.length > 0) {
  const formattedTargets = formatFileList(plan.highRiskRustMatches.slice().sort(), 10).join(", ");
  console.log(
    `[precommit-guard] 命中高风险 Rust 变更：${formattedTargets}；将追加执行 ${formatCommand("cargo", [
      "test",
      "--manifest-path",
      "src-tauri/Cargo.toml"
    ])}`
  );
}
if (plan.coverageDecision.shouldRunCoverage) {
  printCoveragePlan(plan.coverageDecision, commandsToRun);
}

for (const { command, args } of commandsToRun) {
  run(command, args);
}
