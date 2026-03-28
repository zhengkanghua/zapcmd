import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const {
  VISUAL_MODES,
  resolveBaselineDir,
  resolveBrowserRuntime,
  resolveDiffRuntime,
  resolveOutputDir,
  resolvePathForRuntime,
  resolveServerBinding,
  resolveVisualMode
} = require("../e2e/visual-regression-lib.cjs");

describe("visual-regression-lib", () => {
  it("在 Windows 上默认走原生 Edge 视觉回归", () => {
    expect(resolveVisualMode({ platform: "win32", env: {} })).toBe(VISUAL_MODES.windowsEdge);
  });

  it("在 WSL 上默认走 Windows Edge 桥接模式", () => {
    expect(
      resolveVisualMode({
        platform: "linux",
        env: { WSL_DISTRO_NAME: "Ubuntu-22.04", WSL_INTEROP: "/run/WSL/42_interop" }
      })
    ).toBe(VISUAL_MODES.wslBridge);
  });

  it("在普通 Linux 上默认走 Linux smoke 模式", () => {
    expect(resolveVisualMode({ platform: "linux", env: {} })).toBe(VISUAL_MODES.linuxSmoke);
  });

  it("允许通过环境变量显式强制 Linux smoke", () => {
    expect(
      resolveVisualMode({
        platform: "linux",
        env: {
          WSL_DISTRO_NAME: "Ubuntu-22.04",
          ZAPCMD_VISUAL_MODE: VISUAL_MODES.linuxSmoke
        }
      })
    ).toBe(VISUAL_MODES.linuxSmoke);
  });

  it("允许通过环境变量显式强制 controlled-runner 模式", () => {
    expect(
      resolveVisualMode({
        platform: "linux",
        env: {
          ZAPCMD_VISUAL_MODE: "controlled-runner"
        }
      })
    ).toBe("controlled-runner");
  });

  it("会把 Linux smoke baseline 隔离到独立目录", () => {
    expect(
      resolveBaselineDir({
        rootDir: path.join("/repo", "scripts", "e2e", "visual-baselines"),
        mode: VISUAL_MODES.linuxSmoke
      })
    ).toBe(path.join("/repo", "scripts", "e2e", "visual-baselines", "linux-chromium"));
  });

  it("会把 Windows 与 WSL compare baseline 统一指向 controlled-runner 目录", () => {
    const baselineRoot = path.join("/repo", "scripts", "e2e", "visual-baselines");

    expect(resolveBaselineDir({ rootDir: baselineRoot, mode: VISUAL_MODES.windowsEdge })).toBe(
      path.join(baselineRoot, "controlled-runner")
    );
    expect(resolveBaselineDir({ rootDir: baselineRoot, mode: VISUAL_MODES.wslBridge })).toBe(
      path.join(baselineRoot, "controlled-runner")
    );
  });

  it("会把 Linux smoke 输出隔离到独立目录", () => {
    expect(
      resolveOutputDir({
        rootDir: path.join("/repo", ".tmp", "e2e", "visual-regression"),
        mode: VISUAL_MODES.linuxSmoke
      })
    ).toBe(path.join("/repo", ".tmp", "e2e", "visual-regression", "linux-chromium"));
  });

  it("会把 controlled-runner 产物隔离到独立目录", () => {
    expect(
      resolveOutputDir({
        rootDir: path.join("/repo", ".tmp", "e2e", "visual-regression"),
        mode: "controlled-runner"
      })
    ).toBe(path.join("/repo", ".tmp", "e2e", "visual-regression", "controlled-runner"));
  });

  it("WSL 桥接模式会把服务监听地址切到 0.0.0.0 并使用探测到的 WSL IP", () => {
    expect(
      resolveServerBinding({
        mode: VISUAL_MODES.wslBridge,
        env: {},
        probeWslHost: () => "172.31.53.148"
      })
    ).toEqual({
      listenHost: "0.0.0.0",
      urlHost: "172.31.53.148"
    });
  });

  it("WSL 桥接模式会把文件路径转换成 Windows 可访问路径", () => {
    expect(
      resolvePathForRuntime({
        mode: VISUAL_MODES.wslBridge,
        targetPath: "/home/work/projects/zapcmd/.tmp/e2e/visual-regression/actual.png",
        convertWslPath: (targetPath: string) =>
          `\\\\wsl.localhost\\Ubuntu-22.04${targetPath.replaceAll("/", "\\")}`
      })
    ).toBe("\\\\wsl.localhost\\Ubuntu-22.04\\home\\work\\projects\\zapcmd\\.tmp\\e2e\\visual-regression\\actual.png");
  });

  it("WSL 桥接模式下浏览器命令仍使用可执行的 /mnt/c 路径", () => {
    expect(
      resolveBrowserRuntime({
        mode: VISUAL_MODES.wslBridge,
        env: {
          ZAPCMD_EDGE_PATH: "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
        }
      }).command
    ).toBe("/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe");
  });

  it("controlled-runner 只读取专用浏览器契约环境变量", () => {
    const runtime = resolveBrowserRuntime({
      mode: "controlled-runner",
      env: {
        ZAPCMD_VISUAL_RUNNER_BROWSER_PATH: "C:\\controlled\\chrome.exe",
        ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION: "146.0.0.0",
        ZAPCMD_EDGE_PATH: "C:\\edge\\msedge.exe"
      }
    });

    expect(runtime.command).toBe("C:\\controlled\\chrome.exe");
    expect(runtime.expectedVersion).toBe("146.0.0.0");
    expect(runtime.name).toBe("Controlled Chromium");
  });

  it("WSL 桥接模式下 diff 命令仍使用可执行的 /mnt/c 路径", () => {
    expect(
      resolveDiffRuntime({
        mode: VISUAL_MODES.wslBridge,
        env: {
          ZAPCMD_PWSH_PATH: "/mnt/c/Program Files/PowerShell/7/pwsh.exe"
        }
      }).command
    ).toBe("/mnt/c/Program Files/PowerShell/7/pwsh.exe");
  });

  it("controlled-runner 在本机执行 compare 时不应依赖 wslpath 转换", () => {
    expect(
      resolveDiffRuntime({
        mode: VISUAL_MODES.controlledRunner,
        env: {
          ZAPCMD_PWSH_PATH: "C:\\Program Files\\PowerShell\\7\\pwsh.exe"
        }
      })
    ).toEqual({
      command: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      useWindowsPaths: false
    });
  });
});
