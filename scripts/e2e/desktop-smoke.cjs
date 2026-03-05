/* eslint-disable no-console */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const { Builder, By, Capabilities, Key, until } = require("selenium-webdriver");

const OUTPUT_DIR = path.resolve(".tmp/e2e/desktop-smoke");
const TAURI_DRIVER_LOG_PATH = path.join(OUTPUT_DIR, "tauri-driver.log");
const E2E_LOG_PATH = path.join(OUTPUT_DIR, "e2e.log");
const SCREENSHOT_PATH = path.join(OUTPUT_DIR, "screenshot.png");

const WEBDRIVER_BASE_URL = "http://127.0.0.1:4444";
const WEBDRIVER_SERVER_URL = `${WEBDRIVER_BASE_URL}/`;
const WEBDRIVER_STATUS_URL = `${WEBDRIVER_BASE_URL}/status`;

const DEFAULT_APP_PATH = path.resolve("src-tauri/target/debug/zapcmd.exe");
const DEFAULT_QUERY = "git";

const DRIVER_READY_TIMEOUT_MS = 30_000;
const UI_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 250;

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveCommandPath(command) {
  const pathValue = process.env.PATH ?? "";
  if (!pathValue) {
    return "";
  }

  const pathEntries = pathValue
    .split(path.delimiter)
    .map((entry) => entry.trim().replace(/^"(.*)"$/, "$1"))
    .filter((entry) => entry.length > 0);

  const hasExtension = /\.[^./\\]+$/.test(command);
  const pathExts =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
          .split(";")
          .map((ext) => ext.trim())
          .filter((ext) => ext.length > 0)
      : [""];

  const candidateNames = hasExtension
    ? [command]
    : process.platform === "win32"
      ? [command, ...pathExts.map((ext) => `${command}${ext}`)]
      : [command];

  for (const dir of pathEntries) {
    for (const name of candidateNames) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return "";
}

function runCommandProbe(command) {
  const resolvedPath = resolveCommandPath(command);
  return {
    ok: resolvedPath.length > 0,
    stdout: resolvedPath,
    stderr: ""
  };
}

function findFileRecursively(rootDir, targetFileName, maxDepth = 6) {
  if (!rootDir || !fs.existsSync(rootDir)) {
    return "";
  }

  const pending = [{ dir: rootDir, depth: 0 }];
  while (pending.length > 0) {
    const current = pending.shift();
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
        pending.push({ dir: fullPath, depth: current.depth + 1 });
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

  const candidateRoots = [];
  const customRoot = process.env.ZAPCMD_E2E_WEBDRIVER_ROOT?.trim();
  if (customRoot) {
    candidateRoots.push(path.resolve(customRoot));
  }
  if (process.env.RUNNER_TEMP) {
    candidateRoots.push(path.join(process.env.RUNNER_TEMP, "zapcmd-webdriver"));
  }
  candidateRoots.push(path.resolve(".tmp/webdriver"));

  for (const root of candidateRoots) {
    const found = findFileRecursively(root, "msedgedriver.exe");
    if (found) {
      return found;
    }
  }

  return "";
}

function formatCommandFix(command) {
  return `- ${command}`;
}

async function ensureOutputDir() {
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: "GET" }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode ?? "unknown"}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
    request.setTimeout(5_000, () => {
      request.destroy(new Error("HTTP 请求超时"));
    });
    request.end();
  });
}

async function waitForWebDriverReady({ timeoutMs, logLine }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // WebDriver /status 标准返回形如：{ value: { ready: true, ... } }
      // 如果结构不同，只要能成功请求到 JSON 也视为 ready（避免因字段差异误判）。
      const status = await httpGetJson(WEBDRIVER_STATUS_URL);
      if (status?.value?.ready === true || status?.value) {
        return;
      }
    } catch {
      // ignore and retry
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`等待 tauri-driver 就绪超时（>${timeoutMs}ms）：${logLine}`);
}

