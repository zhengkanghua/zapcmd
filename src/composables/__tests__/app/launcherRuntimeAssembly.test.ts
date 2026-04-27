import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

describe("launcherRuntimeAssembly architecture", () => {
  it("exposes a shared launcher runtime assembly factory", async () => {
    const module = await import("../../app/useAppCompositionRoot/launcherRuntimeAssembly");

    expect(module.createLauncherRuntimeAssembly).toBeTypeOf("function");
    expect(module.createWindowScopedLauncherRuntime).toBeTypeOf("function");
  });

  it("wires createAppCompositionContext through the shared launcher runtime assembly", () => {
    const source = readFileSync("src/composables/app/useAppCompositionRoot/context.ts", "utf8");

    expect(source).toContain('from "./launcherRuntimeAssembly"');
    expect(source).toContain("createWindowScopedLauncherRuntime(");
  });

  it("wires useLauncherEntry through the shared launcher runtime assembly", () => {
    const source = readFileSync("src/composables/app/useAppCompositionRoot/launcherEntry.ts", "utf8");

    expect(source).toContain('from "./launcherRuntimeAssembly"');
    expect(source).toContain("createWindowScopedLauncherRuntime(");
  });

  it("wires launcherEntry and settingsScene through shared settings facts", () => {
    const launcherEntrySource = readFileSync(
      "src/composables/app/useAppCompositionRoot/launcherEntry.ts",
      "utf8"
    );
    const settingsSceneSource = readFileSync(
      "src/composables/app/useAppCompositionRoot/settingsScene.ts",
      "utf8"
    );

    expect(launcherEntrySource).toContain('from "./settingsFacts"');
    expect(launcherEntrySource).toContain("createLauncherSettingsFacts(");
    expect(settingsSceneSource).toContain('from "./settingsFacts"');
    expect(settingsSceneSource).toContain("createSettingsSceneFacts(");
  });

  it("does not warn when resolving app window eagerly outside tauri runtime", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { createAppWindowRuntimeState } = await import(
      "../../app/useAppCompositionRoot/launcherRuntimeAssembly"
    );

    const runtimeState = createAppWindowRuntimeState(
      {
        isTauriRuntime: () => false,
        getCurrentWindow: () => {
          throw new Error("window api unavailable");
        }
      } as never,
      "main"
    );

    expect(runtimeState.currentWindowLabel.value).toBe("main");
    expect(runtimeState.resolveAppWindow()).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
