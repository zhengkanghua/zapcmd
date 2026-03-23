import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const flags = new Set(process.argv.slice(2));
const isWindows = process.platform === "win32";
const isMacOS = process.platform === "darwin";
const macOSDesktopE2EExperimentalFlag = "--macos-desktop-e2e-experimental";
const macOSDesktopE2EExperimentalEnv = "ZAPCMD_E2E_EXPERIMENTAL_MACOS";
const requireDesktopE2EFlag = "--require-desktop-e2e";
const requireWindowsE2EFlag = "--require-windows-e2e";
const macOSDefaultGateDescription = "macOS 默认只运行 quality gate，不会把 desktop smoke 当作默认 blocking gate";
const macOSExperimentalProbeDescription =
  `如需手动试验，可显式传入 ${macOSDesktopE2EExperimentalFlag} 或设置 ${macOSDesktopE2EExperimentalEnv}=1`;
const macOSSkipDesktopSmokeMessage =
  `macOS 默认跳过 blocking desktop-smoke：Tauri 官方 WebDriver 当前未稳定支持 WKWebView（${macOSExperimentalProbeDescription}）`;
const enableExperimentalMacDesktopE2E =
  flags.has(macOSDesktopE2EExperimentalFlag) || process.env[macOSDesktopE2EExperimentalEnv] === "1";
const supportsDesktopE2E = isWindows || (isMacOS && enableExperimentalMacDesktopE2E);

const runE2E = !flags.has("--skip-e2e");
const e2eOnly = flags.has("--e2e-only");
const installWebDriver = flags.has("--install-webdriver");
const forceWebDriver = flags.has("--force-webdriver");
const requireDesktopE2E = flags.has(requireDesktopE2EFlag) || flags.has(requireWindowsE2EFlag);
const dryRun = flags.has("--dry-run");

function printUsage() {
  console.log("用法: node scripts/verify-local-gate.mjs [选项]");
  console.log("");
  console.log("默认行为:");
  console.log("1) 运行 npm run check:all");
  console.log("2) Windows 上自动检测 WebDriver 依赖，缺失时自动安装");
  console.log(`3) Windows 上运行 npm run e2e:desktop:smoke；${macOSDefaultGateDescription}`);
  console.log("4) Windows 上运行 npm run test:visual:ui（截图级视觉回归门禁）");
  console.log(`   ${macOSExperimentalProbeDescription}`);
  console.log("");
  console.log("选项:");
  console.log("  --skip-e2e             跳过桌面 E2E 冒烟");
  console.log("  --e2e-only             仅运行桌面 E2E 冒烟");
  console.log("  --install-webdriver    无论是否缺失都先执行 WebDriver 安装流程");
  console.log("  --force-webdriver      与 --install-webdriver 搭配，强制重装 msedgedriver");
  console.log(`  ${requireDesktopE2EFlag}  当前平台无法进入默认 blocking 桌面 E2E 路径时直接失败`);
  console.log(`  ${requireWindowsE2EFlag}  兼容旧参数，等价于 ${requireDesktopE2EFlag}`);
  console.log(
    `  ${macOSDesktopE2EExperimentalFlag}  启用 macOS 实验性 desktop smoke 探测（非默认、非 blocking；兼容入口：${macOSDesktopE2EExperimentalEnv}=1）`
  );
  console.log("  --dry-run              仅打印将执行的命令，不实际执行");
  console.log("  --help                 显示帮助");
}

function shouldShowHelp() {
  return flags.has("--help") || flags.has("-h");
}

function assertFlags() {
  if (flags.has("--skip-e2e") && flags.has("--e2e-only")) {
    throw new Error("--skip-e2e 与 --e2e-only 不能同时使用");
  }
  if (flags.has("--force-webdriver") && !flags.has("--install-webdriver")) {
    throw new Error("--force-webdriver 需要与 --install-webdriver 一起使用");
  }
  if (flags.has(requireWindowsE2EFlag)) {
    console.log(`[local-gate] 提示：${requireWindowsE2EFlag} 已兼容映射为 ${requireDesktopE2EFlag}`);
  }
}

function runCommand(command, stepName) {
  if (dryRun) {
    console.log(`[dry-run] ${stepName}: ${command}`);
    return Promise.resolve();
  }

  console.log(`[local-gate] ${stepName}`);
  console.log(`> ${command}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: "inherit",
      windowsHide: true
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${stepName} 失败，退出码: ${code ?? "unknown"}`));
    });
  });
}

function resolveCommandPath(command) {
  const pathValue = process.env.PATH ?? "";
  if (!pathValue) {
    return "";
  }

  const entries = pathValue
    .split(path.delimiter)
    .map((entry) => entry.trim().replace(/^"(.*)"$/, "$1"))
    .filter((entry) => entry.length > 0);

  const hasExt = /\.[^./\\]+$/.test(command);
  const exts =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
          .split(";")
          .map((ext) => ext.trim())
          .filter((ext) => ext.length > 0)
      : [""];

  const names = hasExt
    ? [command]
    : process.platform === "win32"
      ? [command, ...exts.map((ext) => `${command}${ext}`)]
      : [command];

  for (const dir of entries) {
    for (const name of names) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return "";
}

function findFileRecursively(rootDir, targetFileName, maxDepth = 6) {
  if (!rootDir || !fs.existsSync(rootDir)) {
    return "";
  }

  const queue = [{ dir: rootDir, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === targetFileName.toLowerCase()) {
        return fullPath;
      }
      if (entry.isDirectory() && current.depth < maxDepth) {
        queue.push({ dir: fullPath, depth: current.depth + 1 });
      }
    }
  }

  return "";
}

