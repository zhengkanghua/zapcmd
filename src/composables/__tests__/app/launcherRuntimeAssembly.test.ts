import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("launcherRuntimeAssembly architecture", () => {
  it("exposes a shared launcher runtime assembly factory", async () => {
    const module = await import("../../app/useAppCompositionRoot/launcherRuntimeAssembly");

    expect(module.createLauncherRuntimeAssembly).toBeTypeOf("function");
  });

  it("wires createAppCompositionContext through the shared launcher runtime assembly", () => {
    const source = readFileSync("src/composables/app/useAppCompositionRoot/context.ts", "utf8");

    expect(source).toContain('from "./launcherRuntimeAssembly"');
    expect(source).toContain("createLauncherRuntimeAssembly(");
  });

  it("wires useLauncherEntry through the shared launcher runtime assembly", () => {
    const source = readFileSync("src/composables/app/useAppCompositionRoot/launcherEntry.ts", "utf8");

    expect(source).toContain('from "./launcherRuntimeAssembly"');
    expect(source).toContain("createLauncherRuntimeAssembly(");
  });
});
