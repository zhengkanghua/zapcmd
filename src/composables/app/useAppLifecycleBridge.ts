import type { Ref } from "vue";
import { useAppLifecycle } from "./useAppLifecycle";

interface RuntimeModule {
  isSettingsWindow: Ref<boolean>;
  isTauriRuntime: () => boolean;
  resolveAppWindow: () => { label: string; onFocusChanged?: (handler: (event: { payload: boolean }) => void) => Promise<() => void> } | null;
  currentWindowLabel: Ref<string>;
  settingsSyncChannel: Ref<BroadcastChannel | null>;
  settingsStorageKeys: readonly string[];
}

interface SettingsWindowModule {
  initializeSettings: () => void;
  reloadSettings: () => void;
  loadAvailableTerminals: () => Promise<void>;
  applySettingsRouteFromHash: (isInitial: boolean) => void;
  onSettingsHashChange: () => void;
  onGlobalPointerDown: (event: PointerEvent) => void;
}

interface WindowSizingModule {
  onViewportResize: () => void;
  onAppFocused: () => void;
  syncWindowSize: () => Promise<void>;
  clearResizeTimer: () => void;
}

interface QueueModule {
  clearQueueTransitionTimer: () => void;
}

interface StagedFeedbackModule {
  clearStagedFeedbackTimer: () => void;
}

interface ExecutionModule {
  clearExecutionFeedbackTimer: () => void;
}

interface UseAppLifecycleBridgeOptions {
  runtime: RuntimeModule;
  settingsWindow: SettingsWindowModule;
  windowSizing: WindowSizingModule;
  queue: QueueModule;
  stagedFeedback: StagedFeedbackModule;
  execution: ExecutionModule;
  onWindowKeydown: (event: KeyboardEvent) => void;
  readLauncherHotkey: () => Promise<string>;
  launcherHotkey: Ref<string>;
  scheduleSearchInputFocus: (selectText?: boolean) => void;
  onMainReady?: () => void;
  onSettingsReady?: () => void;
}

export function useAppLifecycleBridge(options: UseAppLifecycleBridgeOptions): void {
  useAppLifecycle({
    isSettingsWindow: options.runtime.isSettingsWindow,
    isTauriRuntime: options.runtime.isTauriRuntime,
    resolveAppWindow: options.runtime.resolveAppWindow,
    currentWindowLabel: options.runtime.currentWindowLabel,
    settingsSyncChannel: options.runtime.settingsSyncChannel,
    settingsStorageKeys: options.runtime.settingsStorageKeys,
    initializeSettings: options.settingsWindow.initializeSettings,
    reloadSettings: options.settingsWindow.reloadSettings,
    loadAvailableTerminals: options.settingsWindow.loadAvailableTerminals,
    applySettingsRouteFromHash: options.settingsWindow.applySettingsRouteFromHash,
    onSettingsHashChange: options.settingsWindow.onSettingsHashChange,
    onWindowKeydown: options.onWindowKeydown,
    onGlobalPointerDown: options.settingsWindow.onGlobalPointerDown,
    onViewportResize: options.windowSizing.onViewportResize,
    onAppFocused: options.windowSizing.onAppFocused,
    readLauncherHotkey: options.readLauncherHotkey,
    onLauncherHotkeyLoaded: (hotkey) => {
      options.launcherHotkey.value = hotkey;
    },
    scheduleSearchInputFocus: options.scheduleSearchInputFocus,
    syncWindowSize: options.windowSizing.syncWindowSize,
    clearResizeTimer: options.windowSizing.clearResizeTimer,
    clearQueueTransitionTimer: options.queue.clearQueueTransitionTimer,
    clearStagedFeedbackTimer: options.stagedFeedback.clearStagedFeedbackTimer,
    clearExecutionFeedbackTimer: options.execution.clearExecutionFeedbackTimer,
    onMainReady: options.onMainReady,
    onSettingsReady: options.onSettingsReady
  });
}
