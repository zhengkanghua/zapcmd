import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
      return '{"Segoe UI":{"installed":true,"value":"segoeui.ttf"},"Segoe UI Variable":{"installed":false,"value":""},"Consolas":{"installed":true,"value":"consola.ttf"},"Fira Code":{"installed":false,"value":""},"JetBrains Mono":{"installed":false,"value":""},"Noto Sans":{"installed":false,"value":""},"Noto Sans SC":{"installed":true,"value":"NotoSansSC-VF.ttf"},"Microsoft YaHei":{"installed":true,"value":"msyh.ttc"}}';
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
      version: "Microsoft Edge 134.0.3124.68",
      expectedVersion: "",
      versionMatchesExpected: false
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
    expect(manifest.fonts["Microsoft YaHei"]).toEqual({
      installed: true,
      value: "msyh.ttc"
    });
    expect(manifest.fonts["Noto Sans SC"]).toEqual({
      installed: true,
      value: "NotoSansSC-VF.ttf"
    });
    expect(manifest.baselineDir).toBe("scripts/e2e/visual-baselines");
    expect(manifest.outputDir).toBe(".tmp/e2e/visual-regression");
    expect(manifest.serverBinding).toEqual({
      listenHost: "127.0.0.1",
      urlHost: "127.0.0.1"
    });
  });

  it("records controlled-runner expected browser version and font mode", () => {
    const manifest = collectVisualEnvironment(
      {
        mode: "controlled-runner",
        browserRuntime: {
          name: "Controlled Chromium",
          command: "C:\\controlled\\chrome.exe",
          expectedVersion: "146.0.0.0"
        },
        diffRuntime: {
          name: "PowerShell",
          command: "pwsh"
        },
        baselineDir: "scripts/e2e/visual-baselines/controlled-runner",
        outputDir: ".tmp/e2e/visual-regression/controlled-runner",
        serverBinding: {
          listenHost: "127.0.0.1",
          urlHost: "127.0.0.1"
        }
      },
      {
        execFileSync: createExecFileSyncStub(),
        now: () => "2026-03-28T10:02:00.000Z"
      }
    );

    expect(manifest.mode).toBe("controlled-runner");
    expect(manifest.browser.expectedVersion).toBe("146.0.0.0");
    expect(manifest.fontScope).toBe("visual-harness-controlled");
    expect(manifest.baselineKind).toBe("controlled-runner");
  });

  it("uses runner-specific baseline update hint", () => {
    expect(readFileSync(resolve(process.cwd(), "scripts/e2e/visual-regression-runner.cjs"), "utf8")).toContain(
      "test:visual:ui:update:runner"
    );
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
        return "Segoe UI\nConsolas\nNoto Sans SC\n";
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
    expect(manifest.fonts["Noto Sans SC"]).toEqual({
      installed: true,
      value: "Noto Sans SC"
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
        return '{"Segoe UI":{"installed":true,"value":"segoeui.ttf"},"Segoe UI Variable":{"installed":false,"value":""},"Consolas":{"installed":true,"value":"consola.ttf"},"Fira Code":{"installed":false,"value":""},"JetBrains Mono":{"installed":false,"value":""},"Noto Sans":{"installed":false,"value":""},"Noto Sans SC":{"installed":true,"value":"NotoSansSC-VF.ttf"},"Microsoft YaHei":{"installed":true,"value":"msyh.ttc"}}';
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
    expect(manifest.fonts["Microsoft YaHei"]).toEqual({
      installed: true,
      value: "msyh.ttc"
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
        expect(joinedArgs).toContain("; if ($item) {");
        return "134.0.3124.68\n";
      }

      if (command === "pwsh" && joinedArgs.includes("WindowsProductName")) {
        return '{"platform":"windows","WindowsProductName":"Windows 10 Pro","WindowsVersion":"2009","OsBuildNumber":"19045"}';
      }

      if (command === "pwsh" && joinedArgs.includes("Segoe UI (TrueType)")) {
        return '{"Segoe UI":{"installed":true,"value":"segoeui.ttf"},"Segoe UI Variable":{"installed":false,"value":""},"Consolas":{"installed":true,"value":"consola.ttf"},"Fira Code":{"installed":false,"value":""},"JetBrains Mono":{"installed":false,"value":""},"Noto Sans":{"installed":false,"value":""},"Noto Sans SC":{"installed":true,"value":"NotoSansSC-VF.ttf"},"Microsoft YaHei":{"installed":true,"value":"msyh.ttc"}}';
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
    expect(manifest.fonts["Microsoft YaHei"]).toEqual({
      installed: true,
      value: "msyh.ttc"
    });
  });

  it("falls back to PowerShell file version when browser --version returns non-version mojibake", () => {
    const execFileSync: ExecFileSync = (command, args = []) => {
      const joinedArgs = args.join(" ");

      if (command === "git" && joinedArgs === "rev-parse --short HEAD") {
        return "c59ed05\n";
      }

      if (command === "pwsh" && joinedArgs.includes("$PSVersionTable.PSVersion.ToString()")) {
        return "7.5.5\n";
      }

      if (command === "pwsh" && joinedArgs.includes("VersionInfo")) {
        expect(joinedArgs).toContain("; if ($item) {");
        return "146.0.3856.84\n";
      }

      if (command === "pwsh" && joinedArgs.includes("WindowsProductName")) {
        return '{"platform":"windows","WindowsProductName":"Windows 10 Pro","WindowsVersion":"2009","OsBuildNumber":"19045"}';
      }

      if (command === "pwsh" && joinedArgs.includes("Segoe UI (TrueType)")) {
        return '{"Segoe UI":{"installed":true,"value":"segoeui.ttf"},"Segoe UI Variable":{"installed":false,"value":""},"Consolas":{"installed":true,"value":"consola.ttf"},"Fira Code":{"installed":false,"value":""},"JetBrains Mono":{"installed":false,"value":""},"Noto Sans":{"installed":false,"value":""},"Noto Sans SC":{"installed":true,"value":"NotoSansSC-VF.ttf"},"Microsoft YaHei":{"installed":true,"value":"msyh.ttc"}}';
      }

      throw new Error(`Unexpected command: ${command} ${joinedArgs}`);
    };

    const spawnSync: SpawnSync = (command, args = []) => {
      if (command === "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" && args.join(" ") === "--version") {
        return {
          status: 0,
          stdout: "��������������Ự�д򿪡�",
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

    expect(manifest.browser.version).toBe("146.0.3856.84");
  });
});
