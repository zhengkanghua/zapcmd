import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const { collectVisualEnvironment } = require("../e2e/visual-regression-env.cjs");

type ExecFileSync = (command: string, args?: string[], options?: { encoding?: string }) => string;
type SpawnSync = (
  command: string,
  args?: string[],
  options?: { encoding?: string; windowsHide?: boolean }
) => { status: number | null; stdout?: string; stderr?: string; error?: Error };

function createExecFileSyncStub(): ExecFileSync {
  return (command, args = []) => {
    const joinedArgs = args.join(" ");

    if (command === "git" && joinedArgs === "rev-parse --short HEAD") {
      return "261af33\n";
    }

    if (command === "C:\\Edge\\msedge.exe" && joinedArgs === "--version") {
      return "Microsoft Edge 134.0.3124.68\n";
    }

    if (command === "pwsh" && joinedArgs.includes("$PSVersionTable.PSVersion.ToString()")) {
      return "7.5.0\n";
    }

    if (command === "pwsh" && joinedArgs.includes("WindowsProductName")) {
      return '{"platform":"windows","WindowsProductName":"Windows 10 Pro","WindowsVersion":"2009","OsBuildNumber":"19045"}';
    }

    if (command === "pwsh" && joinedArgs.includes("Segoe UI (TrueType)")) {
      return '{"Segoe UI":{"installed":true,"value":"segoeui.ttf"},"Segoe UI Variable":{"installed":false,"value":""},"Consolas":{"installed":true,"value":"consola.ttf"},"Fira Code":{"installed":false,"value":""},"JetBrains Mono":{"installed":false,"value":""},"Noto Sans":{"installed":false,"value":""}}';
    }

    throw new Error(`Unexpected command: ${command} ${joinedArgs}`);
  };
}

