import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useAppLifecycleBridge } from "../../app/useAppLifecycleBridge";
import {
  bindLifecycleBridge,
  createOnMainReady,
  createOnSettingsReady,
  createWindowSizingSettleNotifiers
} from "../../app/useAppCompositionRoot/launcherRuntimeBindings";

vi.mock("../../../i18n", () => ({
  t: vi.fn((key: string, params?: Record<string, unknown>) =>
    key === "settings.about.updateAvailable"
      ? `update:${String(params?.version ?? "")}`
      : key
  )
}));

vi.mock("../../app/useAppLifecycleBridge", () => ({
  useAppLifecycleBridge: vi.fn()
}));

function createLauncherContextStub() {
  return {
    autoCheckUpdate: ref(true),
    currentWindowLabel: ref("main"),
    isSettingsWindow: ref(false),
    settingsSyncChannel: ref<BroadcastChannel | null>(null),
    hotkeyBindings: {
      launcherHotkey: ref("Alt+V")
    },
    settingsWindow: {
      loadSettings: vi.fn(),
      loadAvailableTerminals: vi.fn(async () => {}),
      applySettingsRouteFromHash: vi.fn(),
      onSettingsHashChange: vi.fn(),
      onGlobalPointerDown: vi.fn()
    },
    stagedFeedback: {
      clearStagedFeedbackTimer: vi.fn()
    },
    resolveAppWindow: vi.fn(() => ({
      label: "main",
      onFocusChanged: vi.fn(async () => () => {})
    })),
    scheduleSearchInputFocus: vi.fn(),
    ports: {
      isTauriRuntime: vi.fn(() => true),
      checkStartupUpdate: vi.fn(async () => ({ available: false, version: "" })),
      getLocalStorage: vi.fn(() => localStorage),
      logError: vi.fn(),
      invoke: vi.fn(async () => undefined),
      readLauncherHotkey: vi.fn(async () => "Alt+V")
    }
  };
}

function createLauncherRuntimeBridgeStub() {
  return {
    commandExecution: {
      clearExecutionFeedbackTimer: vi.fn(),
      setExecutionFeedback: vi.fn()
    },
    stagingQueue: {
      clearQueueTransitionTimer: vi.fn()
    }
  };
}

describe("launcherRuntimeBindings", () => {
  it("delegates settle notifications to window sizing controller", () => {
    const windowSizing = {
      notifySearchPageSettled: vi.fn(),
      notifyCommandPageSettled: vi.fn(),
      notifyFlowPanelPrepared: vi.fn(),
      notifyFlowPanelHeightChange: vi.fn(),
      notifyFlowPanelSettled: vi.fn()
    };

    const notifiers = createWindowSizingSettleNotifiers(windowSizing);

    notifiers.notifySearchPageSettled();
    notifiers.notifyCommandPageSettled();
    notifiers.notifyFlowPanelPrepared();
    notifiers.notifyFlowPanelHeightChange();
    notifiers.notifyFlowPanelSettled();

    expect(windowSizing.notifySearchPageSettled).toHaveBeenCalledTimes(1);
    expect(windowSizing.notifyCommandPageSettled).toHaveBeenCalledTimes(1);
    expect(windowSizing.notifyFlowPanelPrepared).toHaveBeenCalledTimes(1);
    expect(windowSizing.notifyFlowPanelHeightChange).toHaveBeenCalledTimes(1);
    expect(windowSizing.notifyFlowPanelSettled).toHaveBeenCalledTimes(1);
  });

  it("checks startup updates on main ready and reports available versions", async () => {
    const context = createLauncherContextStub();
    const launcherRuntime = createLauncherRuntimeBridgeStub();
    context.ports.checkStartupUpdate.mockResolvedValue({
      available: true,
      version: " 1.2.3 "
    });

    createOnMainReady(context as never, launcherRuntime)();
    await Promise.resolve();

    expect(context.ports.checkStartupUpdate).toHaveBeenCalledWith({
      enabled: true,
      storage: localStorage
    });
    expect(launcherRuntime.commandExecution.setExecutionFeedback).toHaveBeenCalledWith(
      "neutral",
      "update:1.2.3"
    );
  });

  it("opens settings window only in tauri runtime", async () => {
    const context = createLauncherContextStub();

    createOnSettingsReady(context as never)();
    await Promise.resolve();
    expect(context.ports.invoke).toHaveBeenCalledWith("open_settings_window");

    context.ports.invoke.mockClear();
    context.ports.isTauriRuntime.mockReturnValue(false);
    createOnSettingsReady(context as never)();
    await Promise.resolve();
    expect(context.ports.invoke).not.toHaveBeenCalled();
  });

  it("wires launcher lifecycle bridge with launcher-specific callbacks", () => {
    const context = createLauncherContextStub();
    const launcherRuntime = createLauncherRuntimeBridgeStub();
    const windowSizing = {
      onViewportResize: vi.fn(),
      onAppFocused: vi.fn(),
      syncWindowSize: vi.fn(async () => {}),
      clearResizeTimer: vi.fn()
    };
    const onWindowKeydown = vi.fn();

    bindLifecycleBridge(
      context as never,
      launcherRuntime,
      windowSizing as never,
      onWindowKeydown
    );

    const bridgeOptions = vi.mocked(useAppLifecycleBridge).mock.calls[0]?.[0];
    expect(bridgeOptions?.runtime.isSettingsWindow).toBe(context.isSettingsWindow);
    expect(bridgeOptions?.runtime.resolveAppWindow).toBe(context.resolveAppWindow);
    expect(bridgeOptions?.settingsWindow.loadSettings).toBe(context.settingsWindow.loadSettings);
    expect(bridgeOptions?.windowSizing.syncWindowSize).toBe(windowSizing.syncWindowSize);
    expect(bridgeOptions?.queue.clearQueueTransitionTimer).toBe(
      launcherRuntime.stagingQueue.clearQueueTransitionTimer
    );
    expect(bridgeOptions?.execution.clearExecutionFeedbackTimer).toBe(
      launcherRuntime.commandExecution.clearExecutionFeedbackTimer
    );
    expect(bridgeOptions?.readLauncherHotkey).toBe(context.ports.readLauncherHotkey);
    expect(bridgeOptions?.onWindowKeydown).toBe(onWindowKeydown);
    expect(typeof bridgeOptions?.onMainReady).toBe("function");
    expect(typeof bridgeOptions?.onSettingsReady).toBe("function");
  });
});
