import type { Update } from "@tauri-apps/plugin-updater";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUpdateManager } from "../../update/useUpdateManager";
import { readRuntimePlatform } from "../../../services/tauriBridge";
import { checkForUpdate, downloadAndInstall } from "../../../services/updateService";

vi.mock("../../../services/tauriBridge", () => ({
  readRuntimePlatform: vi.fn()
}));

vi.mock("../../../services/updateService", () => ({
  checkForUpdate: vi.fn(),
  downloadAndInstall: vi.fn()
}));

describe("useUpdateManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads runtime platform and falls back to empty string on invalid values/errors", async () => {
    const manager = useUpdateManager();

    vi.mocked(readRuntimePlatform).mockResolvedValueOnce("win");
    await manager.loadRuntimePlatform();
    expect(manager.runtimePlatform.value).toBe("win");

    vi.mocked(readRuntimePlatform).mockResolvedValueOnce(123 as unknown as string);
    await manager.loadRuntimePlatform();
    expect(manager.runtimePlatform.value).toBe("");

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(readRuntimePlatform).mockRejectedValueOnce(new Error("boom"));
    await manager.loadRuntimePlatform();
    expect(manager.runtimePlatform.value).toBe("");
    errorSpy.mockRestore();
  });

  it("sets upToDate when no update is available or update is missing", async () => {
    const manager = useUpdateManager();

    vi.mocked(checkForUpdate).mockResolvedValueOnce({
      result: { available: false },
      update: null
    });
    await manager.checkUpdate();
    expect(manager.updateStatus.value.state).toBe("upToDate");

    vi.mocked(checkForUpdate).mockResolvedValueOnce({
      result: { available: true, version: "1.0.0" },
      update: null
    });
    await manager.checkUpdate();
    expect(manager.updateStatus.value.state).toBe("upToDate");
  });

  it("downloads available update and reports progress", async () => {
    const update = {} as Update;
    const manager = useUpdateManager();

    vi.mocked(checkForUpdate).mockResolvedValueOnce({
      result: { available: true, version: undefined, body: "hello" },
      update
    });

    vi.mocked(downloadAndInstall).mockImplementationOnce(async (_update, onProgress) => {
      onProgress?.({ percent: 40, downloadedBytes: 40, totalBytes: 100 });
      onProgress?.({ percent: 100, downloadedBytes: 100, totalBytes: 100 });
    });

    await manager.checkUpdate();
    expect(manager.updateStatus.value.state).toBe("available");
    if (manager.updateStatus.value.state === "available") {
      expect(manager.updateStatus.value.version).toBe("");
    }

    await manager.downloadUpdate();
    expect(vi.mocked(downloadAndInstall)).toHaveBeenCalledTimes(1);
    expect(manager.updateStatus.value.state).toBe("installing");
  });

  it("sets error when downloading fails, and no-ops when update is not available", async () => {
    const manager = useUpdateManager();
    await manager.downloadUpdate();
    expect(vi.mocked(downloadAndInstall)).not.toHaveBeenCalled();

    const update = {} as Update;
    vi.mocked(checkForUpdate).mockResolvedValueOnce({
      result: { available: true, version: "1.0.0" },
      update
    });
    vi.mocked(downloadAndInstall).mockRejectedValueOnce("network down");

    await manager.checkUpdate();
    await manager.downloadUpdate();
    expect(manager.updateStatus.value.state).toBe("error");
    if (manager.updateStatus.value.state === "error") {
      expect(manager.updateStatus.value.reason).toContain("network down");
    }
  });
});
