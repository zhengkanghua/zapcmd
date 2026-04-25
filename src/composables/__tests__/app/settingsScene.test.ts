import { createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import { describe, expect, it, vi, afterEach } from "vitest";

import { createAppCompositionRootPorts } from "../../app/useAppCompositionRoot/ports";
import {
  createSettingsScene,
  type SettingsScene
} from "../../app/useAppCompositionRoot/settingsScene";
import * as commandCatalogModule from "../../launcher/useCommandCatalog";
import * as updateManagerModule from "../../update/useUpdateManager";

function createPortsStub() {
  return createAppCompositionRootPorts({
    isTauriRuntime: () => false,
    openExternalUrl: vi.fn(async () => undefined),
    logError: vi.fn(),
    readRuntimePlatform: vi.fn(async () => "linux")
  });
}

describe("createSettingsScene", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(resolvedScene.settingsWindow.loadSettings).toBeTypeOf("function");
    expect(resolvedScene.settingsWindow.loadAvailableTerminals).toBeTypeOf("function");
    expect(resolvedScene.commandCatalog).toBeDefined();
    expect(resolvedScene.commandManagement).toBeDefined();
    expect(resolvedScene.updateManager).toBeDefined();
    expect(resolvedScene.hotkeyBindings.launcherHotkey).toBeDefined();
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

  it("keeps command catalog inactive until the settings route enters commands", async () => {
    const useCommandCatalogSpy = vi.spyOn(commandCatalogModule, "useCommandCatalog");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let scene: SettingsScene | undefined;

    const Harness = defineComponent({
      setup() {
        scene = createSettingsScene({
          ports: createPortsStub(),
          isSettingsWindow: ref(true),
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

    const firstCall = useCommandCatalogSpy.mock.calls[0]?.[0];
    expect(firstCall).toBeTruthy();
    expect(firstCall?.activated?.value).toBe(false);

    const resolvedScene = scene as SettingsScene;
    resolvedScene.settingsWindow.navigateSettings("commands");
    await nextTick();

    expect(firstCall?.activated?.value).toBe(true);
    errorSpy.mockRestore();
  });

  it("wires update manager runtime platform through composition root ports", async () => {
    const injectedReadRuntimePlatform = vi.fn(async () => "mac");
    const useUpdateManagerSpy = vi.spyOn(updateManagerModule, "useUpdateManager");
    let scene: SettingsScene | undefined;

    const Harness = defineComponent({
      setup() {
        scene = createSettingsScene({
          ports: createAppCompositionRootPorts({
            isTauriRuntime: () => false,
            openExternalUrl: vi.fn(async () => undefined),
            logError: vi.fn(),
            readRuntimePlatform: injectedReadRuntimePlatform
          }),
          isSettingsWindow: ref(true),
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

    expect(useUpdateManagerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        readRuntimePlatform: injectedReadRuntimePlatform
      })
    );
    await nextTick();
    expect(scene?.updateManager.runtimePlatform.value).toBe("mac");
  });
});
