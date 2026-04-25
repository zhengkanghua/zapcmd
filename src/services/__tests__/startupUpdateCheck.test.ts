import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  maybeCheckForUpdateAtStartup,
  LAST_UPDATE_ATTEMPT_STORAGE_KEY,
  LAST_UPDATE_CHECK_STORAGE_KEY
} from "../startupUpdateCheck";
import { checkForUpdate } from "../updateService";

vi.mock("../updateService", () => ({
  checkForUpdate: vi.fn(async () => ({ result: { available: false }, update: null }))
}));

describe("startupUpdateCheck", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("skips when disabled", async () => {
    const result = await maybeCheckForUpdateAtStartup({
      enabled: false,
      storage: localStorage,
      nowMs: 1000
    });
    expect(result.checked).toBe(false);
  });

  it("skips when throttled", async () => {
    localStorage.setItem(LAST_UPDATE_CHECK_STORAGE_KEY, "1000");
    const result = await maybeCheckForUpdateAtStartup({
      enabled: true,
      storage: localStorage,
      nowMs: 2000,
      intervalMs: 999999
    });
    expect(result.checked).toBe(false);
  });

  it("marks timestamp and checks when due", async () => {
    localStorage.setItem(LAST_UPDATE_CHECK_STORAGE_KEY, "1000");
    const result = await maybeCheckForUpdateAtStartup({
      enabled: true,
      storage: localStorage,
      nowMs: 5000,
      intervalMs: 1
    });
    expect(result.checked).toBe(true);
    expect(result.available).toBe(false);
    expect(localStorage.getItem(LAST_UPDATE_CHECK_STORAGE_KEY)).toBe("5000");
  });

  it("records attempt timestamp when update check fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(LAST_UPDATE_CHECK_STORAGE_KEY, "1000");
    vi.mocked(checkForUpdate).mockRejectedValueOnce(new Error("network failed"));

    const result = await maybeCheckForUpdateAtStartup({
      enabled: true,
      storage: localStorage,
      nowMs: 5000,
      intervalMs: 1
    });

    expect(result.checked).toBe(true);
    expect(localStorage.getItem(LAST_UPDATE_CHECK_STORAGE_KEY)).toBe("1000");
    expect(localStorage.getItem(LAST_UPDATE_ATTEMPT_STORAGE_KEY)).toBe("5000");
    errorSpy.mockRestore();
  });

  it("skips retry when the last failed attempt is still within the interval", async () => {
    localStorage.setItem(LAST_UPDATE_ATTEMPT_STORAGE_KEY, "4800");

    const result = await maybeCheckForUpdateAtStartup({
      enabled: true,
      storage: localStorage,
      nowMs: 5000,
      intervalMs: 500
    });

    expect(result).toEqual({ checked: false, available: false });
    expect(checkForUpdate).not.toHaveBeenCalled();
  });

  it("skips when storage is unavailable", async () => {
    const result = await maybeCheckForUpdateAtStartup({
      enabled: true,
      storage: null
    });
    expect(result).toEqual({ checked: false, available: false });
  });
});
