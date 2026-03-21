import { describe, expect, it } from "vitest";

import { resolveEffectiveTerminal } from "../resolveEffectiveTerminal";

describe("resolveEffectiveTerminal", () => {
  it("keeps requested terminal when available", () => {
    expect(
      resolveEffectiveTerminal(
        "pwsh",
        [
          { id: "pwsh", label: "PowerShell 7", path: "pwsh.exe" },
          { id: "cmd", label: "Command Prompt", path: "cmd.exe" }
        ],
        []
      )
    ).toMatchObject({
      effectiveId: "pwsh",
      corrected: false
    });
  });

  it("falls back to first available terminal when requested one is missing", () => {
    expect(
      resolveEffectiveTerminal(
        "ghost",
        [{ id: "cmd", label: "Command Prompt", path: "cmd.exe" }],
        []
      )
    ).toMatchObject({
      effectiveId: "cmd",
      corrected: true
    });
  });
});
