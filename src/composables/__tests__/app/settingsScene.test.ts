import { createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createAppCompositionRootPorts } from "../../app/useAppCompositionRoot/ports";
import {
  createSettingsScene,
  type SettingsScene
} from "../../app/useAppCompositionRoot/settingsScene";

function createPortsStub() {
  return createAppCompositionRootPorts({
    isTauriRuntime: () => false,
    openExternalUrl: vi.fn(async () => undefined),
    logError: vi.fn()
  });
}

describe("createSettingsScene", () => {
  it("creates a reusable settings scene with settingsWindow/commandManagement/updateManager", async () => {
    let scene: SettingsScene | undefined;

    const Harness = defineComponent({
      setup() {
        scene = createSettingsScene({
          ports: createPortsStub(),
          isSettingsWindow: ref(false),
          settingsSyncChannel: ref(null)
        });

        return () => null;
      }
    });

    mount(Harness, {
      global: {
        plugins: [createPinia()]
      }
    });

    expect(scene).toBeDefined();
    const resolvedScene = scene as SettingsScene;

    expect(resolvedScene.settingsWindow).toBeDefined();
    expect(resolvedScene.commandCatalog).toBeDefined();
    expect(resolvedScene.commandManagement).toBeDefined();
    expect(resolvedScene.updateManager).toBeDefined();
    expect(resolvedScene.openHomepage).toBeTypeOf("function");
  });
});
