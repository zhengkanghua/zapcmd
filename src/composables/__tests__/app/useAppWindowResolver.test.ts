import { describe, expect, it, vi } from "vitest";
import { createAppWindowResolver } from "../../app/useAppWindowResolver";

describe("createAppWindowResolver", () => {
  it("returns window from provider when available", () => {
    const mockWindow = { label: "main" };
    const resolveWindow = createAppWindowResolver(() => mockWindow);

    expect(resolveWindow()).toBe(mockWindow);
  });

  it("returns null when provider throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resolveWindow = createAppWindowResolver(() => {
      throw new Error("not in tauri runtime");
    });

    expect(resolveWindow()).toBeNull();
    expect(resolveWindow()).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});


