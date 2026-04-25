function basename(file) {
  const parts = file.split("/");
  return parts[parts.length - 1] ?? file;
}

function isCommandSourceFile(file) {
  return /^commands\/catalog\/_.*\.ya?ml$/.test(file);
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

function getCoverageDecision(stagedFiles) {
  const isOnlyTestsOrStyles = stagedFiles.every((file) => isTestFile(file) || isStyleFile(file));
  if (isOnlyTestsOrStyles) {
    return { shouldRunCoverage: false, reasons: [] };
  }

  const reasons = [];
  const keyConfigMatches = new Set();
  for (const file of stagedFiles) {
    const base = basename(file);

    if (file === "package.json" || file === "package-lock.json") {
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

  const highRiskRustMatches = stagedFiles.filter(isHighRiskRustFile);
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

function isBuiltinCommandSyncTarget(file) {
  return (
    isCommandSourceFile(file) ||
    file === "scripts/generate_builtin_commands.ps1" ||
    file === "scripts/commands/generate-builtin-commands.mjs" ||
    file === "scripts/commands/migrate-builtin-command-sources.mjs"
  );
}

function isHighRiskRustFile(file) {
  if (
    file === "src-tauri/src/terminal.rs" ||
    file === "src-tauri/src/command_catalog.rs" ||
    file === "src-tauri/src/bounds.rs"
  ) {
    return true;
  }

  return (
    file.startsWith("src-tauri/src/terminal/") ||
    file.startsWith("src-tauri/src/command_catalog/") ||
    file.startsWith("src-tauri/src/bounds/")
  );
}

function getWorkflowContractTests(stagedFiles) {
  if (!stagedFiles.some((file) => file.startsWith(".github/workflows/"))) {
    return [];
  }

  return [
    "scripts/__tests__/ci-gate-workflow-contract.test.ts",
    "scripts/__tests__/controlled-visual-runner-contract.test.ts",
    "scripts/__tests__/release-workflow-windows-x64-contract.test.ts"
  ];
}

export function buildPrecommitGuardPlan(stagedFiles) {
  if (stagedFiles.length === 0) {
    return { skip: true, commands: [], coverageDecision: { shouldRunCoverage: false, reasons: [] } };
  }

  const skip = stagedFiles.every(isDocOnlyFile);
  if (skip) {
    return { skip: true, commands: [], coverageDecision: { shouldRunCoverage: false, reasons: [] } };
  }

  const commands = [
    { command: "npm", args: ["run", "lint"] },
    { command: "npm", args: ["run", "typecheck"] }
  ];

  const builtinCommandSourceMatches = stagedFiles.filter(isBuiltinCommandSyncTarget);
  if (builtinCommandSourceMatches.length > 0) {
    commands.push({
      command: "npm",
      args: ["run", "check:builtin-command-sync"]
    });
  }

  const relatedBusinessTargets = stagedFiles.filter(isSrcBusinessCodeFile);
  if (relatedBusinessTargets.length > 0) {
    commands.push({
      command: "npm",
      args: ["run", "test:related", "--", ...relatedBusinessTargets]
    });
  }

  const workflowContractTests = getWorkflowContractTests(stagedFiles);
  if (workflowContractTests.length > 0) {
    commands.push({
      command: "npm",
      args: ["run", "test:run", "--", ...workflowContractTests]
    });
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
    commands.push({ command: "npm", args: ["run", "typecheck:test"] });
  }

  const hasRustChanges = stagedFiles.some(
    (file) =>
      file.startsWith("src-tauri/") ||
      file.endsWith(".rs") ||
      file.endsWith("Cargo.toml") ||
      file.endsWith("Cargo.lock")
  );
  if (hasRustChanges) {
    commands.push({
      command: "cargo",
      args: ["check", "--manifest-path", "src-tauri/Cargo.toml"]
    });
  }

  const highRiskRustMatches = stagedFiles.filter(isHighRiskRustFile);
  if (highRiskRustMatches.length > 0) {
    commands.push({
      command: "cargo",
      args: ["test", "--manifest-path", "src-tauri/Cargo.toml"]
    });
  }

  const coverageDecision = getCoverageDecision(stagedFiles);
  if (coverageDecision.shouldRunCoverage) {
    commands.push({ command: "npm", args: ["run", "test:coverage"] });
  }

  return {
    skip: false,
    commands,
    coverageDecision,
    builtinCommandSourceMatches,
    highRiskRustMatches,
    workflowContractTests
  };
}
