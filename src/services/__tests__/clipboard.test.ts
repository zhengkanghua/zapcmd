import { beforeEach, describe, expect, it, vi } from "vitest";

import { copyTextToClipboard } from "../clipboard";

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

describe("clipboard service", () => {
  beforeEach(() => {
    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
      return;
    }
    // @ts-expect-error jsdom 中 clipboard 可能不存在
    delete navigator.clipboard;
  });

  it("copies text when clipboard api is available", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    await expect(copyTextToClipboard("echo hi")).resolves.toBeUndefined();
    expect(writeText).toHaveBeenCalledWith("echo hi");
  });

  it("throws when clipboard api is unavailable", async () => {
    // @ts-expect-error jsdom 中 clipboard 可能不存在
    delete navigator.clipboard;

    await expect(copyTextToClipboard("echo hi")).rejects.toThrow("clipboard API unavailable");
  });
});
