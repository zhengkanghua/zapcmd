import { beforeEach, describe, expect, it, vi } from "vitest";

import { maybeCheckForUpdateAtStartup, LAST_UPDATE_CHECK_STORAGE_KEY } from "../startupUpdateCheck";

vi.mock("../updateService", () => ({
  checkForUpdate: vi.fn(async () => ({ result: { available: false }, update: null }))
}));

describe("startupUpdateCheck", () => {
  beforeEach(() => {
    localStorage.clear();
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

  it("skips when storage is unavailable", async () => {
    const result = await maybeCheckForUpdateAtStartup({
      enabled: true,
      storage: null
    });
    expect(result).toEqual({ checked: false, available: false });
  });
});
