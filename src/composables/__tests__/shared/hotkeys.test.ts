import { describe, expect, it } from "vitest";

import {
  formatHotkeyForHint,
  hotkeyFromKeyboardEvent,
  hotkeyMatches,
  normalizeHotkey,
  normalizeHotkeyKeyToken
} from "../../../shared/hotkeys";

describe("normalizeHotkeyKeyToken", () => {
  it("normalizes aliases and arrows", () => {
    expect(normalizeHotkeyKeyToken("control")).toBe("Ctrl");
    expect(normalizeHotkeyKeyToken("meta")).toBe("Cmd");
    expect(normalizeHotkeyKeyToken("option")).toBe("Alt");
    expect(normalizeHotkeyKeyToken("esc")).toBe("Escape");
    expect(normalizeHotkeyKeyToken("arrowup")).toBe("ArrowUp");
  });

  it("normalizes single letters and function keys", () => {
    expect(normalizeHotkeyKeyToken("a")).toBe("A");
    expect(normalizeHotkeyKeyToken("f12")).toBe("F12");
  });
});

describe("normalizeHotkey", () => {
  it("orders modifiers and keeps main key", () => {
    expect(normalizeHotkey("shift+ctrl+a")).toBe("Ctrl+Shift+A");
    expect(normalizeHotkey("alt+ctrl+tab")).toBe("Ctrl+Alt+Tab");
  });

  it("deduplicates modifiers and returns empty for blank input", () => {
    expect(normalizeHotkey("ctrl+ctrl+v")).toBe("Ctrl+V");
    expect(normalizeHotkey("   ")).toBe("");
  });
});

describe("hotkeyMatches", () => {
  it("matches exact key and modifiers", () => {
    const event = new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true });
    expect(hotkeyMatches(event, "Ctrl+Tab")).toBe(true);
  });

  it("rejects missing or extra modifiers", () => {
    const extraModifier = new KeyboardEvent("keydown", { key: "Enter", shiftKey: true });
    const missingModifier = new KeyboardEvent("keydown", { key: "Enter" });

    expect(hotkeyMatches(extraModifier, "Enter")).toBe(false);
    expect(hotkeyMatches(missingModifier, "Shift+Enter")).toBe(false);
  });

  it("handles cmd/meta specific combinations", () => {
    const cmdEvent = new KeyboardEvent("keydown", { key: "v", metaKey: true });
    const ctrlOnlyEvent = new KeyboardEvent("keydown", { key: "v", ctrlKey: true });

    expect(hotkeyMatches(cmdEvent, "Cmd+V")).toBe(true);
    expect(hotkeyMatches(ctrlOnlyEvent, "Cmd+V")).toBe(false);
  });
});

describe("hotkeyFromKeyboardEvent", () => {
  it("builds normalized hotkey string from keyboard event", () => {
    const event = new KeyboardEvent("keydown", {
      key: "a",
      ctrlKey: true,
      shiftKey: true
    });

    expect(hotkeyFromKeyboardEvent(event)).toBe("Ctrl+Shift+A");
  });

  it("returns null for modifier-only input", () => {
    const event = new KeyboardEvent("keydown", {
      key: "Control",
      ctrlKey: true
    });
    expect(hotkeyFromKeyboardEvent(event)).toBeNull();
  });
});

describe("formatHotkeyForHint", () => {
  it("formats arrows and enter for UI hints", () => {
    expect(formatHotkeyForHint("Ctrl+ArrowDown")).toBe("Ctrl+\u2193");
    expect(formatHotkeyForHint("Enter")).toBe("\u23ce");
    expect(formatHotkeyForHint("Escape")).toBe("Esc");
  });

  it("returns empty string for empty hotkey", () => {
    expect(formatHotkeyForHint("")).toBe("");
  });
});


