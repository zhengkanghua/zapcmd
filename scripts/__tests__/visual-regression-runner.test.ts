import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);

const {
  listWindowsBrowserProcessIds,
  runBrowserScreenshot
} = require("../e2e/visual-regression-runner.cjs");

function createFakeBrowserProcess(pid = 4242) {
  const child = new EventEmitter() as EventEmitter & { pid: number };
  child.pid = pid;
  return child;
}

describe("visual-regression-runner", () => {
  it("skips Windows snapshot cleanup queries for Linux browser commands on non-Windows runtimes", () => {
    const execFileSyncImpl = vi.fn(() => "3144\r\n");

    expect(
      listWindowsBrowserProcessIds({
        browserCommand: "/usr/bin/google-chrome",
        cleanupQueryCommand: "/mnt/c/Program Files/PowerShell/7/pwsh.exe",
        platform: "linux",
        execFileSyncImpl
      })
    ).toEqual([]);

    expect(execFileSyncImpl).not.toHaveBeenCalled();
  });

  it("lists all browser process ids with Get-Process for snapshot cleanup", () => {
    const execFileSyncImpl = vi.fn(() => "3144\r\n6524\r\n20768\r\n");

    expect(
      listWindowsBrowserProcessIds({
        browserCommand: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        platform: "win32",
        execFileSyncImpl
      })
    ).toEqual([3144, 6524, 20768]);

    expect(execFileSyncImpl).toHaveBeenCalledWith(
      "powershell.exe",
      ["-NoProfile", "-Command", expect.stringContaining("Get-Process -Name $processName")],
      expect.objectContaining({
        encoding: "utf8"
      })
    );
    const [, args, options] = execFileSyncImpl.mock.calls[0] ?? [];
    expect(args?.[2]).toContain("GetFileNameWithoutExtension('msedge.exe')");
    expect(options?.env ?? {}).not.toHaveProperty("ZAPCMD_VISUAL_CLEANUP_PROCESS_NAME");
  });

  it("cleans up the browser process tree once screenshot output exists", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "shot.png");
    const logPath = path.join(tempDir, "shot.log");
    const child = createFakeBrowserProcess();
    const terminateProcessTree = vi.fn(async () => {});
    const listProcessIdsForCleanup = vi.fn(async () => [child.pid]);
    const listAllBrowserProcessIds = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([child.pid]);

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        writeFileSync(outPath, "png");
      }, 10);
      setTimeout(() => {
        child.emit("exit", 1, null);
      }, 30);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "msedge.exe",
        browserLabel: "Controlled Chromium",
        url: "http://127.0.0.1:4173/visual.html#launcher-motion-surfaces-expressive",
        outPath,
        profileDir: path.join(tempDir, "profile"),
        width: 1400,
        height: 1800,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        listProcessIdsForCleanup,
        listAllBrowserProcessIds,
        screenshotReadyPollIntervalMs: 5,
        timeoutMs: 1_000
      })
    ).resolves.toBeUndefined();

    expect(spawnImpl).toHaveBeenCalledTimes(1);
    expect(spawnImpl.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        env: expect.objectContaining({
          EDGE_CRASHPAD_PIPE_NAME: "",
          CHROME_CRASHPAD_PIPE_NAME: ""
        })
      })
    );
    expect(listProcessIdsForCleanup).toHaveBeenCalledTimes(2);
    expect(listAllBrowserProcessIds).toHaveBeenCalledTimes(2);
    expect(terminateProcessTree).toHaveBeenCalledTimes(1);
    expect(terminateProcessTree).toHaveBeenCalledWith(child.pid);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("still fails when browser exits before screenshot output is produced", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "missing.png");
    const logPath = path.join(tempDir, "missing.log");
    const child = createFakeBrowserProcess();
    const terminateProcessTree = vi.fn(async () => {});

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        child.emit("exit", 1, null);
      }, 10);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "msedge.exe",
        browserLabel: "Controlled Chromium",
        url: "http://127.0.0.1:4173/visual.html#launcher-motion-surfaces-expressive",
        outPath,
        profileDir: path.join(tempDir, "profile"),
        width: 1400,
        height: 1800,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        screenshotReadyPollIntervalMs: 5,
        timeoutMs: 1_000
      })
    ).rejects.toThrow("Controlled Chromium 截图失败");

    expect(terminateProcessTree).not.toHaveBeenCalled();

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("runs a final cleanup pass after exit=0 when screenshot output already exists", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "final-shot.png");
    const logPath = path.join(tempDir, "final-shot.log");
    const child = createFakeBrowserProcess();
    const terminateProcessTree = vi.fn(async () => {});
    const listProcessIdsForCleanup = vi.fn(async () => [9001, 9002]);

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        writeFileSync(outPath, "png");
      }, 5);
      setTimeout(() => {
        child.emit("exit", 0, null);
      }, 10);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "msedge.exe",
        browserLabel: "Controlled Chromium",
        url: "http://127.0.0.1:4173/visual.html#settings-ui-overview",
        outPath,
        profileDir: path.join(tempDir, "profile"),
        width: 1100,
        height: 900,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        listProcessIdsForCleanup,
        screenshotReadyPollIntervalMs: 1_000,
        timeoutMs: 1_000
      })
    ).resolves.toBeUndefined();

    expect(listProcessIdsForCleanup).toHaveBeenCalledTimes(1);
    expect(listProcessIdsForCleanup).toHaveBeenCalledWith({
      browserCommand: "msedge.exe",
      profileDir: path.join(tempDir, "profile")
    });
    expect(terminateProcessTree.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([9001, 9002]));

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("waits briefly for the screenshot file after exit=0 before the final cleanup pass", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "late-shot.png");
    const logPath = path.join(tempDir, "late-shot.log");
    const child = createFakeBrowserProcess();
    const terminateProcessTree = vi.fn(async () => {});
    const listProcessIdsForCleanup = vi.fn(async () => [9010]);

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        child.emit("exit", 0, null);
      }, 10);
      setTimeout(() => {
        writeFileSync(outPath, "png");
      }, 30);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "msedge.exe",
        browserLabel: "Controlled Chromium",
        url: "http://127.0.0.1:4173/visual.html#settings-ui-overview",
        outPath,
        profileDir: path.join(tempDir, "profile"),
        width: 1100,
        height: 900,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        listProcessIdsForCleanup,
        screenshotReadyPollIntervalMs: 1_000,
        timeoutMs: 1_000
      })
    ).resolves.toBeUndefined();

    expect(listProcessIdsForCleanup).toHaveBeenCalledTimes(1);
    expect(terminateProcessTree.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([9010]));

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("uses Windows PowerShell cleanup query for WSL-launched Edge processes", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "wsl-shot.png");
    const logPath = path.join(tempDir, "wsl-shot.log");
    const child = createFakeBrowserProcess(7777);
    const terminateProcessTree = vi.fn(async () => {});
    const cleanupQueryExecFileSyncImpl = vi.fn(() => "9001\r\n9002");
    const wslProfileDir = "\\\\wsl.localhost\\Ubuntu-22.04\\repo\\.tmp\\e2e\\visual-regression\\profile-settings-ui-overview";
    const cleanupQueryCommand = "/mnt/c/Program Files/PowerShell/7/pwsh.exe";
    const listAllBrowserProcessIds = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([9001, 9002]);

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        writeFileSync(outPath, "png");
      }, 5);
      setTimeout(() => {
        child.emit("exit", 0, null);
      }, 10);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        browserLabel: "Microsoft Edge",
        url: "http://172.24.48.1:4173/visual.html#settings-ui-overview",
        outPath,
        profileDir: wslProfileDir,
        width: 1100,
        height: 900,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        cleanupQueryCommand,
        cleanupQueryPlatform: "linux",
        cleanupQueryExecFileSyncImpl,
        listAllBrowserProcessIds,
        screenshotReadyPollIntervalMs: 1_000,
        timeoutMs: 1_000
      })
    ).resolves.toBeUndefined();

    expect(cleanupQueryExecFileSyncImpl).toHaveBeenCalledTimes(1);
    expect(cleanupQueryExecFileSyncImpl).toHaveBeenCalledWith(
      cleanupQueryCommand,
      ["-NoProfile", "-Command", expect.stringContaining("Get-CimInstance Win32_Process")],
      expect.objectContaining({
        encoding: "utf8"
      })
    );
    const [, cleanupArgs, cleanupOptions] = cleanupQueryExecFileSyncImpl.mock.calls[0] ?? [];
    expect(cleanupArgs?.[2]).toContain("name = 'msedge.exe'");
    expect(cleanupArgs?.[2]).toContain(wslProfileDir);
    expect(cleanupOptions?.env ?? {}).not.toHaveProperty("ZAPCMD_VISUAL_CLEANUP_PROCESS_NAME");
    expect(cleanupOptions?.env ?? {}).not.toHaveProperty("ZAPCMD_VISUAL_CLEANUP_PROFILE");
    expect(terminateProcessTree.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([child.pid, 9001, 9002])
    );

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("cleans up browser pids created during the run even when they do not include profileDir", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "stray-window.png");
    const logPath = path.join(tempDir, "stray-window.log");
    const child = createFakeBrowserProcess(4242);
    const terminateProcessTree = vi.fn(async () => {});
    const listProcessIdsForCleanup = vi.fn(async () => [4242]);
    const listAllBrowserProcessIds = vi
      .fn()
      .mockResolvedValueOnce([101, 202])
      .mockResolvedValueOnce([101, 202, 4242, 9090]);

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        writeFileSync(outPath, "png");
      }, 5);
      setTimeout(() => {
        child.emit("exit", 0, null);
      }, 10);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "msedge.exe",
        browserLabel: "Microsoft Edge",
        url: "http://127.0.0.1:4173/visual.html#settings-ui-overview",
        outPath,
        profileDir: path.join(tempDir, "profile"),
        width: 1100,
        height: 900,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        listProcessIdsForCleanup,
        listAllBrowserProcessIds,
        screenshotReadyPollIntervalMs: 1_000,
        timeoutMs: 1_000
      })
    ).resolves.toBeUndefined();

    expect(listAllBrowserProcessIds).toHaveBeenCalledTimes(2);
    expect(terminateProcessTree.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([4242, 9090]));

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("does not broaden cleanup scope after screenshot-ready cleanup to kill unrelated late browser pids", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "late-browser-window.png");
    const logPath = path.join(tempDir, "late-browser-window.log");
    const child = createFakeBrowserProcess(4242);
    const latePid = 21708;
    const terminateProcessTree = vi.fn(async () => {});
    const listProcessIdsForCleanup = vi.fn(async () => [child.pid]);
    const listAllBrowserProcessIds = vi
      .fn()
      .mockResolvedValueOnce([101, 202])
      .mockResolvedValueOnce([101, 202, child.pid])
      .mockResolvedValueOnce([101, 202, child.pid, latePid]);

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        writeFileSync(outPath, "png");
      }, 5);
      setTimeout(() => {
        child.emit("exit", 0, null);
      }, 30);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "msedge.exe",
        browserLabel: "Microsoft Edge",
        url: "http://127.0.0.1:4173/visual.html#launcher-motion-surfaces-steady-tool",
        outPath,
        profileDir: path.join(tempDir, "profile"),
        width: 1400,
        height: 1800,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        listProcessIdsForCleanup,
        listAllBrowserProcessIds,
        screenshotReadyPollIntervalMs: 1,
        timeoutMs: 1_000
      })
    ).resolves.toBeUndefined();

    expect(listAllBrowserProcessIds).toHaveBeenCalledTimes(2);
    expect(terminateProcessTree.mock.calls.map((call) => call[0])).toEqual([child.pid]);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("does not broaden delayed post-exit cleanup scope to kill unrelated late browser pids", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "post-exit-late-browser-window.png");
    const logPath = path.join(tempDir, "post-exit-late-browser-window.log");
    const child = createFakeBrowserProcess(4242);
    const latePid = 2784;
    const terminateProcessTree = vi.fn(async () => {});
    const listProcessIdsForCleanup = vi.fn(async () => [child.pid]);
    const listAllBrowserProcessIds = vi
      .fn()
      .mockResolvedValueOnce([101, 202])
      .mockResolvedValueOnce([101, 202, child.pid])
      .mockResolvedValueOnce([101, 202, child.pid, latePid]);

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        writeFileSync(outPath, "png");
      }, 5);
      setTimeout(() => {
        child.emit("exit", 0, null);
      }, 10);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "msedge.exe",
        browserLabel: "Microsoft Edge",
        url: "http://127.0.0.1:4173/visual.html#settings-ui-overview",
        outPath,
        profileDir: path.join(tempDir, "profile"),
        width: 1100,
        height: 900,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        listProcessIdsForCleanup,
        listAllBrowserProcessIds,
        screenshotReadyPollIntervalMs: 1_000,
        postExitGracePeriodMs: 5,
        timeoutMs: 1_000
      })
    ).resolves.toBeUndefined();

    expect(listAllBrowserProcessIds).toHaveBeenCalledTimes(2);
    expect(terminateProcessTree.mock.calls.map((call) => call[0])).toEqual([child.pid]);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("cleans up tracked descendant browser pids even after they disappear from profile and broad pid queries", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "tracked-descendant-window.png");
    const logPath = path.join(tempDir, "tracked-descendant-window.log");
    const child = createFakeBrowserProcess(4242);
    const lateTrackedPid = 14780;
    const terminateProcessTree = vi.fn(async () => {});
    const listProcessIdsForCleanup = vi.fn(async () => [child.pid]);
    const listAllBrowserProcessIds = vi
      .fn()
      .mockResolvedValueOnce([101, 202])
      .mockResolvedValueOnce([101, 202, child.pid])
      .mockResolvedValue([101, 202, child.pid]);
    const listTrackedProcessTreeIds = vi
      .fn()
      .mockResolvedValueOnce([child.pid])
      .mockResolvedValueOnce([child.pid, lateTrackedPid])
      .mockResolvedValue([child.pid]);

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        writeFileSync(outPath, "png");
      }, 5);
      setTimeout(() => {
        child.emit("exit", 0, null);
      }, 20);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "msedge.exe",
        browserLabel: "Microsoft Edge",
        url: "http://127.0.0.1:4173/visual.html#settings-ui-overview",
        outPath,
        profileDir: path.join(tempDir, "profile"),
        width: 1100,
        height: 900,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        listProcessIdsForCleanup,
        listAllBrowserProcessIds,
        listTrackedProcessTreeIds,
        trackDescendantBrowserProcessTree: true,
        processTreePollIntervalMs: 1,
        screenshotReadyPollIntervalMs: 1_000,
        postExitGracePeriodMs: 5,
        timeoutMs: 1_000
      })
    ).resolves.toBeUndefined();

    expect(listTrackedProcessTreeIds).toHaveBeenCalled();
    expect(terminateProcessTree.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([child.pid, lateTrackedPid]));

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("does not timeout after a successful exit while post-exit cleanup is still draining", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "slow-cleanup-window.png");
    const logPath = path.join(tempDir, "slow-cleanup-window.log");
    const child = createFakeBrowserProcess(4242);
    const terminateProcessTree = vi.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 700);
        })
    );
    const listProcessIdsForCleanup = vi.fn(async () => [child.pid, 9001]);

    const spawnImpl = vi.fn(() => {
      setTimeout(() => {
        writeFileSync(outPath, "png");
      }, 5);
      setTimeout(() => {
        child.emit("exit", 0, null);
      }, 10);
      return child;
    });

    await expect(
      runBrowserScreenshot({
        browserCommand: "msedge.exe",
        browserLabel: "Microsoft Edge",
        url: "http://127.0.0.1:4173/visual.html#settings-ui-overview",
        outPath,
        profileDir: path.join(tempDir, "profile"),
        width: 1100,
        height: 900,
        logPath,
        environmentManifestPath: path.join(tempDir, "environment.json"),
        spawnImpl,
        terminateProcessTree,
        listProcessIdsForCleanup,
        screenshotReadyPollIntervalMs: 1_000,
        timeoutMs: 800
      })
    ).resolves.toBeUndefined();

    expect(terminateProcessTree.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([child.pid, 9001]));

    rmSync(tempDir, { recursive: true, force: true });
  });
});
