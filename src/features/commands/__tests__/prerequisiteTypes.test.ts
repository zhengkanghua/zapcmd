import { describe, expect, it } from "vitest";

import { isSupportedPrerequisiteType } from "../prerequisiteTypes";

describe("prerequisiteTypes", () => {
  it("recognizes supported prerequisite types", () => {
    expect(isSupportedPrerequisiteType("binary")).toBe(true);
    expect(isSupportedPrerequisiteType("env")).toBe(true);
  });

  it("rejects unsupported values", () => {
    expect(isSupportedPrerequisiteType("other")).toBe(false);
  });
});
