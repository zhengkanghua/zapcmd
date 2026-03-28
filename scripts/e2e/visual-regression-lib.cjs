/* eslint-disable no-console */
"use strict";

const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const VISUAL_MODES = Object.freeze({
  windowsEdge: "windows-edge",
  wslBridge: "wsl-windows-edge",
  linuxSmoke: "linux-chromium",
  controlledRunner: "controlled-runner",
  skip: "skip"
});

const DEFAULT_WINDOWS_EDGE_CANDIDATES = [
  "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe"
];

const DEFAULT_WINDOWS_PWSH_CANDIDATES = [
  "/mnt/c/Program Files/PowerShell/7/pwsh.exe",
  "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
];

const DEFAULT_LINUX_BROWSER_NAMES = ["chromium", "chromium-browser", "google-chrome", "microsoft-edge", "msedge"];

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isWslRuntime({ platform = process.platform, env = process.env } = {}) {
  if (platform !== "linux") {
    return false;
  }
  return Boolean(trimString(env.WSL_DISTRO_NAME) || trimString(env.WSL_INTEROP));
}

function resolveVisualMode({ platform = process.platform, env = process.env } = {}) {
  const forced = trimString(env.ZAPCMD_VISUAL_MODE);
  if (forced && Object.values(VISUAL_MODES).includes(forced)) {
    return forced;
  }
  if (platform === "win32") {
    return VISUAL_MODES.windowsEdge;
  }
  if (isWslRuntime({ platform, env })) {
    return VISUAL_MODES.wslBridge;
  }
  if (platform === "linux") {
    return VISUAL_MODES.linuxSmoke;
  }
  return VISUAL_MODES.skip;
}

function resolveBaselineDir({ rootDir, mode } = {}) {
  const baseRoot = rootDir || path.resolve("scripts/e2e/visual-baselines");
  if (mode === VISUAL_MODES.linuxSmoke) {
    return path.join(baseRoot, "linux-chromium");
  }
  return path.join(baseRoot, "controlled-runner");
}

function resolveOutputDir({ rootDir, mode } = {}) {
  const baseRoot = rootDir || path.resolve(".tmp/e2e/visual-regression");
  if (mode === VISUAL_MODES.linuxSmoke) {
    return path.join(baseRoot, "linux-chromium");
  }
  if (mode === VISUAL_MODES.controlledRunner) {
    return path.join(baseRoot, "controlled-runner");
  }
  if (mode === VISUAL_MODES.wslBridge) {
    return path.join(baseRoot, "windows-edge");
  }
  return baseRoot;
}

function resolveServerBinding({ mode, env = process.env, probeWslHost } = {}) {
  const overriddenHost = trimString(env.ZAPCMD_VISUAL_HOST);
  if (mode === VISUAL_MODES.wslBridge) {
    const urlHost = overriddenHost || (typeof probeWslHost === "function" ? trimString(probeWslHost()) : "");
    if (!urlHost) {
      throw new Error(
        [
          "未能探测到 WSL 可访问地址。",
          "请手动指定：",
          "  ZAPCMD_VISUAL_HOST=<wsl-ip> npm run test:visual:ui"
        ].join("\n")
      );
    }
    return {
      listenHost: "0.0.0.0",
      urlHost
    };
  }

  if (mode === VISUAL_MODES.linuxSmoke && overriddenHost) {
    return {
      listenHost: "0.0.0.0",
      urlHost: overriddenHost
    };
  }

  return {
    listenHost: "127.0.0.1",
    urlHost: overriddenHost || "127.0.0.1"
  };
}

function resolvePathForRuntime({ mode, targetPath, convertWslPath } = {}) {
  if (mode !== VISUAL_MODES.wslBridge) {
    return targetPath;
  }
  if (typeof convertWslPath !== "function") {
    throw new Error(`WSL 桥接模式缺少路径转换器：${targetPath}`);
  }
  return convertWslPath(targetPath);
}

function looksLikeWindowsPath(targetPath) {
  return /^[A-Za-z]:\\/.test(targetPath) || targetPath.startsWith("\\\\");
}

function defaultConvertWslPath(targetPath) {
  return trimString(childProcess.execFileSync("wslpath", ["-w", targetPath], { encoding: "utf8" }));
}

function defaultConvertWindowsPath(targetPath) {
  return trimString(childProcess.execFileSync("wslpath", ["-u", targetPath], { encoding: "utf8" }));
}

function normalizeWindowsRuntimePath(targetPath, { convertWslPath = defaultConvertWslPath } = {}) {
  const normalized = trimString(targetPath);
  if (!normalized) {
    return "";
  }
  if (looksLikeWindowsPath(normalized)) {
    return normalized;
  }
  return convertWslPath(normalized);
}

function normalizeWindowsCommandPath(targetPath, { convertWindowsPath = defaultConvertWindowsPath } = {}) {
  const normalized = trimString(targetPath);
  if (!normalized) {
    return "";
  }
  if (normalized.startsWith("/")) {
    return normalized;
  }
  if (looksLikeWindowsPath(normalized)) {
    return convertWindowsPath(normalized);
  }
  return normalized;
}

function resolveWindowsExecutablePath({
  envVarName,
  env = process.env,
  existsSync = fs.existsSync,
  candidates,
  convertWslPath = defaultConvertWslPath
}) {
  const overridden = trimString(env[envVarName]);
  if (overridden) {
    return normalizeWindowsRuntimePath(overridden, { convertWslPath });
  }

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return normalizeWindowsRuntimePath(candidate, { convertWslPath });
    }
  }

  return "";
}

