import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);

const { runBrowserScreenshot } = require("../e2e/visual-regression-runner.cjs");

function createFakeBrowserProcess(pid = 4242) {
  const child = new EventEmitter() as EventEmitter & { pid: number };
  child.pid = pid;
  return child;
}

describe("visual-regression-runner", () => {
  it("cleans up the browser process tree once screenshot output exists", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "zapcmd-visual-runner-"));
    const outPath = path.join(tempDir, "shot.png");
    const logPath = path.join(tempDir, "shot.log");
    const child = createFakeBrowserProcess();
    const terminateProcessTree = vi.fn(async () => {});

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
        screenshotReadyPollIntervalMs: 5,
        timeoutMs: 1_000
      })
    ).resolves.toBeUndefined();

    expect(spawnImpl).toHaveBeenCalledTimes(1);
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
});
