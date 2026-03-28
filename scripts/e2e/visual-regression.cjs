/* eslint-disable no-console */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { DIST_DIR, SCREENSHOTS, VISUAL_ENTRY_DIST_PATH } = require("./visual-regression-config.cjs");
const { collectVisualEnvironment } = require("./visual-regression-env.cjs");
const {
  VISUAL_MODES,
  probeWslHostIp,
  resolveBaselineDir,
  resolveBrowserRuntime,
  resolveDiffRuntime,
  resolveOutputDir,
  resolvePathForRuntime,
  resolveServerBinding,
  resolveVisualMode
} = require("./visual-regression-lib.cjs");
const {
  compareAgainstBaseline,
  createStaticServer,
  ensureDir,
  runBrowserScreenshot,
  waitForFile
} = require("./visual-regression-runner.cjs");

const ARGUMENTS = process.argv.slice(2);
const UPDATE_BASELINE = ARGUMENTS.includes("--update");
const SHOW_HELP = ARGUMENTS.includes("--help") || ARGUMENTS.includes("-h");
const MODE_ARGUMENT = ARGUMENTS.find((arg) => arg.startsWith("--mode=")) || "";
const VISUAL_DIFF_SCRIPT_PATH = path.resolve("scripts/e2e/visual-diff.ps1");

function nowIso() {
  return new Date().toISOString();
}

function printUsage() {
  console.log("用法: node scripts/e2e/visual-regression.cjs [选项]");
  console.log("");
  console.log("选项:");
  console.log("  --update                 用 actual 覆盖当前模式对应的 baseline");
  console.log("  --mode=windows-edge      强制 Windows Edge baseline 模式");
  console.log("  --mode=wsl-windows-edge  强制 WSL -> Windows Edge 桥接模式");
  console.log("  --mode=linux-chromium    强制 Linux Chromium smoke 模式");
  console.log("  --mode=controlled-runner 强制使用受控 runner visual gate 模式");
  console.log("  --help                   显示帮助");
  console.log("");
  console.log("环境变量:");
  console.log("  ZAPCMD_VISUAL_HOST        显式指定浏览器访问的 host");
  console.log("  ZAPCMD_EDGE_PATH          指定 Edge 可执行文件路径");
  console.log("  ZAPCMD_LINUX_BROWSER_PATH 指定 Linux Chromium-family 浏览器路径");
  console.log("  ZAPCMD_PWSH_PATH          指定 visual-diff 使用的 PowerShell 路径");
  console.log("  ZAPCMD_VISUAL_RUNNER_BROWSER_PATH    指定受控 runner 浏览器路径");
  console.log("  ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION 指定受控 runner 浏览器期望版本");
}

function createRuntimeEnv() {
  if (!MODE_ARGUMENT) {
    return process.env;
  }
  return {
    ...process.env,
    ZAPCMD_VISUAL_MODE: MODE_ARGUMENT.slice("--mode=".length).trim()
  };
}

function createWslPathResolver() {
  return (targetPath) =>
    resolvePathForRuntime({
      mode: VISUAL_MODES.wslBridge,
      targetPath,
      convertWslPath: (rawPath) => String(execFileSync("wslpath", ["-w", rawPath], { encoding: "utf8" })).trim()
    });
}

function buildRuntime() {
  const runtimeEnv = createRuntimeEnv();
  const mode = resolveVisualMode({ platform: process.platform, env: runtimeEnv });
  const browserRuntime = resolveBrowserRuntime({ mode, env: runtimeEnv });
  const diffRuntime = resolveDiffRuntime({ mode, env: runtimeEnv });
  const serverBinding = resolveServerBinding({ mode, env: runtimeEnv, probeWslHost: probeWslHostIp });
  const baselineDir = resolveBaselineDir({ mode });
  const outputDir = resolveOutputDir({ mode });
  const resolveWindowsPath = createWslPathResolver();

  return {
    mode,
    browserRuntime,
    diffRuntime,
    serverBinding,
    baselineDir,
    outputDir,
    runId: `${Date.now().toString(36)}-${process.pid}`,
    resolveBrowserPath: browserRuntime.useWindowsPaths ? resolveWindowsPath : (targetPath) => targetPath,
    resolveDiffPath: diffRuntime.useWindowsPaths ? resolveWindowsPath : (targetPath) => targetPath
  };
}

