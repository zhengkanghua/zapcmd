"use strict";

const childProcess = require("node:child_process");

const { VISUAL_MODES } = require("./visual-regression-lib.cjs");

const KEY_FONTS = Object.freeze([
  "Segoe UI",
  "Segoe UI Variable",
  "Consolas",
  "Fira Code",
  "JetBrains Mono",
  "Noto Sans"
]);

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function runTextCommand({ command, args = [], execFileSync = childProcess.execFileSync }) {
  if (!trimString(command)) {
    return "";
  }

  try {
    return trimString(execFileSync(command, args, { encoding: "utf8" }));
  } catch {
    return "";
  }
}

function parseJson(text, fallback) {
  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function buildPowerShellArgs(script) {
  return ["-NoProfile", "-Command", script];
}

function createEmptyFontManifest() {
  return Object.fromEntries(
    KEY_FONTS.map((fontName) => [fontName, { installed: false, value: "" }])
  );
}

function normalizeFontManifest(payload) {
  const fallback = createEmptyFontManifest();
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  for (const fontName of KEY_FONTS) {
    const candidate = payload[fontName];
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    fallback[fontName] = {
      installed: Boolean(candidate.installed),
      value: trimString(candidate.value)
    };
  }

  return fallback;
}

function resolveGitHead({ execFileSync }) {
  return runTextCommand({
    command: "git",
    args: ["rev-parse", "--short", "HEAD"],
    execFileSync
  });
}

function probeBrowser(browserRuntime, { execFileSync }) {
  return {
    name: trimString(browserRuntime?.name),
    command: trimString(browserRuntime?.command),
    version: runTextCommand({
      command: browserRuntime?.command,
      args: ["--version"],
      execFileSync
    })
  };
}

function probeDiffRuntime(diffRuntime, { execFileSync }) {
  return {
    name: trimString(diffRuntime?.name) || "PowerShell",
    command: trimString(diffRuntime?.command),
    version: runTextCommand({
      command: diffRuntime?.command,
      args: buildPowerShellArgs("$PSVersionTable.PSVersion.ToString()"),
      execFileSync
    })
  };
}

function probeWindowsSystem(diffCommand, { execFileSync }) {
  const payload = parseJson(
    runTextCommand({
      command: diffCommand,
      args: buildPowerShellArgs(
        "Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber, OsHardwareAbstractionLayer | ConvertTo-Json -Compress"
      ),
      execFileSync
    }),
    {}
  );

  return {
    platform: "windows",
    WindowsProductName: trimString(payload.WindowsProductName),
    WindowsVersion: trimString(payload.WindowsVersion),
    OsBuildNumber: trimString(payload.OsBuildNumber),
    OsHardwareAbstractionLayer: trimString(payload.OsHardwareAbstractionLayer)
  };
}

function probeLinuxSystem({ execFileSync }) {
  return {
    platform: "linux",
    kernel: runTextCommand({
      command: "uname",
      args: ["-sr"],
      execFileSync
    })
  };
}

function probeSystemInfo(runtime, { execFileSync }) {
  if (runtime.mode === VISUAL_MODES.linuxSmoke) {
    return probeLinuxSystem({ execFileSync });
  }

  return probeWindowsSystem(runtime.diffRuntime?.command, { execFileSync });
}

function probeWindowsFonts(diffCommand, { execFileSync }) {
  const payload = parseJson(
    runTextCommand({
      command: diffCommand,
      args: buildPowerShellArgs(
        [
          "$fontProps = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts'",
          "$fontMap = [ordered]@{",
          "  'Segoe UI' = 'Segoe UI (TrueType)'",
          "  'Segoe UI Variable' = 'Segoe UI Variable (TrueType)'",
          "  'Consolas' = 'Consolas (TrueType)'",
          "  'Fira Code' = 'Fira Code (TrueType)'",
          "  'JetBrains Mono' = 'JetBrains Mono (TrueType)'",
          "  'Noto Sans' = 'Noto Sans (TrueType)'",
          "}",
          "$result = [ordered]@{}",
          "foreach ($entry in $fontMap.GetEnumerator()) {",
          "  $registryKey = $entry.Value",
          "  $raw = ''",
          "  if ($fontProps.PSObject.Properties.Name -contains $registryKey) {",
          "    $raw = [string]$fontProps.PSObject.Properties[$registryKey].Value",
          "  }",
          "  $result[$entry.Key] = @{ installed = [bool]$raw; value = $raw }",
          "}",
          "$result | ConvertTo-Json -Compress -Depth 4"
        ].join("; ")
      ),
      execFileSync
    }),
    {}
  );

  return normalizeFontManifest(payload);
}

function probeLinuxFonts({ execFileSync }) {
  const output = runTextCommand({
    command: "fc-list",
    args: [":", "family"],
    execFileSync
  }).toLowerCase();

  const fallback = createEmptyFontManifest();
  for (const fontName of KEY_FONTS) {
    if (output.includes(fontName.toLowerCase())) {
      fallback[fontName] = {
        installed: true,
        value: fontName
      };
    }
  }

  return fallback;
}

function probeKeyFonts(runtime, { execFileSync }) {
  if (runtime.mode === VISUAL_MODES.linuxSmoke) {
    return probeLinuxFonts({ execFileSync });
  }

  return probeWindowsFonts(runtime.diffRuntime?.command, { execFileSync });
}

/**
 * 收集视觉回归当前运行环境的关键事实，写入 artifact 后可用于跨设备 diff 诊断。
 * 该探针必须是 best-effort：即使个别命令失败，也不能阻断截图主流程。
 */
function collectVisualEnvironment(runtime, { execFileSync = childProcess.execFileSync, now = () => new Date().toISOString() } = {}) {
  return {
    capturedAt: now(),
    gitHead: resolveGitHead({ execFileSync }),
    mode: runtime.mode,
    browser: probeBrowser(runtime.browserRuntime, { execFileSync }),
    diffRuntime: probeDiffRuntime(runtime.diffRuntime, { execFileSync }),
    system: probeSystemInfo(runtime, { execFileSync }),
    fonts: probeKeyFonts(runtime, { execFileSync }),
    baselineDir: runtime.baselineDir,
    outputDir: runtime.outputDir,
    serverBinding: runtime.serverBinding
  };
}

module.exports = {
  KEY_FONTS,
  collectVisualEnvironment
};