function resolveEdgeDriverPath() {
  const pathHit = resolveCommandPath("msedgedriver");
  if (pathHit) {
    return pathHit;
  }

  const roots = [];
  const customRoot = process.env.ZAPCMD_E2E_WEBDRIVER_ROOT?.trim();
  if (customRoot) {
    roots.push(path.resolve(customRoot));
  }
  if (process.env.RUNNER_TEMP) {
    roots.push(path.join(process.env.RUNNER_TEMP, "zapcmd-webdriver"));
  }
  roots.push(path.resolve(".tmp/webdriver"));

  for (const root of roots) {
    const found = findFileRecursively(root, "msedgedriver.exe");
    if (found) {
      return found;
    }
  }

  return "";
}

function resolveSafariDriverPath() {
  const pathHit = resolveCommandPath("safaridriver");
  if (pathHit) {
    return pathHit;
  }

  const candidates = ["/usr/bin/safaridriver", "/usr/local/bin/safaridriver"];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
}

async function installDriversIfNeeded() {
  if (!runE2E) {
    return;
  }

  if (!isWindows) {
    if (installWebDriver) {
      console.log("[local-gate] 当前平台非 Windows，跳过 msedgedriver 自动安装流程");
    }
    return;
  }

  const tauriDriverPath = resolveCommandPath("tauri-driver");
  const edgeDriverPath = resolveEdgeDriverPath();

  const needInstallTauri = installWebDriver || !tauriDriverPath;
  const needInstallEdge = installWebDriver || !edgeDriverPath;

  if (!needInstallTauri && !needInstallEdge) {
    console.log("[local-gate] WebDriver 依赖已就绪，跳过安装");
    return;
  }

  if (!tauriDriverPath && !installWebDriver) {
    console.log("[local-gate] 未检测到 tauri-driver，开始自动安装");
  } else if (installWebDriver) {
    console.log("[local-gate] 已指定 --install-webdriver，执行安装流程");
  }

  if (!edgeDriverPath && !installWebDriver) {
    console.log("[local-gate] 未检测到 msedgedriver，开始自动安装");
  }

  if (needInstallTauri) {
    await runCommand("cargo install tauri-driver --locked", "安装 tauri-driver");
  }

  if (needInstallEdge) {
    const forceArg = forceWebDriver ? " -Force" : "";
    await runCommand(`pwsh -File scripts/e2e/install-msedgedriver.ps1${forceArg}`, "安装 msedgedriver");
  }
}

async function preflightDesktopDependenciesIfNeeded() {
  if (!runE2E || !supportsDesktopE2E) {
    return;
  }

  if (dryRun) {
    console.log("[dry-run] 预检桌面 E2E 依赖: tauri-driver + native driver");
    return;
  }

  const tauriDriverPath = resolveCommandPath("tauri-driver");
  if (!tauriDriverPath) {
    throw new Error("未检测到 tauri-driver，请先执行：cargo install tauri-driver --locked");
  }

  if (isWindows) {
    const edgeDriverPath = resolveEdgeDriverPath();
    if (!edgeDriverPath) {
      throw new Error("未检测到 msedgedriver，请先执行：pwsh -File scripts/e2e/install-msedgedriver.ps1");
    }
    return;
  }

  if (isMacOS) {
    const safariDriverPath = resolveSafariDriverPath();
    if (!safariDriverPath) {
      throw new Error(
        [
          "未检测到 safaridriver（SafariDriver）。",
          "请先执行：safaridriver --enable",
          "若命令不可用，请先安装 Xcode Command Line Tools：xcode-select --install"
        ].join("\n")
      );
    }
  }
}

async function runQualityGateIfNeeded() {
  if (e2eOnly) {
    return;
  }
  await runCommand("npm run check:all", "运行全量质量门禁");
}

async function runDesktopSmokeIfNeeded() {
  if (!runE2E) {
    return;
  }

  if (!supportsDesktopE2E) {
    const message = isMacOS
      ? macOSSkipDesktopSmokeMessage
      : `当前平台（${process.platform}）不支持桌面 E2E 冒烟，已跳过`;
    if (requireDesktopE2E) {
      throw new Error(`${message}（已开启 ${requireDesktopE2EFlag}）`);
    }
    console.log(`[local-gate] ${message}`);
    return;
  }

  await runCommand("npm run e2e:desktop:smoke", "运行桌面 E2E 冒烟");
}

async function runVisualRegressionIfNeeded() {
  if (!runE2E) {
    return;
  }

  if (!isWindows) {
    return;
  }

  await runCommand("npm run test:visual:ui", "运行截图级视觉回归门禁");
}

async function main() {
  if (shouldShowHelp()) {
    printUsage();
    return;
  }

  assertFlags();
  await installDriversIfNeeded();
  await preflightDesktopDependenciesIfNeeded();
  await runQualityGateIfNeeded();
  await runDesktopSmokeIfNeeded();
  await runVisualRegressionIfNeeded();
  console.log("[local-gate] 本地验证完成");
}

main().catch((error) => {
  console.error(`[local-gate] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