function assertDistReady() {
  if (!fs.existsSync(VISUAL_ENTRY_DIST_PATH)) {
    throw new Error([`未找到构建产物：${VISUAL_ENTRY_DIST_PATH}`, "请先运行：", "  npm run build", "再执行视觉回归脚本。"].join("\n"));
  }
}

function assertBrowserReady(runtime) {
  if (runtime.mode === VISUAL_MODES.controlledRunner) {
    return;
  }

  if (runtime.browserRuntime.command) {
    return;
  }

  const setupHint =
    runtime.mode === VISUAL_MODES.linuxSmoke
      ? "请安装 chromium/google-chrome/microsoft-edge，或设置 ZAPCMD_LINUX_BROWSER_PATH。"
      : "请安装 Microsoft Edge，或设置 ZAPCMD_EDGE_PATH。";
  throw new Error(`未找到 ${runtime.browserRuntime.name} 可执行文件。\n${setupHint}`);
}

function assertDiffReady(runtime) {
  if (runtime.diffRuntime.command) {
    return;
  }
  throw new Error("未找到 PowerShell 运行时。请安装 pwsh，或设置 ZAPCMD_PWSH_PATH。");
}

function assertControlledRunnerBrowser(runtime, environmentManifestPath) {
  const browserCommand = typeof runtime.browserRuntime.command === "string" ? runtime.browserRuntime.command.trim() : "";
  if (!browserCommand) {
    throw new Error(
      [
        "controlled-runner 缺少浏览器路径。",
        "请设置 ZAPCMD_VISUAL_RUNNER_BROWSER_PATH。",
        `env=${environmentManifestPath}`
      ].join("\n")
    );
  }

  const expectedVersion =
    typeof runtime.browserRuntime.expectedVersion === "string" ? runtime.browserRuntime.expectedVersion.trim() : "";
  if (!expectedVersion) {
    throw new Error(
      [
        "controlled-runner 缺少浏览器期望版本。",
        "请设置 ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION。",
        `env=${environmentManifestPath}`
      ].join("\n")
    );
  }

  const manifest = JSON.parse(fs.readFileSync(environmentManifestPath, "utf8"));
  const actualVersion =
    typeof manifest?.browser?.version === "string" ? manifest.browser.version.trim() : "";
  if (!actualVersion.includes(expectedVersion)) {
    throw new Error(
      [
        "controlled-runner 浏览器版本与契约不匹配。",
        `expected=${expectedVersion}`,
        `actual=${actualVersion || "(missing)"}`,
        `env=${environmentManifestPath}`
      ].join("\n")
    );
  }
}

