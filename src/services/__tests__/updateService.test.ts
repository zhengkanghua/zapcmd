import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { describe, expect, it, vi } from "vitest";

import { checkForUpdate, downloadAndInstall, isStagedUpdateError } from "../updateService";

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

  it("normalizes empty version and non-string body", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);
    const update = {
      available: true,
      version: "   ",
      body: { note: "object-body" },
      downloadAndInstall: vi.fn()
    } as unknown as Update;
    vi.mocked(check).mockResolvedValueOnce(update);

    const response = await checkForUpdate();
    expect(response.result.available).toBe(true);
    expect(response.result.version).toBeUndefined();
    expect(response.result.body).toBe("[object Object]");
  });

  it("returns undefined body when updater body is null", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);
    const update = {
      available: true,
      version: "0.3.0",
      body: null,
      downloadAndInstall: vi.fn()
    } as unknown as Update;
    vi.mocked(check).mockResolvedValueOnce(update);

    const response = await checkForUpdate();
    expect(response.result.available).toBe(true);
    expect(response.result.body).toBeUndefined();
  });

  it("returns unavailable when check() reports available=false", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);
    const update = {
      available: false,
      downloadAndInstall: vi.fn()
    } as unknown as Update;
    vi.mocked(check).mockResolvedValueOnce(update);

    const response = await checkForUpdate();
    expect(response.result).toEqual({ available: false });
    expect(response.update).toBe(update);
  });

  it("wraps update check failure with check stage", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);
    vi.mocked(check).mockRejectedValueOnce(new Error("check crashed"));

    await expect(checkForUpdate()).rejects.toSatisfy((error: unknown) => {
      expect(isStagedUpdateError(error)).toBe(true);
      if (isStagedUpdateError(error)) {
        expect(error.stage).toBe("check");
        expect(error.message).toContain("check crashed");
      }
      return true;
    });
  });

  it("marks non-staged errors as false", () => {
    expect(isStagedUpdateError(new Error("plain"))).toBe(false);
    expect(isStagedUpdateError({ stage: "check" })).toBe(false);
    expect(isStagedUpdateError("error")).toBe(false);
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

  it("keeps progress at zero when updater emits non-positive payloads", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);

    const progress = vi.fn();
    const update = {
      downloadAndInstall: vi.fn(async (handler: (event: unknown) => void) => {
        handler({ event: "Started", data: { contentLength: 0 } });
        handler({ event: "Progress", data: { chunkLength: 0 } });
        handler({ event: "Progress", data: { chunkLength: Number.NaN } });
        handler({ event: "Finished", data: {} });
      })
    } as unknown as Update;

    await downloadAndInstall(update, progress);

    const firstCall = progress.mock.calls[0]?.[0];
    const lastCall = progress.mock.calls[progress.mock.calls.length - 1]?.[0];
    expect(firstCall).toEqual({ percent: 0, downloadedBytes: 0, totalBytes: null });
    expect(lastCall).toEqual({ percent: 0, downloadedBytes: 0, totalBytes: null });
  });

  it("tags download failure stage when install has not started", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);
    const update = {
      downloadAndInstall: vi.fn(async () => {
        throw new Error("download failed");
      })
    } as unknown as Update;

    await expect(downloadAndInstall(update)).rejects.toSatisfy((error: unknown) => {
      expect(isStagedUpdateError(error)).toBe(true);
      if (isStagedUpdateError(error)) {
        expect(error.stage).toBe("download");
      }
      return true;
    });
  });

  it("tags install failure stage when error happens after Finished event", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);
    const update = {
      downloadAndInstall: vi.fn(async (handler: (event: unknown) => void) => {
        handler({ event: "Started", data: { contentLength: 100 } });
        handler({ event: "Progress", data: { chunkLength: 100 } });
        handler({ event: "Finished", data: {} });
        throw new Error("install failed");
      })
    } as unknown as Update;

    await expect(downloadAndInstall(update, vi.fn())).rejects.toSatisfy((error: unknown) => {
      expect(isStagedUpdateError(error)).toBe(true);
      if (isStagedUpdateError(error)) {
        expect(error.stage).toBe("install");
      }
      return true;
    });
  });

  it("detects install-stage failure without progress callback", async () => {
    vi.mocked(isTauri).mockReturnValueOnce(true);
    const update = {
      downloadAndInstall: vi.fn(async (handler: (event: unknown) => void) => {
        handler({ event: "Finished", data: {} });
        throw new Error("install failed without progress");
      })
    } as unknown as Update;

    await expect(downloadAndInstall(update)).rejects.toSatisfy((error: unknown) => {
      expect(isStagedUpdateError(error)).toBe(true);
      if (isStagedUpdateError(error)) {
        expect(error.stage).toBe("install");
      }
      return true;
    });
  });
});
