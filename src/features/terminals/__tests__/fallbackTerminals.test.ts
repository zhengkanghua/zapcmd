import { describe, expect, it } from "vitest";

import { fallbackTerminalOptions } from "../fallbackTerminals";

describe("fallbackTerminalOptions", () => {
  it("returns windows terminal options", () => {
    const options = fallbackTerminalOptions("Win32");
    expect(options.map((item) => item.id)).toEqual([
      "powershell",
      "pwsh",
      "wt",
      "cmd"
    ]);
  });

  it("returns mac terminal options", () => {
    const options = fallbackTerminalOptions("MacIntel");
    expect(options.map((item) => item.id)).toEqual(["terminal", "iterm2"]);
  });

  it("returns linux fallback terminal options", () => {
    const options = fallbackTerminalOptions("Linux x86_64");
    expect(options.map((item) => item.id)).toEqual([
      "x-terminal-emulator",
      "gnome-terminal",
      "konsole",
      "alacritty"
    ]);
  });
});

