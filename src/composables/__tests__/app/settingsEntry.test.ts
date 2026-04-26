import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSettingsEntry } from "../../app/useAppCompositionRoot/settingsEntry";
import { useAppLifecycleBridge } from "../../app/useAppLifecycleBridge";
import { createAppCompositionRootPorts } from "../../app/useAppCompositionRoot/ports";
import {
  createSettingsScene,
  type SettingsScene
} from "../../app/useAppCompositionRoot/settingsScene";
import { createSettingsMutationHandlers } from "../../app/useAppCompositionRoot/viewModel";
import { createSettingsVm } from "../../app/useAppCompositionRoot/settingsVm";

vi.mock("../../app/useAppLifecycleBridge", () => ({
  useAppLifecycleBridge: vi.fn()
}));

vi.mock("../../app/useAppCompositionRoot/ports", () => ({
  createAppCompositionRootPorts: vi.fn()
}));

vi.mock("../../app/useAppCompositionRoot/settingsScene", () => ({
  createSettingsScene: vi.fn()
}));

vi.mock("../../app/useAppCompositionRoot/viewModel", () => ({
  createSettingsMutationHandlers: vi.fn()
}));

vi.mock("../../app/useAppCompositionRoot/settingsVm", () => ({
  createSettingsVm: vi.fn()
}));

function createSceneStub() {
  const loadSettings = vi.fn();
  return {
    settingsWindow: {
      loadSettings,
      initializeSettings: loadSettings,
      reloadSettings: loadSettings,
      loadAvailableTerminals: vi.fn(async () => {}),
      applySettingsRouteFromHash: vi.fn(),
      onSettingsHashChange: vi.fn(),
      onGlobalPointerDown: vi.fn()
    },
    hotkeyBindings: {
      launcherHotkey: ref("Alt+V")
    }
  } as unknown as SettingsScene;
}

describe("useSettingsEntry", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: originalRequestAnimationFrame
    });
  });

  it("loads settings, available terminals and launcher hotkey through lifecycle bridge", async () => {
    const scene = createSceneStub();
    const readLauncherHotkey = vi.fn(async () => "Ctrl+Shift+L");

    vi.mocked(createAppCompositionRootPorts).mockReturnValue({
      isTauriRuntime: () => true,
      getCurrentWindow: vi.fn(() => ({ label: "settings", close: vi.fn() })),
      invoke: vi.fn(),
      openExternalUrl: vi.fn(),
      getLocalStorage: vi.fn(() => localStorage),
      checkStartupUpdate: vi.fn(),
      scanUserCommandFiles: vi.fn(),
      readUserCommandFile: vi.fn(),
      readRuntimePlatform: vi.fn(),
      readAvailableTerminals: vi.fn(async () => []),
      refreshAvailableTerminals: vi.fn(async () => []),
      readAutoStartEnabled: vi.fn(async () => false),
      writeAutoStartEnabled: vi.fn(async () => undefined),
      writeLauncherHotkey: vi.fn(async () => undefined),
      readLauncherHotkey,
      requestHideMainWindow: vi.fn(async () => undefined),
      requestSetMainWindowSize: vi.fn(async () => undefined),
      requestAnimateMainWindowSize: vi.fn(async () => undefined),
      requestResizeMainWindowForReveal: vi.fn(async () => undefined),
      logWarn: vi.fn(),
      logError: vi.fn()
    } as never);
    vi.mocked(createSettingsScene).mockReturnValue(scene);
    vi.mocked(createSettingsMutationHandlers).mockReturnValue({} as never);
    vi.mocked(createSettingsVm).mockReturnValue({} as never);

    const Harness = defineComponent({
      setup() {
        useSettingsEntry();
        return () => null;
      }
    });

    mount(Harness);

    const bridgeOptions = vi.mocked(useAppLifecycleBridge).mock.calls[0]?.[0];
    expect(bridgeOptions).toBeTruthy();

    bridgeOptions?.settingsWindow.initializeSettings();
    bridgeOptions?.settingsWindow.reloadSettings();
    await bridgeOptions?.settingsWindow.loadAvailableTerminals();
    await bridgeOptions?.readLauncherHotkey();

    expect(scene.settingsWindow.loadSettings).toHaveBeenCalledTimes(2);
    expect(scene.settingsWindow.loadAvailableTerminals).toHaveBeenCalledTimes(1);
    expect(readLauncherHotkey).toHaveBeenCalledTimes(1);
  });

  it("invokes show_settings_window_when_ready only after nextTick + rAF", async () => {
    const scene = createSceneStub();
    const invoke = vi.fn(async () => undefined);
    let rafCallback: FrameRequestCallback | null = null;

    vi.mocked(createAppCompositionRootPorts).mockReturnValue({
      isTauriRuntime: () => true,
      getCurrentWindow: vi.fn(() => ({ label: "settings", close: vi.fn() })),
      invoke,
      openExternalUrl: vi.fn(),
      getLocalStorage: vi.fn(() => localStorage),
      checkStartupUpdate: vi.fn(),
      scanUserCommandFiles: vi.fn(),
      readUserCommandFile: vi.fn(),
      readRuntimePlatform: vi.fn(),
      readAvailableTerminals: vi.fn(async () => []),
      refreshAvailableTerminals: vi.fn(async () => []),
      readAutoStartEnabled: vi.fn(async () => false),
      writeAutoStartEnabled: vi.fn(async () => undefined),
      writeLauncherHotkey: vi.fn(async () => undefined),
      readLauncherHotkey: vi.fn(async () => ""),
      requestHideMainWindow: vi.fn(async () => undefined),
      requestSetMainWindowSize: vi.fn(async () => undefined),
      requestAnimateMainWindowSize: vi.fn(async () => undefined),
      requestResizeMainWindowForReveal: vi.fn(async () => undefined),
      logWarn: vi.fn(),
      logError: vi.fn()
    } as never);
    vi.mocked(createSettingsScene).mockReturnValue(scene);
    vi.mocked(createSettingsMutationHandlers).mockReturnValue({} as never);
    vi.mocked(createSettingsVm).mockReturnValue({} as never);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      rafCallback = callback;
      return 1;
    });

    const Harness = defineComponent({
      setup() {
        useSettingsEntry();
        return () => null;
      }
    });

    mount(Harness);

    const bridgeOptions = vi.mocked(useAppLifecycleBridge).mock.calls[0]?.[0];
    const readyPromise = bridgeOptions?.onSettingsReady?.();
    await nextTick();
    expect(invoke).not.toHaveBeenCalled();

    expect(rafCallback).toBeTypeOf("function");
    if (!rafCallback) {
      throw new Error("requestAnimationFrame callback should be scheduled");
    }
    const scheduledFrameCallback = rafCallback as FrameRequestCallback;
    scheduledFrameCallback(16);
    await readyPromise;

    expect(invoke).toHaveBeenCalledWith("show_settings_window_when_ready");
  });
});
