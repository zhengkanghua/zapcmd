import { describe, expect, it, vi } from "vitest";

import { openExternalTarget } from "../externalNavigator";

describe("openExternalTarget", () => {
  it("returns success when the external target opens", async () => {
    const openExternalUrl = vi.fn(async () => undefined);
    const logError = vi.fn();

    const result = await openExternalTarget({
      url: "https://example.com",
      targetName: "homepage",
      openExternalUrl,
      logError
    });

    expect(result).toEqual({
      ok: true,
      code: "opened",
      message: "homepage opened",
      url: "https://example.com"
    });
    expect(openExternalUrl).toHaveBeenCalledWith("https://example.com");
    expect(logError).not.toHaveBeenCalled();
  });

  it("returns missing-url when the target url is unavailable", async () => {
    const openExternalUrl = vi.fn(async () => undefined);
    const logError = vi.fn();

    const result = await openExternalTarget({
      url: null,
      targetName: "homepage",
      openExternalUrl,
      logError
    });

    expect(result).toEqual({
      ok: false,
      code: "missing-url",
      message: "homepage url is not configured"
    });
    expect(openExternalUrl).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith("homepage url is not configured");
  });

  it("returns open-failed and logs diagnostic details when opening throws", async () => {
    const openExternalUrl = vi.fn(async () => {
      throw new Error("blocked by policy");
    });
    const logError = vi.fn();

    const result = await openExternalTarget({
      url: "https://example.com",
      targetName: "homepage",
      openExternalUrl,
      logError
    });

    expect(result).toEqual({
      ok: false,
      code: "open-failed",
      message: "blocked by policy",
      url: "https://example.com"
    });
    expect(logError).toHaveBeenCalledWith("homepage open failed", expect.any(Error));
  });
});
