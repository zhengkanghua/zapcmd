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
  readLauncherHotkeyImpl?: () => Promise<string>;
  loadAvailableTerminalsImpl?: () => Promise<void>;
  onFocusChangedImpl?: (
    callback: (event: { payload: boolean }) => void
  ) => Promise<() => void>;
  resolveAppWindowImpl?: () => {
    label: string;
    onFocusChanged?: (handler: (event: { payload: boolean }) => void) => Promise<() => void>;
  } | null;
  onMainReady?: ReturnType<typeof vi.fn>;
  onSettingsReady?: ReturnType<typeof vi.fn>;
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

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createHarness(options: LifecycleHarnessOptions = {}) {
  const settingsSyncChannel = ref<BroadcastChannel | null>(null);
  const currentWindowLabel = ref("main");
  const isSettingsWindow = ref(options.isSettingsWindow ?? false);
  const focusCapture = createFocusListenerCapture();

  const initializeSettings = vi.fn();
  const reloadSettings = vi.fn();
  const loadAvailableTerminals = vi.fn(options.loadAvailableTerminalsImpl ?? (async () => {}));
  const applySettingsRouteFromHash = vi.fn();
  const onSettingsHashChange = vi.fn();
  const onWindowKeydown = vi.fn();
  const onGlobalPointerDown = vi.fn();
  const onViewportResize = vi.fn();
  const onAppFocused = vi.fn();
  const readLauncherHotkey = vi.fn(
    options.readLauncherHotkeyImpl ?? (async () => options.readLauncherHotkeyResult ?? "")
  );
  const onLauncherHotkeyLoaded = vi.fn();
  const scheduleSearchInputFocus = vi.fn();
  const syncWindowSize = vi.fn(async () => {});
  const clearResizeTimer = vi.fn();
  const clearQueueTransitionTimer = vi.fn();
  const clearStagedFeedbackTimer = vi.fn();
  const clearExecutionFeedbackTimer = vi.fn();
  const onMainReady = options.onMainReady ?? vi.fn();
  const onSettingsReady = options.onSettingsReady ?? vi.fn();

  const resolveAppWindow = vi.fn(
    options.resolveAppWindowImpl ??
      (() => ({
        label: options.currentWindowLabel ?? "main",
        onFocusChanged: (callback: (event: { payload: boolean }) => void) => {
          focusCapture.callback = callback;
          if (options.onFocusChangedImpl) {
            return options.onFocusChangedImpl(callback);
          }
          return Promise.resolve(focusCapture.unlisten);
        }
      }))
  );

  const Harness = defineComponent({
    setup() {
      useAppLifecycle({
        isSettingsWindow,
        isTauriRuntime: () => options.isTauriRuntime ?? false,
        resolveAppWindow,
        currentWindowLabel,
        settingsSyncChannel,
        settingsStorageKeys: ["zapcmd.settings", "zapcmd.settings.hotkeys"],
        initializeSettings,
        reloadSettings,
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
        clearResizeTimer,
        clearQueueTransitionTimer,
        clearStagedFeedbackTimer,
        clearExecutionFeedbackTimer,
        onMainReady,
        onSettingsReady
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
      initializeSettings,
      reloadSettings,
      loadAvailableTerminals,
      applySettingsRouteFromHash,
      onAppFocused,
      readLauncherHotkey,
      onLauncherHotkeyLoaded,
      scheduleSearchInputFocus,
      syncWindowSize,
      clearResizeTimer,
      clearQueueTransitionTimer,
      clearStagedFeedbackTimer,
      clearExecutionFeedbackTimer,
      onMainReady,
      onSettingsReady
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

    expect(spies.initializeSettings).toHaveBeenCalledTimes(1);
    expect(spies.reloadSettings).toHaveBeenCalledTimes(0);
    expect(spies.loadAvailableTerminals).toHaveBeenCalledTimes(1);
    expect(state.currentWindowLabel.value).toBe("settings");
    expect(spies.applySettingsRouteFromHash).toHaveBeenCalledWith(true);
    expect(state.settingsSyncChannel.value).toBeTruthy();

    const beforeStorageReloads = spies.reloadSettings.mock.calls.length;
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated.key" }));
    await flushUi();
    expect(spies.reloadSettings.mock.calls.length).toBe(beforeStorageReloads);

    window.dispatchEvent(new StorageEvent("storage", { key: "zapcmd.settings" }));
    await flushUi();
    expect(spies.reloadSettings.mock.calls.length).toBeGreaterThan(beforeStorageReloads);

    const channel = MockBroadcastChannel.instances[0];
    expect(channel).toBeTruthy();
    channel.emit({ type: "settings-updated" });
    await flushUi();
    expect(spies.reloadSettings.mock.calls.length).toBeGreaterThan(beforeStorageReloads + 1);

    wrapper.unmount();
    expect(spies.clearResizeTimer).toHaveBeenCalledTimes(1);
    expect(spies.clearQueueTransitionTimer).toHaveBeenCalledTimes(1);
    expect(spies.clearStagedFeedbackTimer).toHaveBeenCalledTimes(1);
    expect(spies.clearExecutionFeedbackTimer).toHaveBeenCalledTimes(1);
    expect(state.settingsSyncChannel.value).toBeNull();
    expect(channel.close).toHaveBeenCalledTimes(1);
  });

  it("does not bind listeners after the scope is already unmounted during async settings bootstrap", async () => {
    const deferred = createDeferred<void>();
    const { Harness, state, spies } = createHarness({
      isSettingsWindow: true,
      currentWindowLabel: "settings",
      loadAvailableTerminalsImpl: () => deferred.promise
    });

    const wrapper = mount(Harness);
    await nextTick();

    expect(spies.loadAvailableTerminals).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    deferred.resolve();
    await flushUi();

    expect(state.settingsSyncChannel.value).toBeNull();
    expect(MockBroadcastChannel.instances).toHaveLength(0);
    expect(spies.applySettingsRouteFromHash).not.toHaveBeenCalled();
    expect(spies.onSettingsReady).not.toHaveBeenCalled();
  });

  it("在 storage key 为空时重新加载设置，并忽略非 settings 广播", async () => {
    const { Harness, spies } = createHarness();

    mount(Harness);
    await flushUi();

    const loadCountBeforeEvents = spies.reloadSettings.mock.calls.length;
    const channel = MockBroadcastChannel.instances[0];

    channel.emit(undefined);
    await flushUi();
    expect(spies.reloadSettings).toHaveBeenCalledTimes(loadCountBeforeEvents);

    window.dispatchEvent(new StorageEvent("storage"));
    await flushUi();
    expect(spies.reloadSettings).toHaveBeenCalledTimes(loadCountBeforeEvents + 1);
  });

  it("在 BroadcastChannel 不可用时仍完成主窗口启动", async () => {
    Object.defineProperty(window, "BroadcastChannel", {
      configurable: true,
      writable: true,
      value: undefined
    });

    const { Harness, state, spies } = createHarness();

    mount(Harness);
    await flushUi();

    expect(state.settingsSyncChannel.value).toBeNull();
    expect(MockBroadcastChannel.instances).toHaveLength(0);
    expect(spies.scheduleSearchInputFocus).toHaveBeenCalledWith(false);
    expect(spies.syncWindowSize).toHaveBeenCalledTimes(1);
  });

  it("窗口标签解析为 settings 时仍会预热终端，但不进入 settings ready 分支", async () => {
    const onMainReady = vi.fn();
    const onSettingsReady = vi.fn();
    const { Harness, spies } = createHarness({
      currentWindowLabel: "settings",
      onMainReady,
      onSettingsReady
    });

    mount(Harness);
    await flushUi();

    expect(spies.loadAvailableTerminals).toHaveBeenCalledTimes(1);
    expect(onMainReady).toHaveBeenCalledTimes(1);
    expect(onSettingsReady).not.toHaveBeenCalled();
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

  it("忽略未获得焦点的 tauri 事件与空热键", async () => {
    const { Harness, state, spies } = createHarness({
      isTauriRuntime: true,
      readLauncherHotkeyResult: ""
    });

    mount(Harness);
    await flushUi();

    state.focusCapture.callback?.({ payload: false });
    expect(spies.onAppFocused).not.toHaveBeenCalled();
    expect(spies.onLauncherHotkeyLoaded).not.toHaveBeenCalled();
  });

  it("在 focus 订阅回调返回前卸载时，会立即执行迟到的 unlisten", async () => {
    const focusChangedDeferred = createDeferred<() => void>();
    const lateUnlisten = vi.fn();
    const { Harness, spies } = createHarness({
      isTauriRuntime: true,
      onFocusChangedImpl: () => focusChangedDeferred.promise
    });

    const wrapper = mount(Harness);
    await nextTick();

    wrapper.unmount();
    focusChangedDeferred.resolve(lateUnlisten);
    await flushUi();

    expect(lateUnlisten).toHaveBeenCalledTimes(1);
    expect(spies.readLauncherHotkey).not.toHaveBeenCalled();
  });

  it("invokes onSettingsReady for settings windows without main-window focus bootstrap", async () => {
    const onSettingsReady = vi.fn();
    const onMainReady = vi.fn();
    const { Harness, spies } = createHarness({
      isSettingsWindow: true,
      currentWindowLabel: "settings",
      onSettingsReady,
      onMainReady
    });

    mount(Harness);
    await flushUi();

    expect(onSettingsReady).toHaveBeenCalledTimes(1);
    expect(onMainReady).not.toHaveBeenCalled();
    expect(spies.scheduleSearchInputFocus).not.toHaveBeenCalled();
    expect(spies.syncWindowSize).not.toHaveBeenCalled();
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

  it("在热键读取延迟失败且组件已卸载时，不再输出告警", async () => {
    const hotkeyDeferred = createDeferred<string>();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { Harness, spies } = createHarness({
      isTauriRuntime: true,
      readLauncherHotkeyImpl: () => hotkeyDeferred.promise
    });

    const wrapper = mount(Harness);
    await nextTick();

    expect(spies.readLauncherHotkey).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    hotkeyDeferred.reject(new Error("late hotkey failure"));
    await flushUi();

    expect(warnSpy).not.toHaveBeenCalled();
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
