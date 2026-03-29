import { createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createAppCompositionRootPorts } from "../../app/useAppCompositionRoot/ports";
import { createSettingsScene } from "../../app/useAppCompositionRoot/settingsScene";

function createPortsStub() {
  return createAppCompositionRootPorts({
    isTauriRuntime: () => false,
    openExternalUrl: vi.fn(async () => undefined),
    logError: vi.fn()
  });
}

describe("createSettingsScene", () => {
  it("creates a reusable settings scene with settingsWindow/commandManagement/updateManager", async () => {
    let scene: ReturnType<typeof createSettingsScene> | null = null;

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

    expect(scene).not.toBeNull();
    expect(scene?.settingsWindow).toBeDefined();
    expect(scene?.commandCatalog).toBeDefined();
    expect(scene?.commandManagement).toBeDefined();
    expect(scene?.updateManager).toBeDefined();
    expect(scene?.openHomepage).toBeTypeOf("function");
  });
});
