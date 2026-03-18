import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppLifecycle } from "../../app/useAppLifecycle";
import {
  evaluateSettingsWindowOpenPolicy,
  evaluateStartupUpdateFeedbackPolicy,
  evaluateStartupUpdatePolicy
} from "../../app/useAppCompositionRoot/policies";

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  readonly name: string;
  private listeners = new Set<(event: MessageEvent) => void>();
  close = vi.fn();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (type === "message") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (type === "message") {
      this.listeners.delete(listener);
    }
  }

  postMessage(): void {}

  emit(data: unknown): void {
    const event = { data } as MessageEvent;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

interface LifecycleHarnessOptions {
  isSettingsWindow?: boolean;
  isTauriRuntime?: boolean;
  currentWindowLabel?: string;
  readLauncherHotkeyResult?: string;
}

interface FocusListenerCapture {
  callback?: (event: { payload: boolean }) => void;
  unlisten: ReturnType<typeof vi.fn>;
}

function createFocusListenerCapture(): FocusListenerCapture {
  return {
    unlisten: vi.fn(),
    callback: undefined
  };
}

function createHarness(options: LifecycleHarnessOptions = {}) {
  const settingsSyncChannel = ref<BroadcastChannel | null>(null);
  const currentWindowLabel = ref("main");
  const isSettingsWindow = ref(options.isSettingsWindow ?? false);
  const focusCapture = createFocusListenerCapture();

  const loadSettings = vi.fn();
  const loadAvailableTerminals = vi.fn(async () => {});
  const applySettingsRouteFromHash = vi.fn();
  const onSettingsHashChange = vi.fn();
  const onWindowKeydown = vi.fn();
  const onGlobalPointerDown = vi.fn();
  const onViewportResize = vi.fn();
  const onAppFocused = vi.fn();
  const readLauncherHotkey = vi.fn(async () => options.readLauncherHotkeyResult ?? "");
  const onLauncherHotkeyLoaded = vi.fn();
  const scheduleSearchInputFocus = vi.fn();
  const syncWindowSize = vi.fn(async () => {});
  const cancelHotkeyRecording = vi.fn();
  const clearResizeTimer = vi.fn();
  const clearStagingTransitionTimer = vi.fn();
  const clearStagedFeedbackTimer = vi.fn();
  const clearExecutionFeedbackTimer = vi.fn();

  const resolveAppWindow = vi.fn(() => ({
    label: options.currentWindowLabel ?? "main",
    onFocusChanged: vi.fn(async (callback: (event: { payload: boolean }) => void) => {
      focusCapture.callback = callback;
      return focusCapture.unlisten;
    })
  }));

  const Harness = defineComponent({
    setup() {
      useAppLifecycle({
        isSettingsWindow,
        isTauriRuntime: () => options.isTauriRuntime ?? false,
        resolveAppWindow,
        currentWindowLabel,
        settingsSyncChannel,
        settingsStorageKeys: ["zapcmd.settings", "zapcmd.settings.hotkeys"],
        loadSettings,
        loadAvailableTerminals,
        applySettingsRouteFromHash,
        onSettingsHashChange,
        onWindowKeydown,
        onGlobalPointerDown,
        onViewportResize,
        onAppFocused,
        readLauncherHotkey,
        onLauncherHotkeyLoaded,
        scheduleSearchInputFocus,
        syncWindowSize,
        cancelHotkeyRecording,
        clearResizeTimer,
        clearStagingTransitionTimer,
        clearStagedFeedbackTimer,
        clearExecutionFeedbackTimer
      });

      return () => h("div", { class: "lifecycle-harness" });
    }
  });

  return {
    Harness,
    state: {
      settingsSyncChannel,
      currentWindowLabel,
      isSettingsWindow,
      focusCapture
    },
    spies: {
      loadSettings,
      loadAvailableTerminals,
      applySettingsRouteFromHash,
      onAppFocused,
      readLauncherHotkey,
      onLauncherHotkeyLoaded,
      scheduleSearchInputFocus,
      syncWindowSize,
      cancelHotkeyRecording,
      clearResizeTimer,
      clearStagingTransitionTimer,
      clearStagedFeedbackTimer,
      clearExecutionFeedbackTimer
    }
  };
}

async function flushUi(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

describe("useAppLifecycle", () => {
  const originalBroadcastChannel = window.BroadcastChannel;

  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    Object.defineProperty(window, "BroadcastChannel", {
      configurable: true,
      writable: true,
      value: MockBroadcastChannel
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "BroadcastChannel", {
      configurable: true,
      writable: true,
      value: originalBroadcastChannel
    });
    vi.restoreAllMocks();
  });

  it("binds settings sync events and tears down listeners on unmount", async () => {
    const { Harness, state, spies } = createHarness({
      isSettingsWindow: true,
      currentWindowLabel: "settings"
    });
    const wrapper = mount(Harness);
    await flushUi();

    expect(spies.loadSettings).toHaveBeenCalledTimes(1);
    expect(spies.loadAvailableTerminals).toHaveBeenCalledTimes(1);
    expect(state.currentWindowLabel.value).toBe("settings");
    expect(spies.applySettingsRouteFromHash).toHaveBeenCalledWith(true);
    expect(state.settingsSyncChannel.value).toBeTruthy();

    const beforeStorageReloads = spies.loadSettings.mock.calls.length;
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated.key" }));
    await flushUi();
    expect(spies.loadSettings.mock.calls.length).toBe(beforeStorageReloads);

    window.dispatchEvent(new StorageEvent("storage", { key: "zapcmd.settings" }));
    await flushUi();
    expect(spies.loadSettings.mock.calls.length).toBeGreaterThan(beforeStorageReloads);

    const channel = MockBroadcastChannel.instances[0];
    expect(channel).toBeTruthy();
    channel.emit({ type: "settings-updated" });
    await flushUi();
    expect(spies.loadSettings.mock.calls.length).toBeGreaterThan(beforeStorageReloads + 1);

    wrapper.unmount();
    expect(spies.cancelHotkeyRecording).toHaveBeenCalledTimes(1);
    expect(spies.clearResizeTimer).toHaveBeenCalledTimes(1);
    expect(spies.clearStagingTransitionTimer).toHaveBeenCalledTimes(1);
    expect(spies.clearStagedFeedbackTimer).toHaveBeenCalledTimes(1);
    expect(spies.clearExecutionFeedbackTimer).toHaveBeenCalledTimes(1);
    expect(state.settingsSyncChannel.value).toBeNull();
    expect(channel.close).toHaveBeenCalledTimes(1);
  });

  it("handles tauri focus listener and launcher hotkey bootstrap", async () => {
    const { Harness, state, spies } = createHarness({
      isTauriRuntime: true,
      readLauncherHotkeyResult: "Ctrl+Shift+K"
    });
    const wrapper = mount(Harness);
    await flushUi();

    expect(spies.loadAvailableTerminals).not.toHaveBeenCalled();
    expect(spies.readLauncherHotkey).toHaveBeenCalledTimes(1);
    expect(spies.onLauncherHotkeyLoaded).toHaveBeenCalledWith("Ctrl+Shift+K");

    state.focusCapture.callback?.({ payload: true });
    expect(spies.onAppFocused).toHaveBeenCalled();

    wrapper.unmount();
    expect(state.focusCapture.unlisten).toHaveBeenCalledTimes(1);
  });

  it("warns when launcher hotkey read fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { Harness, spies } = createHarness({
      isTauriRuntime: true
    });
    spies.readLauncherHotkey.mockRejectedValueOnce(new Error("hotkey failed"));

    mount(Harness);
    await flushUi();

    expect(warnSpy).toHaveBeenCalledWith(
      "launcher hotkey read failed",
      expect.objectContaining({
        windowLabel: "main",
        error: expect.any(Error)
      })
    );
    warnSpy.mockRestore();
  });
});