function resolveWindowsCommandPath({
  envVarName,
  env = process.env,
  existsSync = fs.existsSync,
  candidates,
  convertWindowsPath = defaultConvertWindowsPath
}) {
  const overridden = trimString(env[envVarName]);
  if (overridden) {
    return normalizeWindowsCommandPath(overridden, { convertWindowsPath });
  }

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
}

function resolveWindowsEdgeCandidates({ platform = process.platform, env = process.env } = {}) {
  if (platform !== "win32") {
    return DEFAULT_WINDOWS_EDGE_CANDIDATES;
  }

  return [env["ProgramFiles(x86)"], env.ProgramFiles]
    .filter(Boolean)
    .map((baseDir) => path.join(baseDir, "Microsoft", "Edge", "Application", "msedge.exe"));
}

function resolveWindowsPwshCandidates({ platform = process.platform, env = process.env } = {}) {
  if (platform !== "win32") {
    return DEFAULT_WINDOWS_PWSH_CANDIDATES;
  }

  return [
    env.ProgramFiles ? path.join(env.ProgramFiles, "PowerShell", "7", "pwsh.exe") : "",
    env.SystemRoot ? path.join(env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : ""
  ].filter(Boolean);
}

function runCommandProbe(command) {
  try {
    const output = trimString(
      childProcess.execFileSync("bash", ["--noprofile", "--norc", "-lc", `command -v ${command} 2>/dev/null || true`], {
        encoding: "utf8"
      })
    );
    const lines = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.find((line) => line.startsWith("/") || looksLikeWindowsPath(line) || line.startsWith("\\\\")) || "";
  } catch {
    return "";
  }
}

function resolveLinuxBrowserPath({ env = process.env } = {}) {
  const overridden = trimString(env.ZAPCMD_LINUX_BROWSER_PATH);
  if (overridden) {
    return overridden;
  }

  for (const name of DEFAULT_LINUX_BROWSER_NAMES) {
    const resolved = runCommandProbe(name);
    if (resolved) {
      return resolved;
    }
  }

  return "";
}

function probeWslHostIp() {
  try {
    const output = childProcess.execFileSync("hostname", ["-I"], { encoding: "utf8" });
    const candidate = trimString(output).split(/\s+/).find(Boolean);
    return candidate || "";
  } catch {
    return "";
  }
}

function resolveDiffRuntime({ mode, env = process.env, existsSync = fs.existsSync } = {}) {
  if (mode === VISUAL_MODES.windowsEdge) {
    return { command: "pwsh", useWindowsPaths: false };
  }

  const localPwsh = trimString(env.ZAPCMD_PWSH_PATH) || runCommandProbe("pwsh");
  if (mode === VISUAL_MODES.controlledRunner) {
    if (localPwsh) {
      return { command: localPwsh, useWindowsPaths: false };
    }

    const windowsPwsh = resolveWindowsCommandPath({
      envVarName: "ZAPCMD_PWSH_PATH",
      env,
      existsSync,
      candidates: resolveWindowsPwshCandidates({ env })
    });

    return { command: windowsPwsh, useWindowsPaths: false };
  }

  if (localPwsh && mode === VISUAL_MODES.linuxSmoke) {
    return { command: localPwsh, useWindowsPaths: false };
  }

  const windowsPwsh = resolveWindowsCommandPath({
    envVarName: "ZAPCMD_PWSH_PATH",
    env,
    existsSync,
    candidates: resolveWindowsPwshCandidates({ env })
  });

  if (windowsPwsh) {
    return { command: windowsPwsh, useWindowsPaths: true };
  }

  return { command: "", useWindowsPaths: false };
}

function resolveBrowserRuntime({ mode, env = process.env, existsSync = fs.existsSync } = {}) {
  if (mode === VISUAL_MODES.controlledRunner) {
    return {
      command: trimString(env.ZAPCMD_VISUAL_RUNNER_BROWSER_PATH),
      name: "Controlled Chromium",
      expectedVersion: trimString(env.ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION),
      useWindowsPaths: false
    };
  }

  if (mode === VISUAL_MODES.wslBridge) {
    return {
      command: resolveWindowsCommandPath({
        envVarName: "ZAPCMD_EDGE_PATH",
        env,
        existsSync,
        candidates: resolveWindowsEdgeCandidates({ env })
      }),
      name: "Microsoft Edge",
      useWindowsPaths: true
    };
  }

  if (mode === VISUAL_MODES.linuxSmoke) {
    const browserCommand = resolveLinuxBrowserPath({ env });
    return {
      command: browserCommand,
      name: "Chromium",
      useWindowsPaths: false
    };
  }

  const browserCommand = resolveWindowsExecutablePath({
    envVarName: "ZAPCMD_EDGE_PATH",
    env,
    existsSync,
    candidates: resolveWindowsEdgeCandidates({ env })
  });

  return {
    command: mode === VISUAL_MODES.windowsEdge ? browserCommand || trimString(env.ZAPCMD_EDGE_PATH) : browserCommand,
    name: "Microsoft Edge",
    useWindowsPaths: mode === VISUAL_MODES.wslBridge
  };
}

module.exports = {
  VISUAL_MODES,
  isWslRuntime,
  normalizeWindowsRuntimePath,
  probeWslHostIp,
  resolveBaselineDir,
  resolveBrowserRuntime,
  resolveDiffRuntime,
  resolveLinuxBrowserPath,
  resolveOutputDir,
  resolvePathForRuntime,
  resolveServerBinding,
  resolveVisualMode,
  resolveWindowsEdgeCandidates,
  resolveWindowsPwshCandidates
};
