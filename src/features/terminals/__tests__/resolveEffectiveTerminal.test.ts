import { describe, expect, it } from "vitest";

import { resolveEffectiveTerminal } from "../resolveEffectiveTerminal";

describe("resolveEffectiveTerminal", () => {
  it("keeps requested terminal when available", () => {
    expect(
      resolveEffectiveTerminal(
        "pwsh",
        [{ id: "pwsh" }, { id: "cmd" }],
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
        [{ id: "cmd" }],
        []
      )
    ).toMatchObject({
      effectiveId: "cmd",
      corrected: true
    });
  });
});