function writeEnvironmentManifest(runtime) {
  const environmentManifestPath = path.join(runtime.outputDir, "environment.json");
  const manifest = collectVisualEnvironment(runtime);
  fs.writeFileSync(environmentManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return environmentManifestPath;
}

async function captureScreenshot(runtime, shot, port, environmentManifestPath) {
  const url = `http://${runtime.serverBinding.urlHost}:${port}/visual.html#${shot.hash}`;
  const actualPath = path.join(runtime.outputDir, `${shot.id}.actual.png`);
  const baselinePath = path.join(runtime.baselineDir, `${shot.id}.png`);
  const profileDir = path.join(runtime.outputDir, "profiles", runtime.runId, `profile-${shot.id}`);
  const logPath = path.join(runtime.outputDir, `${shot.id}.browser.log`);
  const diffOutJsonPath = path.join(runtime.outputDir, `${shot.id}.diff.json`);

  ensureDir(profileDir);
  if (fs.existsSync(actualPath)) {
    fs.rmSync(actualPath, { force: true });
  }

  console.log(`[visual-regression] [${nowIso()}] capture ${shot.id}`);
  await runBrowserScreenshot({
    browserCommand: runtime.browserRuntime.command,
    browserLabel: runtime.browserRuntime.name,
    url,
    outPath: runtime.resolveBrowserPath(actualPath),
    profileDir: runtime.resolveBrowserPath(profileDir),
    cleanupQueryCommand: runtime.diffRuntime.command,
    width: shot.width,
    height: shot.height,
    logPath,
    environmentManifestPath
  });

  await waitForFile(actualPath, { timeoutMs: 2_000, intervalMs: 100 });
  if (!fs.existsSync(actualPath)) {
    throw new Error(`截图未生成：${actualPath}\n请查看日志：${logPath}`);
  }

  return { actualPath, baselinePath, diffOutJsonPath, logPath };
}

async function processShot(runtime, shot, port, environmentManifestPath) {
  const capture = await captureScreenshot(runtime, shot, port, environmentManifestPath);
  if (UPDATE_BASELINE) {
    fs.copyFileSync(capture.actualPath, capture.baselinePath);
    console.log(`[visual-regression] updated baseline: ${capture.baselinePath}`);
    return "";
  }

  const result = await compareAgainstBaseline({
    mode: runtime.mode,
    actualPath: capture.actualPath,
    baselinePath: capture.baselinePath,
    diffCommand: runtime.diffRuntime.command,
    diffOutJsonPath: capture.diffOutJsonPath,
    diffScriptPath: VISUAL_DIFF_SCRIPT_PATH,
    maxDiffRatio: shot.maxDiffRatio,
    pixelTolerance: shot.pixelTolerance,
    sampleStep: shot.sampleStep,
    resolveDiffPath: runtime.resolveDiffPath
  });

  if (result.ok) {
    console.log(`[visual-regression] ✅ ${shot.id}`);
    return "";
  }

    return [
      `❌ ${shot.id} mismatch`,
      `- baseline: ${capture.baselinePath} (${result.baselineHash})`,
      `- actual:   ${capture.actualPath} (${result.actualHash})`,
      `- diff:     ${JSON.stringify(result.diff.payload)}`,
      `- logs:     ${capture.logPath}`,
      `- env:      ${environmentManifestPath}`
    ].join("\n");
}

async function main() {
  if (SHOW_HELP) {
    printUsage();
    return;
  }

  const runtime = buildRuntime();
  if (runtime.mode === VISUAL_MODES.skip) {
    console.log("[visual-regression] 当前平台不支持截图级视觉回归；已跳过。");
    return;
  }

  assertDistReady();
  assertBrowserReady(runtime);
  assertDiffReady(runtime);

  ensureDir(runtime.baselineDir);
  ensureDir(runtime.outputDir);
  console.log(`[visual-regression] mode=${runtime.mode}`);
  console.log(`[visual-regression] baselineDir=${runtime.baselineDir}`);
  console.log(`[visual-regression] outputDir=${runtime.outputDir}`);
  const environmentManifestPath = writeEnvironmentManifest(runtime);
  console.log(`[visual-regression] env=${environmentManifestPath}`);
  if (runtime.mode === VISUAL_MODES.controlledRunner) {
    assertControlledRunnerBrowser(runtime, environmentManifestPath);
  }

  const server = createStaticServer(DIST_DIR);
  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, runtime.serverBinding.listenHost, () => resolve());
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  if (!port) {
    server.close();
    throw new Error("无法获取静态服务器端口。");
  }

  const failures = [];
  try {
    for (const shot of SCREENSHOTS) {
      const failure = await processShot(runtime, shot, port, environmentManifestPath);
      if (failure) {
        failures.push(failure);
      }
    }
  } finally {
    server.close();
  }

  if (failures.length > 0) {
    console.error(failures.join("\n\n"));
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(String(error instanceof Error ? error.message : error));
  process.exitCode = 1;
});
