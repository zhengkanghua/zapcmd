import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { describe, expect, it, vi } from "vitest";

import { checkForUpdate, downloadAndInstall } from "../updateService";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn()
}));

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: vi.fn()
}));

describe("updateService", () => {
  it("returns unavailable when not running in Tauri", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(false);

    const response = await checkForUpdate();
    expect(response.result).toEqual({ available: false });
    expect(response.update).toBeNull();
  });

  it("returns unavailable when check() returns null", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);
    vi.mocked(check).mockResolvedValueOnce(null);

    const response = await checkForUpdate();
    expect(response.result).toEqual({ available: false });
    expect(response.update).toBeNull();
  });

  it("returns available update details", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);
    const update = {
      available: true,
      version: "0.2.0",
      body: "hello",
      downloadAndInstall: vi.fn()
    } as unknown as Update;
    vi.mocked(check).mockResolvedValueOnce(update);

    const response = await checkForUpdate();
    expect(response.result.available).toBe(true);
    expect(response.result.version).toBe("0.2.0");
    expect(response.result.body).toBe("hello");
    expect(response.update).toBe(update);
  });

  it("throws when downloading outside Tauri runtime", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(false);
    const update = { downloadAndInstall: vi.fn() } as unknown as Update;

    await expect(downloadAndInstall(update)).rejects.toThrow(/Tauri runtime/i);
  });

  it("reports download progress", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);

    const progress = vi.fn();
    const update = {
      downloadAndInstall: vi.fn(async (handler: (event: unknown) => void) => {
        handler({ event: "Started", data: { contentLength: 100 } });
        handler({ event: "Progress", data: { chunkLength: 40 } });
        handler({ event: "Progress", data: { chunkLength: 60 } });
        handler({ event: "Finished", data: {} });
      })
    } as unknown as Update;

    await downloadAndInstall(update, progress);

    expect(progress).toHaveBeenCalled();
    const lastCall = progress.mock.calls[progress.mock.calls.length - 1]?.[0];
    expect(lastCall).toEqual({ percent: 100, downloadedBytes: 100, totalBytes: 100 });
  });
});

