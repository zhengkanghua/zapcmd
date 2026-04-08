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

  it("returns localized homepage action feedback and updates visible status on success", async () => {
    let scene: SettingsScene | undefined;
    const openExternalUrl = vi.fn(async () => undefined);

    const Harness = defineComponent({
      setup() {
        scene = createSettingsScene({
          ports: createAppCompositionRootPorts({
            isTauriRuntime: () => false,
            openExternalUrl,
            logError: vi.fn()
          }),
          isSettingsWindow: ref(false),
          settingsSyncChannel: ref(null),
          resolveHomepageUrl: () => "https://example.com/zapcmd"
        });

        return () => null;
      }
    });

    mount(Harness, {
      global: {
        plugins: [createPinia()]
      }
    });

    const resolvedScene = scene as SettingsScene;
    const result = await resolvedScene.openHomepage();

    expect(openExternalUrl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      code: "opened",
      message: "已打开项目主页。"
    });
    expect(resolvedScene.homepageActionStatus.value).toEqual({
      tone: "success",
      message: "已打开项目主页。"
    });
  });

  it("returns localized homepage failure feedback when the shell open call rejects", async () => {
    let scene: SettingsScene | undefined;
    const error = new Error("blocked by policy");
    const openExternalUrl = vi.fn(async () => {
      throw error;
    });
    const logError = vi.fn();

    const Harness = defineComponent({
      setup() {
        scene = createSettingsScene({
          ports: createAppCompositionRootPorts({
            isTauriRuntime: () => false,
            openExternalUrl,
            logError
          }),
          isSettingsWindow: ref(false),
          settingsSyncChannel: ref(null),
          resolveHomepageUrl: () => "https://example.com/zapcmd"
        });

        return () => null;
      }
    });

    mount(Harness, {
      global: {
        plugins: [createPinia()]
      }
    });

    const resolvedScene = scene as SettingsScene;
    const result = await resolvedScene.openHomepage();

    expect(result).toMatchObject({
      ok: false,
      code: "open-failed",
      message: "打开项目主页失败：blocked by policy",
      detail: "blocked by policy"
    });
    expect(logError).toHaveBeenCalled();
    expect(resolvedScene.homepageActionStatus.value).toEqual({
      tone: "error",
      message: "打开项目主页失败：blocked by policy"
    });
  });
});