describe("visual-regression-env", () => {
  it("collects a Windows visual environment manifest with browser, system and font facts", () => {
    const manifest = collectVisualEnvironment(
      {
        mode: "windows-edge",
        browserRuntime: {
          name: "Microsoft Edge",
          command: "C:\\Edge\\msedge.exe",
          useWindowsPaths: false
        },
        diffRuntime: {
          name: "PowerShell",
          command: "pwsh",
          useWindowsPaths: false
        },
        baselineDir: "scripts/e2e/visual-baselines",
        outputDir: ".tmp/e2e/visual-regression",
        serverBinding: {
          listenHost: "127.0.0.1",
          urlHost: "127.0.0.1"
        }
      },
      {
        execFileSync: createExecFileSyncStub(),
        now: () => "2026-03-28T10:00:00.000Z"
      }
    );

    expect(manifest.capturedAt).toBe("2026-03-28T10:00:00.000Z");
    expect(manifest.gitHead).toBe("261af33");
    expect(manifest.mode).toBe("windows-edge");
    expect(manifest.browser).toEqual({
      name: "Microsoft Edge",
      command: "C:\\Edge\\msedge.exe",
      version: "Microsoft Edge 134.0.3124.68"
    });
    expect(manifest.diffRuntime).toEqual({
      name: "PowerShell",
      command: "pwsh",
      version: "7.5.0"
    });
    expect(manifest.system).toMatchObject({
      platform: "windows",
      WindowsProductName: "Windows 10 Pro",
      WindowsVersion: "2009",
      OsBuildNumber: "19045"
    });
    expect(manifest.fonts["Segoe UI"]).toEqual({
      installed: true,
      value: "segoeui.ttf"
    });
    expect(manifest.fonts["Segoe UI Variable"]).toEqual({
      installed: false,
      value: ""
    });
    expect(manifest.baselineDir).toBe("scripts/e2e/visual-baselines");
    expect(manifest.outputDir).toBe(".tmp/e2e/visual-regression");
    expect(manifest.serverBinding).toEqual({
      listenHost: "127.0.0.1",
      urlHost: "127.0.0.1"
    });
  });

  it("collects Linux smoke font facts from fc-list without PowerShell-only probes", () => {
    const execFileSync: ExecFileSync = (command, args = []) => {
      const joinedArgs = args.join(" ");

      if (command === "git" && joinedArgs === "rev-parse --short HEAD") {
        return "261af33\n";
      }

      if (command === "/usr/bin/chromium" && joinedArgs === "--version") {
        return "Chromium 136.0.0.0\n";
      }

      if (command === "pwsh" && joinedArgs.includes("$PSVersionTable.PSVersion.ToString()")) {
        return "7.5.0\n";
      }

      if (command === "uname" && joinedArgs === "-sr") {
        return "Linux 6.8.0\n";
      }

      if (command === "fc-list" && joinedArgs === ": family") {
        return "Segoe UI\nConsolas\n";
      }

      throw new Error(`Unexpected command: ${command} ${joinedArgs}`);
    };

    const manifest = collectVisualEnvironment(
      {
        mode: "linux-chromium",
        browserRuntime: {
          name: "Chromium",
          command: "/usr/bin/chromium",
          useWindowsPaths: false
        },
        diffRuntime: {
          name: "PowerShell",
          command: "pwsh",
          useWindowsPaths: false
        },
        baselineDir: "scripts/e2e/visual-baselines/linux-chromium",
        outputDir: ".tmp/e2e/visual-regression/linux-chromium",
        serverBinding: {
          listenHost: "127.0.0.1",
          urlHost: "127.0.0.1"
        }
      },
      {
        execFileSync,
        now: () => "2026-03-28T10:05:00.000Z"
      }
    );

    expect(manifest.mode).toBe("linux-chromium");
    expect(manifest.system).toEqual({
      platform: "linux",
      kernel: "Linux 6.8.0"
    });
    expect(manifest.fonts["Segoe UI"]).toEqual({
      installed: true,
      value: "Segoe UI"
    });
    expect(manifest.fonts["Noto Sans"]).toEqual({
      installed: false,
      value: ""
    });
  });

  it("builds a Windows font probe script without invalid hashtable syntax", () => {
    const execFileSync: ExecFileSync = (command, args = []) => {
      const joinedArgs = args.join(" ");

      if (command === "git" && joinedArgs === "rev-parse --short HEAD") {
        return "c59ed05\n";
      }

      if (command === "C:\\Edge\\msedge.exe" && joinedArgs === "--version") {
        return "Microsoft Edge 134.0.3124.68\n";
      }

      if (command === "pwsh" && joinedArgs.includes("$PSVersionTable.PSVersion.ToString()")) {
        return "7.5.5\n";
      }

      if (command === "pwsh" && joinedArgs.includes("WindowsProductName")) {
        return '{"platform":"windows","WindowsProductName":"Windows 10 Pro","WindowsVersion":"2009","OsBuildNumber":"19045"}';
      }

      if (command === "pwsh" && joinedArgs.includes("Segoe UI (TrueType)")) {
        expect(joinedArgs).not.toContain("@{;");
        return '{"Segoe UI":{"installed":true,"value":"segoeui.ttf"},"Segoe UI Variable":{"installed":false,"value":""},"Consolas":{"installed":true,"value":"consola.ttf"},"Fira Code":{"installed":false,"value":""},"JetBrains Mono":{"installed":false,"value":""},"Noto Sans":{"installed":false,"value":""}}';
      }

      throw new Error(`Unexpected command: ${command} ${joinedArgs}`);
    };

    const manifest = collectVisualEnvironment(
      {
        mode: "windows-edge",
        browserRuntime: {
          name: "Microsoft Edge",
          command: "C:\\Edge\\msedge.exe",
          useWindowsPaths: false
        },
        diffRuntime: {
          name: "PowerShell",
          command: "pwsh",
          useWindowsPaths: false
        },
        baselineDir: "scripts/e2e/visual-baselines",
        outputDir: ".tmp/e2e/visual-regression",
        serverBinding: {
          listenHost: "127.0.0.1",
          urlHost: "127.0.0.1"
        }
      },
      {
        execFileSync,
        now: () => "2026-03-28T10:17:43.586Z"
      }
    );

    expect(manifest.fonts["Segoe UI"]).toEqual({
      installed: true,
      value: "segoeui.ttf"
    });
  });

  it("falls back to PowerShell file version when browser --version returns empty", () => {
    const execFileSync: ExecFileSync = (command, args = []) => {
      const joinedArgs = args.join(" ");

      if (command === "git" && joinedArgs === "rev-parse --short HEAD") {
        return "c59ed05\n";
      }

      if (command === "pwsh" && joinedArgs.includes("$PSVersionTable.PSVersion.ToString()")) {
        return "7.5.5\n";
      }

      if (command === "pwsh" && joinedArgs.includes("VersionInfo")) {
        return "134.0.3124.68\n";
      }

      if (command === "pwsh" && joinedArgs.includes("WindowsProductName")) {
        return '{"platform":"windows","WindowsProductName":"Windows 10 Pro","WindowsVersion":"2009","OsBuildNumber":"19045"}';
      }

      if (command === "pwsh" && joinedArgs.includes("Segoe UI (TrueType)")) {
        return '{"Segoe UI":{"installed":true,"value":"segoeui.ttf"},"Segoe UI Variable":{"installed":false,"value":""},"Consolas":{"installed":true,"value":"consola.ttf"},"Fira Code":{"installed":false,"value":""},"JetBrains Mono":{"installed":false,"value":""},"Noto Sans":{"installed":false,"value":""}}';
      }

      throw new Error(`Unexpected command: ${command} ${joinedArgs}`);
    };

    const spawnSync: SpawnSync = (command, args = []) => {
      if (command === "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" && args.join(" ") === "--version") {
        return {
          status: 0,
          stdout: "",
          stderr: ""
        };
      }

      return {
        status: 1,
        stdout: "",
        stderr: ""
      };
    };

    const manifest = collectVisualEnvironment(
      {
        mode: "windows-edge",
        browserRuntime: {
          name: "Microsoft Edge",
          command: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          useWindowsPaths: false
        },
        diffRuntime: {
          name: "PowerShell",
          command: "pwsh",
          useWindowsPaths: false
        },
        baselineDir: "scripts/e2e/visual-baselines",
        outputDir: ".tmp/e2e/visual-regression",
        serverBinding: {
          listenHost: "127.0.0.1",
          urlHost: "127.0.0.1"
        },
        resolveBrowserPath: (targetPath: string) => targetPath
      },
      {
        execFileSync,
        spawnSync,
        now: () => "2026-03-28T10:17:43.586Z"
      }
    );

    expect(manifest.browser.version).toBe("134.0.3124.68");
  });
});
