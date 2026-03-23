/* eslint-disable no-console */
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const DIST_DIR = path.resolve("dist");
const VISUAL_ENTRY_DIST_PATH = path.join(DIST_DIR, "visual.html");
const BASELINE_DIR = path.resolve("scripts/e2e/visual-baselines");
const OUTPUT_DIR = path.resolve(".tmp/e2e/visual-regression");

const UPDATE_BASELINE = process.argv.includes("--update");

const SCREENSHOTS = [
  {
    id: "settings-ui-overview",
    hash: "settings-ui-overview",
    width: 1100,
    height: 900,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  },
  {
    id: "settings-ui-dropdown-open",
    hash: "settings-ui-dropdown-open",
    width: 1100,
    height: 900,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  },
  {
    id: "settings-ui-slider",
    hash: "settings-ui-slider",
    width: 1100,
    height: 900,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  }
];

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

function resolveEdgePath() {
  const overridden = (process.env.ZAPCMD_EDGE_PATH || "").trim();
  if (overridden && fs.existsSync(overridden)) {
    return overridden;
  }

  const candidates = [];
  const pf = process.env.ProgramFiles || "";
  const pf86 = process.env["ProgramFiles(x86)"] || "";

  if (pf86) {
    candidates.push(path.join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"));
  }
  if (pf) {
    candidates.push(path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"));
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
}

function createStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
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

  return server;
}

function runEdgeScreenshot({ edgePath, url, outPath, profileDir, width, height, logPath }) {
  return new Promise((resolve, reject) => {
    const args = [
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

    fs.writeFileSync(
      logPath,
      [
        `[visual-regression] ${nowIso()} spawn Edge`,
        `edgePath=${edgePath}`,
        `url=${url}`,
        `outPath=${outPath}`,
        `profileDir=${profileDir}`,
        `width=${width}`,
        `height=${height}`,
        `args=${args.join(" ")}`,
        "",
        "NOTE: 当前脚本不捕获 stdout/stderr（避免在受限环境下使用 stdio=pipe 触发 spawn EPERM）。"
      ].join("\n"),
      "utf8"
    );

    const child = spawn(edgePath, args, {
      windowsHide: true,
      // 受限环境下 stdio=pipe 可能导致 spawn EPERM；这里用 ignore 保证可执行性。
      stdio: "ignore"
    });

    const timeout = setTimeout(() => {
      try {
        child.kill();
      } catch {}
      reject(new Error(`Edge 截图超时（>35s）：${url}`));
    }, 35_000);

    child.on("error", (error) => {
      clearTimeout(timeout);
      try {
        fs.appendFileSync(logPath, `\n[error] ${String(error)}\n`, "utf8");
      } catch {}
      reject(error);
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      try {
        fs.appendFileSync(logPath, `\n[exit] code=${code ?? "null"} signal=${signal ?? "null"}\n`, "utf8");
      } catch {}
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Edge 截图失败：code=${code ?? "null"} signal=${signal ?? "null"}`));
    });
  });
}

function runVisualDiff({ baselinePath, actualPath, maxDiffRatio, pixelTolerance, sampleStep }) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve("scripts/e2e/visual-diff.ps1");
    const outJsonPath = path.join(OUTPUT_DIR, `${path.basename(actualPath)}.diff.json`);
    const args = [
      "-NoProfile",
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
      outJsonPath
    ];

    if (fs.existsSync(outJsonPath)) {
      fs.rmSync(outJsonPath, { force: true });
    }

    const child = spawn("pwsh", args, {
      windowsHide: true,
      // 受限环境下 stdio=pipe 可能导致 spawn EPERM；这里让脚本写文件，再由 Node 读取。
      stdio: "ignore"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (!fs.existsSync(outJsonPath)) {
        reject(new Error(`visual-diff 未生成输出：${outJsonPath}（code=${code ?? "null"}）`));
        return;
      }

      const trimmed = fs.readFileSync(outJsonPath, "utf8").trim();
      if (!trimmed) {
        reject(new Error(`visual-diff 输出为空：${outJsonPath}（code=${code ?? "null"}）`));
        return;
      }

      try {
        resolve({ code: code ?? 1, payload: JSON.parse(trimmed) });
      } catch (error) {
        reject(new Error(`visual-diff JSON 解析失败：${String(error)}\nfile: ${outJsonPath}\ncontent: ${trimmed}`));
      }
    });
  });
}

async function compareAgainstBaseline({ id, actualPath, maxDiffRatio, pixelTolerance, sampleStep }) {
  const baselinePath = path.join(BASELINE_DIR, `${id}.png`);
  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      [
        `缺少视觉回归 baseline：${baselinePath}`,
        "请先生成并提交 baseline：",
        "  node scripts/e2e/visual-regression.cjs --update"
      ].join("\n")
    );
  }

  const actual = fs.readFileSync(actualPath);
  const baseline = fs.readFileSync(baselinePath);

  const diff = await runVisualDiff({
    baselinePath,
    actualPath,
    maxDiffRatio,
    pixelTolerance,
    sampleStep
  });

  const ok = diff.code === 0 && diff.payload?.ok === true;
  return {
    ok,
    baselinePath,
    baselineHash: sha256(baseline),
    actualHash: sha256(actual),
    diff
  };
}

async function main() {
  if (process.platform !== "win32") {
    console.log("[visual-regression] 当前仅在 Windows 上启用截图级门禁；已跳过。");
    return;
  }

  if (!fs.existsSync(VISUAL_ENTRY_DIST_PATH)) {
    throw new Error(
      [
        `未找到构建产物：${VISUAL_ENTRY_DIST_PATH}`,
        "请先运行：",
        "  npm run build",
        "再执行视觉回归脚本。"
      ].join("\n")
    );
  }

  const edgePath = resolveEdgePath();
  if (!edgePath) {
    throw new Error(
      [
        "未找到 Microsoft Edge (msedge.exe)。",
        "你可以通过环境变量显式指定：",
        "  ZAPCMD_EDGE_PATH=C:\\\\...\\\\msedge.exe node scripts/e2e/visual-regression.cjs"
      ].join("\n")
    );
  }

  ensureDir(BASELINE_DIR);
  ensureDir(OUTPUT_DIR);

  const server = createStaticServer(DIST_DIR);
  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
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
      const url = `http://127.0.0.1:${port}/visual.html#${shot.hash}`;
      const actualPath = path.join(OUTPUT_DIR, `${shot.id}.actual.png`);
      const baselinePath = path.join(BASELINE_DIR, `${shot.id}.png`);
      const profileDir = path.join(OUTPUT_DIR, `profile-${shot.id}`);
      const logPath = path.join(OUTPUT_DIR, `edge-${shot.id}.log`);

      ensureDir(profileDir);
      if (fs.existsSync(actualPath)) {
        fs.rmSync(actualPath, { force: true });
      }

      console.log(`[visual-regression] [${nowIso()}] capture ${shot.id}`);
      await runEdgeScreenshot({
        edgePath,
        url,
        outPath: actualPath,
        profileDir,
        width: shot.width,
        height: shot.height,
        logPath
      });

      await waitForFile(actualPath, { timeoutMs: 2_000, intervalMs: 100 });
      if (!fs.existsSync(actualPath)) {
        throw new Error(`截图未生成：${actualPath}\n请查看日志：${logPath}`);
      }

      if (UPDATE_BASELINE) {
        fs.copyFileSync(actualPath, baselinePath);
        console.log(`[visual-regression] updated baseline: ${baselinePath}`);
        continue;
      }

      const result = await compareAgainstBaseline({
        id: shot.id,
        actualPath,
        maxDiffRatio: shot.maxDiffRatio,
        pixelTolerance: shot.pixelTolerance,
        sampleStep: shot.sampleStep
      });
      if (!result.ok) {
        const exportedBaseline = path.join(OUTPUT_DIR, `${shot.id}.baseline.png`);
        try {
          fs.copyFileSync(result.baselinePath, exportedBaseline);
        } catch {}
        failures.push(
          [
            `❌ ${shot.id} mismatch`,
            `- baseline: ${result.baselinePath} (${result.baselineHash})`,
            `- actual:   ${actualPath} (${result.actualHash})`,
            `- diff:     ${JSON.stringify(result.diff.payload)}`,
            `- logs:     ${logPath}`
          ].join("\n")
        );
      } else {
        console.log(`[visual-regression] ✅ ${shot.id}`);
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