function resolveAppPath() {
  const envPath = process.env.ZAPCMD_E2E_APP_PATH?.trim();
  const appPath = envPath && envPath.length > 0 ? path.resolve(envPath) : DEFAULT_APP_PATH;
  if (!fs.existsSync(appPath)) {
    const hint =
      envPath && envPath.length > 0
        ? `未找到可执行文件：${appPath}\n请检查 ZAPCMD_E2E_APP_PATH 是否正确。`
        : `未找到默认可执行文件：${appPath}\n请先运行：\n${formatCommandFix("npm run tauri:build:debug")}\n或设置 ZAPCMD_E2E_APP_PATH 指向已构建的 zapcmd.exe。`;
    throw new Error(hint);
  }
  return appPath;
}

function createLogger() {
  const lines = [];
  function log(message) {
    const line = `[${nowIso()}] ${message}`;
    lines.push(line);
    console.log(line);
  }
  async function flushToDisk(extraTailText) {
    const payload = extraTailText ? `${lines.join("\n")}\n\n${extraTailText}\n` : `${lines.join("\n")}\n`;
    await fs.promises.writeFile(E2E_LOG_PATH, payload, "utf8");
  }
  return { log, flushToDisk };
}

function spawnTauriDriver({ log, nativeDriverPath }) {
  const logStream = fs.createWriteStream(TAURI_DRIVER_LOG_PATH, { flags: "w" });
  const args = [];
  if (nativeDriverPath) {
    args.push("--native-driver", nativeDriverPath);
  }
  const child = spawn("tauri-driver", args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout?.on("data", (chunk) => logStream.write(chunk));
  child.stderr?.on("data", (chunk) => logStream.write(chunk));

  child.on("exit", (code, signal) => {
    logStream.end();
    log(`tauri-driver 已退出：code=${code ?? "null"} signal=${signal ?? "null"}`);
  });

  const nativeDriverText = nativeDriverPath ? `，native-driver=${nativeDriverPath}` : "";
  log(`已启动 tauri-driver（pid=${child.pid ?? "unknown"}${nativeDriverText}），日志写入：${TAURI_DRIVER_LOG_PATH}`);
  return { child, logStream };
}

async function killChildProcess(child, { log }) {
  if (!child || child.killed) {
    return;
  }

  const waitForExit = new Promise((resolve) => {
    child.once("exit", resolve);
  });

  log("准备关闭 tauri-driver…");
  child.kill();

  const timeout = sleep(5_000).then(() => "timeout");
  const winner = await Promise.race([waitForExit.then(() => "exited"), timeout]);
  if (winner === "timeout") {
    log("tauri-driver 未在 5s 内退出，尝试强制终止…");
    try {
      child.kill("SIGKILL");
    } catch (error) {
      log(`强制终止 tauri-driver 失败：${String(error)}`);
    }
  }
}

async function readFileTail(filePath, maxLines) {
  try {
    const content = await fs.promises.readFile(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    const tail = lines.slice(Math.max(0, lines.length - maxLines));
    return tail.join("\n");
  } catch {
    return "";
  }
}

async function runSmokeCase(driver, { log }) {
  log("用例开始：启动 + 搜索 + 抽屉开合");

  const input = await driver.wait(until.elementLocated(By.id("zapcmd-search-input")), UI_TIMEOUT_MS);
  await driver.wait(until.elementIsVisible(input), UI_TIMEOUT_MS);

  const query = (process.env.ZAPCMD_E2E_QUERY?.trim() || DEFAULT_QUERY).trim();
  log(`输入关键词：${query}`);

  await input.clear();
  await input.sendKeys(query);

  const drawer = await driver.wait(
    until.elementLocated(By.css("[aria-label=\"result-drawer\"]")),
    UI_TIMEOUT_MS
  );
  await driver.wait(until.elementIsVisible(drawer), UI_TIMEOUT_MS);

  await driver.wait(async () => {
    const items = await drawer.findElements(By.css(".result-item"));
    return items.length > 0;
  }, UI_TIMEOUT_MS);

  log("断言通过：result-drawer 已出现且包含至少 1 个 .result-item");

  log("发送 Escape，期望关闭抽屉并清空输入框…");
  await input.sendKeys(Key.ESCAPE);

  await driver.wait(async () => {
    const drawerEls = await driver.findElements(By.css("[aria-label=\"result-drawer\"]"));
    return drawerEls.length === 0;
  }, UI_TIMEOUT_MS);

  await driver.wait(async () => {
    const value = await input.getAttribute("value");
    return (value ?? "") === "";
  }, UI_TIMEOUT_MS);

  log("断言通过：抽屉已关闭，输入框已清空");
}

async function main() {
  const { log, flushToDisk } = createLogger();
  await ensureOutputDir();

  log("desktop-smoke 开始");

  if (process.platform !== "win32") {
    log("当前平台非 Windows，本脚本不支持。为避免误把 skip 当 pass，将以非 0 退出码失败。");
    await flushToDisk();
    process.exitCode = 1;
    return;
  }

  const tauriDriverProbe = runCommandProbe("tauri-driver");
  if (!tauriDriverProbe.ok) {
    log("未检测到可用的 tauri-driver。请先安装：");
    log(formatCommandFix("cargo install tauri-driver --locked"));
    await flushToDisk();
    process.exitCode = 1;
    return;
  }

  const edgeDriverPath = resolveEdgeDriverPath();
  if (!edgeDriverPath) {
    log("未检测到可用的 msedgedriver（Edge WebDriver）。请先安装并确保在 PATH 中可用：");
    log(formatCommandFix("pwsh -File scripts/e2e/install-msedgedriver.ps1"));
    log("若安装到自定义目录，可设置 ZAPCMD_E2E_WEBDRIVER_ROOT 指向该目录。");
    await flushToDisk();
    process.exitCode = 1;
    return;
  }
  log(`Edge WebDriver 路径：${edgeDriverPath}`);

  let appPath;
  try {
    appPath = resolveAppPath();
  } catch (error) {
    log(String(error instanceof Error ? error.message : error));
    await flushToDisk();
    process.exitCode = 1;
    return;
  }
  log(`应用路径：${appPath}`);

  let tauriDriverChild = null;
  let driver = null;
  let failed = false;

  try {
    const { child } = spawnTauriDriver({ log, nativeDriverPath: edgeDriverPath });
    tauriDriverChild = child;

    await waitForWebDriverReady({
      timeoutMs: DRIVER_READY_TIMEOUT_MS,
      logLine: `请查看 ${TAURI_DRIVER_LOG_PATH}`
    });
    log("tauri-driver 已就绪（/status 可用）");

    const capabilities = new Capabilities();
    capabilities.set("tauri:options", { application: appPath });
    capabilities.setBrowserName("wry");

    driver = await new Builder().withCapabilities(capabilities).usingServer(WEBDRIVER_SERVER_URL).build();
    log(`WebDriver session 已建立：server=${WEBDRIVER_SERVER_URL}`);

    await runSmokeCase(driver, { log });

    log("desktop-smoke 成功 ✅");
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
    log("desktop-smoke 失败 ❌");
    log(message);

    try {
      if (driver) {
        const b64 = await driver.takeScreenshot();
        await fs.promises.writeFile(SCREENSHOT_PATH, b64, "base64");
        log(`已保存截图：${SCREENSHOT_PATH}`);
      }
    } catch (screenshotError) {
      log(`保存截图失败：${String(screenshotError)}`);
    }

    const driverTail = await readFileTail(TAURI_DRIVER_LOG_PATH, 200);
    const extra = driverTail
      ? `=== tauri-driver.log (tail 200) ===\n${driverTail}\n=== end ===`
      : "（未读取到 tauri-driver.log tail）";
    await flushToDisk(extra);

    process.exitCode = 1;
  } finally {
    try {
      if (driver) {
        await driver.quit();
        log("WebDriver 已关闭");
      }
    } catch (quitError) {
      log(`关闭 WebDriver 失败：${String(quitError)}`);
      failed = true;
    }

    try {
      if (tauriDriverChild) {
        await killChildProcess(tauriDriverChild, { log });
      }
    } catch (killError) {
      log(`关闭 tauri-driver 失败：${String(killError)}`);
      failed = true;
    }

    if (!failed) {
      await flushToDisk();
    }
  }
}

void main();
