import { spawnSync } from "node:child_process";

function normalizeGitPath(value) {
  return value.replace(/\\/g, "/");
}

function basename(file) {
  const parts = file.split("/");
  return parts[parts.length - 1] ?? file;
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
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.error) {
    console.error(`[precommit-guard] 无法执行命令：${command}`);
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    if (result.stderr) {
      console.error(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return result.stdout ?? "";
}

function getStagedFiles() {
  const stdout = execText("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeGitPath);
}

function isCommandSourceFile(file) {
  return /^docs\/command_sources\/_.*\.md$/.test(file);
}

function isDocOnlyFile(file) {
  if (file.startsWith("docs/")) {
    return !isCommandSourceFile(file);
  }

  const base = basename(file).toLowerCase();
  if (base.startsWith("readme")) {
    return true;
  }
  if (base === "changelog.md") {
    return true;
  }
  if (file.startsWith(".github/workflows/")) {
    return true;
  }

  return false;
}

function isTestFile(file) {
  return (
    file.includes("__tests__/") ||
    file.endsWith(".test.ts") ||
    file.endsWith(".spec.ts")
  );
}

function isStyleFile(file) {
  const lower = file.toLowerCase();
  return (
    lower.endsWith(".css") ||
    lower.endsWith(".scss") ||
    lower.endsWith(".sass") ||
    lower.endsWith(".less") ||
    lower.endsWith(".styl") ||
    lower.endsWith(".stylus") ||
    lower.endsWith(".pcss")
  );
}

function isSrcBusinessCodeFile(file) {
  if (!file.startsWith("src/")) {
    return false;
  }
  if (!file.endsWith(".ts") && !file.endsWith(".vue")) {
    return false;
  }
  return !isTestFile(file);
}

function isRuntimeCommandsDocFile(file) {
  const base = basename(file).toLowerCase();
  return base.startsWith("readme") || base.endsWith(".md");
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

function getCoverageDecision(stagedFiles) {
  const isOnlyTestsOrStyles = stagedFiles.every((file) => isTestFile(file) || isStyleFile(file));
  if (isOnlyTestsOrStyles) {
    return { shouldRunCoverage: false, reasons: [] };
  }

  const reasons = [];

  const keyConfigMatches = new Set();
  for (const file of stagedFiles) {
    const base = basename(file);

    if (file === "package.json") {
      keyConfigMatches.add(file);
      continue;
    }
    if (file === "package-lock.json") {
      keyConfigMatches.add(file);
      continue;
    }
    if (file === "vitest.config.ts") {
      keyConfigMatches.add(file);
      continue;
    }
    if (/^tsconfig.*\.json$/.test(base)) {
      keyConfigMatches.add(file);
      continue;
    }
    if (file.startsWith("scripts/")) {
      keyConfigMatches.add(file);
      continue;
    }
    if (file.startsWith(".githooks/")) {
      keyConfigMatches.add(file);
      continue;
    }
    if (file === "src-tauri/tauri.conf.json") {
      keyConfigMatches.add(file);
      continue;
    }
    if (file.startsWith("src-tauri/capabilities/")) {
      keyConfigMatches.add(file);
      continue;
    }
    if (file === ".env.keys") {
      keyConfigMatches.add(file);
      continue;
    }
    if (base === "Cargo.lock") {
      keyConfigMatches.add(file);
    }
  }

  if (keyConfigMatches.size > 0) {
    reasons.push({
      title: "关键配置变更",
      files: Array.from(keyConfigMatches).sort()
    });
  }

  const highRiskSrcTargets = new Set([
    "src/services/commandExecutor.ts",
    "src/services/updateService.ts",
    "src/services/tauriBridge.ts"
  ]);
  const highRiskSrcMatches = stagedFiles.filter(
    (file) => file.startsWith("src/features/security/") || highRiskSrcTargets.has(file)
  );
  if (highRiskSrcMatches.length > 0) {
    reasons.push({
      title: "高风险 src 变更",
      files: highRiskSrcMatches.sort()
    });
  }

  const highRiskRustTargets = new Set([
    "src-tauri/src/terminal.rs",
    "src-tauri/src/command_catalog.rs",
    "src-tauri/src/bounds.rs"
  ]);
  const highRiskRustMatches = stagedFiles.filter((file) => highRiskRustTargets.has(file));
  if (highRiskRustMatches.length > 0) {
    reasons.push({
      title: "高风险 Rust 变更",
      files: highRiskRustMatches.sort()
    });
  }

  const runtimeAssetsMatches = stagedFiles.filter(
    (file) =>
      file.startsWith("assets/runtime_templates/commands/") && !isRuntimeCommandsDocFile(file)
  );
  if (runtimeAssetsMatches.length > 0) {
    reasons.push({
      title: "运行时命令模板变更",
      files: runtimeAssetsMatches.sort()
    });
  }

  const srcBusinessFiles = Array.from(new Set(stagedFiles.filter(isSrcBusinessCodeFile))).sort();
  if (srcBusinessFiles.length > 20) {
    reasons.push({
      title: `大改动阈值：src/ 业务代码文件数 ${srcBusinessFiles.length}（> 20）`,
      files: srcBusinessFiles
    });
  }

  return { shouldRunCoverage: reasons.length > 0, reasons };
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
if (stagedFiles.length === 0) {
  process.exit(0);
}

const isDocOnlyChange = stagedFiles.every(isDocOnlyFile);
if (isDocOnlyChange) {
  console.log("[precommit-guard] 仅文档/说明类改动：跳过本地门禁检查。");
  process.exit(0);
}

const relatedBusinessTargets = stagedFiles.filter(isSrcBusinessCodeFile);

const hasTestTypecheckTargets = stagedFiles.some(
  (file) =>
    file.includes("__tests__/") ||
    file.endsWith(".test.ts") ||
    file.endsWith(".spec.ts") ||
    file === "vitest.config.ts" ||
    file === "tsconfig.test.json"
);

const hasRustChanges = stagedFiles.some(
  (file) =>
    file.startsWith("src-tauri/") ||
    file.endsWith(".rs") ||
    file.endsWith("Cargo.toml") ||
    file.endsWith("Cargo.lock")
);

const coverageDecision = getCoverageDecision(stagedFiles);

const commandsToRun = [
  { command: "npm", args: ["run", "lint"] },
  { command: "npm", args: ["run", "typecheck"] }
];

if (relatedBusinessTargets.length > 0) {
  commandsToRun.push({
    command: "npm",
    args: ["run", "test:related", "--", ...relatedBusinessTargets]
  });
}

if (hasTestTypecheckTargets) {
  commandsToRun.push({ command: "npm", args: ["run", "typecheck:test"] });
}

if (hasRustChanges) {
  commandsToRun.push({
    command: "cargo",
    args: ["check", "--manifest-path", "src-tauri/Cargo.toml"]
  });
}

if (coverageDecision.shouldRunCoverage) {
  commandsToRun.push({ command: "npm", args: ["run", "test:coverage"] });
  printCoveragePlan(coverageDecision, commandsToRun);
}

for (const { command, args } of commandsToRun) {
  run(command, args);
}
