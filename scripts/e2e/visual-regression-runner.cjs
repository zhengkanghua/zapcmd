/* eslint-disable no-console */
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

function nowIso() {
  return new Date().toISOString();
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFile(filePath, { timeoutMs, intervalMs }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      return;
    }
    await sleep(intervalMs);
  }
}

function createStaticServer(rootDir) {
  return http.createServer((req, res) => {
    const urlPath = (req.url || "/").split("?")[0] || "/";
    const normalized = decodeURIComponent(urlPath).replaceAll("\\", "/");
    const targetPath = normalized === "/" ? "/index.html" : normalized;
    const absPath = path.resolve(rootDir, `.${targetPath}`);
    if (!absPath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(absPath).toLowerCase();
    const contentType = (() => {
      if (ext === ".html") return "text/html; charset=utf-8";
      if (ext === ".js") return "application/javascript; charset=utf-8";
      if (ext === ".css") return "text/css; charset=utf-8";
      if (ext === ".json") return "application/json; charset=utf-8";
      if (ext === ".svg") return "image/svg+xml";
      if (ext === ".png") return "image/png";
      if (ext === ".woff2") return "font/woff2";
      return "application/octet-stream";
    })();

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(absPath).pipe(res);
  });
}

function buildBrowserArgs({ url, outPath, profileDir, width, height }) {
  return [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${width},${height}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-component-update",
    "--disable-sync",
    "--metrics-recording-only",
    "--disable-features=Translate",
    "--no-service-autorun",
    "--noerrdialogs",
    "--disable-popup-blocking",
    "--disable-notifications",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    `--user-data-dir=${profileDir}`,
    "--virtual-time-budget=2500",
    "--run-all-compositor-stages-before-draw",
    `--screenshot=${outPath}`,
    url
  ];
}

function writeBrowserSpawnLog({
  browserLabel,
  browserCommand,
  url,
  outPath,
  profileDir,
  width,
  height,
  args,
  logPath,
  environmentManifestPath
}) {
  fs.writeFileSync(
    logPath,
    [
      `[visual-regression] ${nowIso()} spawn ${browserLabel}`,
      `browserCommand=${browserCommand}`,
      `url=${url}`,
      `outPath=${outPath}`,
      `profileDir=${profileDir}`,
      `width=${width}`,
      `height=${height}`,
      `environmentManifestPath=${environmentManifestPath || ""}`,
      `args=${args.join(" ")}`,
      "",
      "NOTE: 当前脚本不捕获 stdout/stderr，避免在受限环境下触发 spawn 兼容问题。"
    ].join("\n"),
    "utf8"
  );
}

function appendBrowserLog(logPath, line) {
  try {
    fs.appendFileSync(logPath, `${line}\n`, "utf8");
  } catch {}
}

function terminateProcessTreeByPid(pid, { platform = process.platform, spawnImpl = spawn } = {}) {
  return new Promise((resolve) => {
    if (!Number.isInteger(pid) || pid <= 0) {
      resolve();
      return;
    }

    if (platform === "win32") {
      const killer = spawnImpl("taskkill", ["/PID", String(pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore"
      });

      killer.on("error", () => resolve());
      killer.on("exit", () => resolve());
      return;
    }

    try {
      process.kill(pid, "SIGKILL");
    } catch {}
    resolve();
  });
}

function runBrowserScreenshot({
  browserCommand,
  browserLabel,
  url,
  outPath,
  profileDir,
  width,
  height,
  logPath,
  environmentManifestPath,
  spawnImpl = spawn,
  terminateProcessTree = (pid) => terminateProcessTreeByPid(pid, { spawnImpl }),
  screenshotReadyPollIntervalMs = 100,
  timeoutMs = 35_000
}) {
  return new Promise((resolve, reject) => {
    const args = buildBrowserArgs({ url, outPath, profileDir, width, height });
    writeBrowserSpawnLog({
      browserLabel,
      browserCommand,
      url,
      outPath,
      profileDir,
      width,
      height,
      args,
      logPath,
      environmentManifestPath
    });

    const child = spawnImpl(browserCommand, args, {
      windowsHide: true,
      stdio: "ignore"
    });

    let settled = false;
    let shutdownRequested = false;

    const clearRuntimeTimers = () => {
      clearTimeout(timeout);
      clearInterval(screenshotReadyPoll);
    };

    const settle = (action, value) => {
      if (settled) {
        return;
      }
      settled = true;
      clearRuntimeTimers();
      if (action === "resolve") {
        resolve(value);
        return;
      }
      reject(value);
    };

    const requestBrowserShutdown = async (reason) => {
      if (shutdownRequested || !Number.isInteger(child.pid) || child.pid <= 0) {
        return;
      }
      shutdownRequested = true;
      appendBrowserLog(logPath, `[cleanup] reason=${reason} pid=${child.pid}`);
      try {
        await terminateProcessTree(child.pid);
      } catch (error) {
        appendBrowserLog(logPath, `[cleanup-error] ${String(error)}`);
      }
    };

    const screenshotReadyPoll = setInterval(() => {
      if (!fs.existsSync(outPath)) {
        return;
      }
      void requestBrowserShutdown("screenshot-ready");
    }, screenshotReadyPollIntervalMs);

    const timeout = setTimeout(() => {
      void requestBrowserShutdown("timeout");
      settle("reject", new Error(`${browserLabel} 截图超时（>${Math.floor(timeoutMs / 1000)}s）：${url}`));
    }, timeoutMs);

    child.on("error", (error) => {
      appendBrowserLog(logPath, `[error] ${String(error)}`);
      settle("reject", error);
    });

    child.on("exit", (code, signal) => {
      appendBrowserLog(logPath, `[exit] code=${code ?? "null"} signal=${signal ?? "null"}`);
      if (fs.existsSync(outPath) || code === 0) {
        settle("resolve");
        return;
      }
      settle("reject", new Error(`${browserLabel} 截图失败：code=${code ?? "null"} signal=${signal ?? "null"}`));
    });
  });
}

function buildVisualDiffArgs({ scriptPath, baselinePath, actualPath, runtimeOutJsonPath, maxDiffRatio, pixelTolerance, sampleStep }) {
  return [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-BaselinePath",
    baselinePath,
    "-ActualPath",
    actualPath,
    "-MaxDiffRatio",
    String(maxDiffRatio),
    "-PixelTolerance",
    String(pixelTolerance),
    "-SampleStep",
    String(sampleStep),
    "-OutPath",
    runtimeOutJsonPath
  ];
}

function runVisualDiff({
  command,
  scriptPath,
  baselinePath,
  actualPath,
  runtimeOutJsonPath,
  nativeOutJsonPath,
  maxDiffRatio,
  pixelTolerance,
  sampleStep
}) {
  return new Promise((resolve, reject) => {
    const args = buildVisualDiffArgs({
      scriptPath,
      baselinePath,
      actualPath,
      runtimeOutJsonPath,
      maxDiffRatio,
      pixelTolerance,
      sampleStep
    });

    if (fs.existsSync(nativeOutJsonPath)) {
      fs.rmSync(nativeOutJsonPath, { force: true });
    }

    const child = spawn(command, args, {
      windowsHide: true,
      stdio: "ignore"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (!fs.existsSync(nativeOutJsonPath)) {
        reject(new Error(`visual-diff 未生成输出：${runtimeOutJsonPath}（code=${code ?? "null"}）`));
        return;
      }

      const trimmed = fs.readFileSync(nativeOutJsonPath, "utf8").trim();
      if (!trimmed) {
        reject(new Error(`visual-diff 输出为空：${runtimeOutJsonPath}（code=${code ?? "null"}）`));
        return;
      }

      try {
        resolve({ code: code ?? 1, payload: JSON.parse(trimmed) });
      } catch (error) {
        reject(new Error(`visual-diff JSON 解析失败：${String(error)}\nfile: ${runtimeOutJsonPath}\ncontent: ${trimmed}`));
      }
    });
  });
}

async function compareAgainstBaseline({
  mode,
  actualPath,
  baselinePath,
  diffCommand,
  diffOutJsonPath,
  diffScriptPath,
  maxDiffRatio,
  pixelTolerance,
  sampleStep,
  resolveDiffPath
}) {
  if (!fs.existsSync(baselinePath)) {
    const updateCommand =
      mode === "controlled-runner" ? "npm run test:visual:ui:update:runner" : "node scripts/e2e/visual-regression.cjs --update";

    throw new Error(
      [
        `缺少视觉回归 baseline：${baselinePath}`,
        "请先生成并提交 baseline：",
        `  ${updateCommand}`
      ].join("\n")
    );
  }

  const actual = fs.readFileSync(actualPath);
  const baseline = fs.readFileSync(baselinePath);
  const diff = await runVisualDiff({
    command: diffCommand,
    scriptPath: resolveDiffPath(diffScriptPath),
    baselinePath: resolveDiffPath(baselinePath),
    actualPath: resolveDiffPath(actualPath),
    runtimeOutJsonPath: resolveDiffPath(diffOutJsonPath),
    nativeOutJsonPath: diffOutJsonPath,
    maxDiffRatio,
    pixelTolerance,
    sampleStep
  });

  return {
    ok: diff.code === 0 && diff.payload?.ok === true,
    baselineHash: sha256(baseline),
    actualHash: sha256(actual),
    diff
  };
}

module.exports = {
  compareAgainstBaseline,
  createStaticServer,
  ensureDir,
  runBrowserScreenshot,
  waitForFile
};
