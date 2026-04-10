import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useAppLifecycleBridge } from "../../app/useAppLifecycleBridge";
import { useAppLifecycle } from "../../app/useAppLifecycle";

vi.mock("../../app/useAppLifecycle", () => ({
  useAppLifecycle: vi.fn()
}));

describe("useAppLifecycleBridge", () => {
  it("delegates lifecycle wiring to useAppLifecycle and syncs launcher hotkey", async () => {
    const runtime = {
      isSettingsWindow: ref(false),
      isTauriRuntime: vi.fn(() => true),
      resolveAppWindow: vi.fn(() => null),
      currentWindowLabel: ref("main"),
      settingsSyncChannel: ref<BroadcastChannel | null>(null),
      settingsStorageKeys: ["zapcmd.settings"] as const
    };
    const settingsWindow = {
      loadSettings: vi.fn(),
      loadAvailableTerminals: vi.fn(async () => {}),
      applySettingsRouteFromHash: vi.fn(),
      onSettingsHashChange: vi.fn(),
      onGlobalPointerDown: vi.fn()
    };
    const windowSizing = {
      onViewportResize: vi.fn(),
      onAppFocused: vi.fn(),
      syncWindowSize: vi.fn(async () => {}),
      clearResizeTimer: vi.fn()
    };
    const queue = {
      clearQueueTransitionTimer: vi.fn()
    };
    const stagedFeedback = {
      clearStagedFeedbackTimer: vi.fn()
    };
    const execution = {
      clearExecutionFeedbackTimer: vi.fn()
    };
    const launcherHotkey = ref("Alt+V");
    const onWindowKeydown = vi.fn();
    const readLauncherHotkey = vi.fn(async () => "Alt+K");
    const scheduleSearchInputFocus = vi.fn();
    const onSettingsReady = vi.fn();

    useAppLifecycleBridge({
      runtime,
      settingsWindow,
      windowSizing,
      queue,
      stagedFeedback,
      execution,
      onWindowKeydown,
      readLauncherHotkey,
      launcherHotkey,
      scheduleSearchInputFocus,
      onSettingsReady
    });

    const mocked = vi.mocked(useAppLifecycle);
    expect(mocked).toHaveBeenCalledTimes(1);
    const arg = mocked.mock.calls[0]?.[0];
    expect(arg?.onWindowKeydown).toBe(onWindowKeydown);
    expect(arg?.loadSettings).toBe(settingsWindow.loadSettings);
    expect(arg?.syncWindowSize).toBe(windowSizing.syncWindowSize);
    expect(arg?.readLauncherHotkey).toBe(readLauncherHotkey);
    expect(arg?.scheduleSearchInputFocus).toBe(scheduleSearchInputFocus);
    expect(arg?.onSettingsReady).toBe(onSettingsReady);
    expect(arg?.clearExecutionFeedbackTimer).toBe(execution.clearExecutionFeedbackTimer);
    expect("cancelHotkeyRecording" in (arg ?? {})).toBe(false);

    arg?.onLauncherHotkeyLoaded("Ctrl+L");
    expect(launcherHotkey.value).toBe("Ctrl+L");

    await arg?.readLauncherHotkey();
    expect(readLauncherHotkey).toHaveBeenCalledTimes(1);
  });
});
