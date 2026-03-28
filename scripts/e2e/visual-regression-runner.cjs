/* eslint-disable no-console */
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

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

function createBrowserSpawnEnv(baseEnv = process.env) {
  return {
    ...baseEnv,
    EDGE_CRASHPAD_PIPE_NAME: "",
    CHROME_CRASHPAD_PIPE_NAME: ""
  };
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

function escapePowerShellSingleQuoted(value) {
  return typeof value === "string" ? value.replaceAll("'", "''") : "";
}

function looksLikeWindowsPath(targetPath) {
  return typeof targetPath === "string" && (/^[A-Za-z]:\\/.test(targetPath) || targetPath.startsWith("\\\\"));
}

function looksLikeWindowsExecutablePath(targetPath) {
  return (
    looksLikeWindowsPath(targetPath) ||
    (typeof targetPath === "string" && /^\/mnt\/[A-Za-z]\//.test(targetPath))
  );
}

function listWindowsBrowserProcessIds({
  browserCommand,
  cleanupQueryCommand,
  platform = process.platform,
  execFileSyncImpl = execFileSync
}) {
  const normalizedCleanupQueryCommand = typeof cleanupQueryCommand === "string" ? cleanupQueryCommand.trim() : "";
  const queryCommand = normalizedCleanupQueryCommand || (platform === "win32" ? "powershell.exe" : "");
  if (!queryCommand) {
    return [];
  }
  if (platform !== "win32" && !looksLikeWindowsExecutablePath(browserCommand)) {
    return [];
  }

  const processName = path.win32.basename(typeof browserCommand === "string" ? browserCommand : "").trim() || "msedge.exe";
  const escapedProcessName = escapePowerShellSingleQuoted(processName);
  const script =
    `$processName = [System.IO.Path]::GetFileNameWithoutExtension('${escapedProcessName}');` +
    " Get-Process -Name $processName -ErrorAction SilentlyContinue" +
    " | Select-Object -ExpandProperty Id";

  try {
    const output = String(
      execFileSyncImpl(queryCommand, ["-NoProfile", "-Command", script], {
        encoding: "utf8"
      })
    ).trim();

    if (!output) {
      return [];
    }

    return output
      .split(/\r?\n/)
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function listWindowsBrowserProcessIdsForCleanup({
  browserCommand,
  profileDir,
  cleanupQueryCommand,
  platform = process.platform,
  execFileSyncImpl = execFileSync
}) {
  const normalizedProfileDir = typeof profileDir === "string" ? profileDir.trim() : "";
  const normalizedCleanupQueryCommand = typeof cleanupQueryCommand === "string" ? cleanupQueryCommand.trim() : "";
  if (platform !== "win32" && normalizedProfileDir && !looksLikeWindowsPath(normalizedProfileDir)) {
    return [];
  }

  const queryCommand = normalizedCleanupQueryCommand || (platform === "win32" ? "powershell.exe" : "");
  if (!queryCommand) {
    return [];
  }

  const processName = path.win32.basename(typeof browserCommand === "string" ? browserCommand : "").trim() || "msedge.exe";
  const escapedProcessName = escapePowerShellSingleQuoted(processName);
  const escapedProfileDir = escapePowerShellSingleQuoted(normalizedProfileDir);
  const script =
    `$needle = '${escapedProfileDir}';` +
    ` Get-CimInstance Win32_Process -Filter \"name = '${escapedProcessName}'\"` +
    " | Where-Object { -not $needle -or ($_.CommandLine -and $_.CommandLine.Contains($needle)) }" +
    " | Select-Object -ExpandProperty ProcessId";

  try {
    const output = String(
      execFileSyncImpl(queryCommand, ["-NoProfile", "-Command", script], {
        encoding: "utf8"
      })
    ).trim();

    if (!output) {
      return [];
    }

    return output
      .split(/\r?\n/)
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function listWindowsDescendantBrowserProcessIds({
  browserCommand,
  rootPid,
  cleanupQueryCommand,
  platform = process.platform,
  execFileSyncImpl = execFileSync
}) {
  if (platform !== "win32" || !Number.isInteger(rootPid) || rootPid <= 0) {
    return [];
  }

  const normalizedCleanupQueryCommand = typeof cleanupQueryCommand === "string" ? cleanupQueryCommand.trim() : "";
  const queryCommand = normalizedCleanupQueryCommand || "powershell.exe";
  const processName = path.win32.basename(typeof browserCommand === "string" ? browserCommand : "").trim() || "msedge.exe";
  const escapedProcessName = escapePowerShellSingleQuoted(processName);
  const script =
    ` $rootPid = [int]${rootPid};` +
    ` $processes = @(Get-CimInstance Win32_Process -Filter \"name = '${escapedProcessName}'\" | Select-Object ProcessId, ParentProcessId);` +
    " $seen = New-Object 'System.Collections.Generic.HashSet[int]';" +
    " $queue = New-Object 'System.Collections.Generic.Queue[int]';" +
    " $queue.Enqueue($rootPid);" +
    " while ($queue.Count -gt 0) {" +
    "   $current = $queue.Dequeue();" +
    "   foreach ($process in $processes) {" +
    "     if ($process.ParentProcessId -eq $current -and $seen.Add([int]$process.ProcessId)) {" +
    "       $queue.Enqueue([int]$process.ProcessId);" +
    "     }" +
    "   }" +
    " }" +
    " $seen";

  try {
    const output = String(
      execFileSyncImpl(queryCommand, ["-NoProfile", "-Command", script], {
        encoding: "utf8"
      })
    ).trim();

    if (!output) {
      return [];
    }

    return output
      .split(/\r?\n/)
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
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
  cleanupQueryCommand,
  cleanupQueryPlatform = process.platform,
  cleanupQueryExecFileSyncImpl = execFileSync,
  listProcessIdsForCleanup = ({ browserCommand, profileDir }) =>
    listWindowsBrowserProcessIdsForCleanup({
      browserCommand,
      profileDir,
      cleanupQueryCommand,
      platform: cleanupQueryPlatform,
      execFileSyncImpl: cleanupQueryExecFileSyncImpl
    }),
  trackDescendantBrowserProcessTree = false,
  listTrackedProcessTreeIds = ({ browserCommand, rootPid }) =>
    listWindowsDescendantBrowserProcessIds({
      browserCommand,
      rootPid,
      cleanupQueryCommand,
      platform: cleanupQueryPlatform,
      execFileSyncImpl: cleanupQueryExecFileSyncImpl
    }),
  listAllBrowserProcessIds = ({ browserCommand }) =>
    listWindowsBrowserProcessIds({
      browserCommand,
      cleanupQueryCommand,
      platform: cleanupQueryPlatform,
      execFileSyncImpl: cleanupQueryExecFileSyncImpl
    }),
  processTreePollIntervalMs = 200,
  screenshotReadyPollIntervalMs = 100,
  postExitGracePeriodMs = 0,
  timeoutMs = 35_000
}) {
  return new Promise((resolve, reject) => {
    const args = buildBrowserArgs({ url, outPath, profileDir, width, height });
    const existingBrowserPidSet = new Set();
    const initialBrowserPidSnapshotPromise = Promise.resolve(listAllBrowserProcessIds({ browserCommand }))
      .then((existingPids) => {
        for (const pid of existingPids) {
          if (Number.isInteger(pid) && pid > 0) {
            existingBrowserPidSet.add(pid);
          }
        }
      })
      .catch((error) => {
        appendBrowserLog(logPath, `[cleanup-snapshot-error] ${String(error)}`);
      });

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
      env: createBrowserSpawnEnv(),
      windowsHide: true,
      stdio: "ignore"
    });

    let settled = false;
    let screenshotCleanupRequested = false;
    let cleanupInFlight = Promise.resolve();
    let trackedTreeQueryInFlight = Promise.resolve();
    let broadCleanupConsumed = false;
    const trackedTreePidSet = new Set();
    const terminatedPidSet = new Set();
    let processTreePoll = null;

    const clearRuntimeTimers = () => {
      clearTimeout(timeout);
      clearInterval(screenshotReadyPoll);
      if (processTreePoll) {
        clearInterval(processTreePoll);
      }
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

    const trackBrowserTreePids = () => {
      if (!trackDescendantBrowserProcessTree || !Number.isInteger(child.pid) || child.pid <= 0) {
        return Promise.resolve();
      }

      trackedTreeQueryInFlight = trackedTreeQueryInFlight
        .catch(() => {})
        .then(async () => {
          try {
            const trackedPids = await listTrackedProcessTreeIds({ browserCommand, rootPid: child.pid });
            for (const pid of trackedPids) {
              trackedTreePidSet.add(pid);
            }
          } catch (error) {
            appendBrowserLog(logPath, `[cleanup-tree-query-error] ${String(error)}`);
          }
        });

      return trackedTreeQueryInFlight;
    };

    const requestBrowserShutdown = (reason) => {
      const includeNewBrowserPids = !broadCleanupConsumed;
      broadCleanupConsumed = true;
      cleanupInFlight = cleanupInFlight
        .catch(() => {})
        .then(async () => {
          const cleanupPidSet = new Set();
          if (Number.isInteger(child.pid) && child.pid > 0) {
            cleanupPidSet.add(child.pid);
          }

          try {
            await initialBrowserPidSnapshotPromise;
            await trackBrowserTreePids();

            const matchedPids = await listProcessIdsForCleanup({ browserCommand, profileDir });
            for (const pid of matchedPids) {
              cleanupPidSet.add(pid);
            }

            for (const pid of trackedTreePidSet) {
              cleanupPidSet.add(pid);
            }

            // Only the first cleanup pass may use the broad "new browser pid" heuristic.
            // Later passes are restricted to the current child/profile to avoid killing unrelated Edge windows.
            if (includeNewBrowserPids) {
              const currentBrowserPids = await listAllBrowserProcessIds({ browserCommand });
              for (const pid of currentBrowserPids) {
                if (!existingBrowserPidSet.has(pid)) {
                  cleanupPidSet.add(pid);
                }
              }
            }
          } catch (error) {
            appendBrowserLog(logPath, `[cleanup-query-error] ${String(error)}`);
          }

          const pendingPids = [...cleanupPidSet].filter((pid) => !terminatedPidSet.has(pid));
          appendBrowserLog(logPath, `[cleanup] reason=${reason} pids=${pendingPids.length > 0 ? pendingPids.join(",") : "(none)"}`);

          const prioritizedPids = pendingPids.filter((pid) => pid === child.pid);
          const remainingPids = pendingPids.filter((pid) => pid !== child.pid);

          for (const pid of prioritizedPids) {
            try {
              await terminateProcessTree(pid);
              terminatedPidSet.add(pid);
            } catch (error) {
              appendBrowserLog(logPath, `[cleanup-error] pid=${pid} ${String(error)}`);
            }
          }

          await Promise.all(
            remainingPids.map(async (pid) => {
              try {
                await terminateProcessTree(pid);
                terminatedPidSet.add(pid);
              } catch (error) {
                appendBrowserLog(logPath, `[cleanup-error] pid=${pid} ${String(error)}`);
              }
            })
          );
        });

      return cleanupInFlight;
    };

    if (trackDescendantBrowserProcessTree) {
      void trackBrowserTreePids();
      processTreePoll = setInterval(() => {
        void trackBrowserTreePids();
      }, processTreePollIntervalMs);
    }

    const screenshotReadyPoll = setInterval(() => {
      if (screenshotCleanupRequested || !fs.existsSync(outPath)) {
        return;
      }
      screenshotCleanupRequested = true;
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
        void (async () => {
          clearRuntimeTimers();
          if (!fs.existsSync(outPath) && code === 0) {
            await waitForFile(outPath, {
              timeoutMs: Math.min(2_000, timeoutMs),
              intervalMs: Math.min(screenshotReadyPollIntervalMs, 50)
            });
          }
          if (fs.existsSync(outPath)) {
            await requestBrowserShutdown("post-exit");
            if (postExitGracePeriodMs > 0) {
              await sleep(postExitGracePeriodMs);
              await requestBrowserShutdown("post-exit-grace");
            }
          }
          settle("resolve");
        })();
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
  listWindowsBrowserProcessIds,
  listWindowsBrowserProcessIdsForCleanup,
  runBrowserScreenshot,
  terminateProcessTreeByPid,
  waitForFile
};
