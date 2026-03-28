import { describe, expect, it } from "vitest";
import { buildLocalGatePlan } from "../verify-local-gate-lib.mjs";

describe("verify-local-gate-lib", () => {
  it("keeps windows visual compare as non-blocking by default", () => {
    const plan = buildLocalGatePlan({
      platform: "win32",
      isWsl: false,
      flags: new Set()
    });

    expect(plan.steps.map((step: { command: string }) => step.command)).toContain("npm run test:visual:ui");
    expect(
      plan.steps.find((step: { command: string; allowFailure?: boolean }) => step.command === "npm run test:visual:ui")
        ?.allowFailure
    ).toBe(true);
  });

  it("keeps wsl visual compare as non-blocking", () => {
    const plan = buildLocalGatePlan({
      platform: "linux",
      isWsl: true,
      flags: new Set()
    });

    expect(
      plan.steps.find((step: { command: string; allowFailure?: boolean }) => step.command === "npm run test:visual:ui")
        ?.allowFailure
    ).toBe(true);
  });

  it("does not schedule visual compare on macOS default gate", () => {
    const plan = buildLocalGatePlan({
      platform: "darwin",
      isWsl: false,
      flags: new Set()
    });

    expect(plan.steps.map((step: { command: string }) => step.command)).not.toContain("npm run test:visual:ui");
  });
});