describe("useAppCompositionRoot policies", () => {
  it("blocks startup update checks when runtime cannot execute", () => {
    expect(
      evaluateStartupUpdatePolicy({
        isTauriRuntime: false,
        autoCheckUpdateEnabled: true
      })
    ).toEqual({
      shouldCheck: false,
      enabled: true
    });
    expect(
      evaluateStartupUpdatePolicy({
        isTauriRuntime: true,
        autoCheckUpdateEnabled: false
      })
    ).toEqual({
      shouldCheck: false,
      enabled: false
    });
  });

  it("normalizes startup update feedback when version is missing", () => {
    expect(
      evaluateStartupUpdateFeedbackPolicy({
        checked: true,
        available: false
      })
    ).toEqual({
      shouldNotify: false,
      version: ""
    });
    expect(
      evaluateStartupUpdateFeedbackPolicy({
        checked: true,
        available: true
      })
    ).toEqual({
      shouldNotify: true,
      version: ""
    });
    expect(
      evaluateStartupUpdateFeedbackPolicy({
        checked: true,
        available: true,
        version: "  1.2.3  "
      })
    ).toEqual({
      shouldNotify: true,
      version: "1.2.3"
    });
  });

  it("blocks settings-window invoke when tauri window is unavailable", () => {
    expect(
      evaluateSettingsWindowOpenPolicy({
        isTauriRuntime: false
      })
    ).toEqual({
      shouldOpen: false
    });
    expect(
      evaluateSettingsWindowOpenPolicy({
        isTauriRuntime: true
      })
    ).toEqual({
      shouldOpen: true
    });
  });
});

