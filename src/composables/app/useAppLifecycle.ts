import { nextTick, onBeforeUnmount, onMounted, type Ref } from "vue";

interface AppWindowLike {
  label: string;
  onFocusChanged?: (handler: (event: { payload: boolean }) => void) => Promise<() => void>;
}

interface UseAppLifecycleOptions {
  isSettingsWindow: Ref<boolean>;
  isTauriRuntime: () => boolean;
  resolveAppWindow: () => AppWindowLike | null;
  currentWindowLabel: Ref<string>;
  settingsSyncChannel: Ref<BroadcastChannel | null>;
  settingsStorageKeys: readonly string[];
  loadSettings: () => void;
  loadAvailableTerminals: () => Promise<void>;
  applySettingsRouteFromHash: (isInitial: boolean) => void;
  onSettingsHashChange: () => void;
  onWindowKeydown: (event: KeyboardEvent) => void;
  onGlobalPointerDown: (event: PointerEvent) => void;
  onViewportResize: () => void;
  onAppFocused: () => void;
  readLauncherHotkey: () => Promise<string>;
  onLauncherHotkeyLoaded: (hotkey: string) => void;
  scheduleSearchInputFocus: (selectText?: boolean) => void;
  syncWindowSize: () => Promise<void>;
  cancelHotkeyRecording: () => void;
  clearResizeTimer: () => void;
  clearStagingTransitionTimer: () => void;
  clearStagedFeedbackTimer: () => void;
  clearExecutionFeedbackTimer: () => void;
  clearSettingsSavedTimer: () => void;
  onMainReady?: () => void;
  onSettingsReady?: () => void;
}

function shouldReloadSettings(event: StorageEvent, settingsStorageKeys: readonly string[]): boolean {
  return !event.key || settingsStorageKeys.includes(event.key);
}

function closeSettingsSyncChannel(options: UseAppLifecycleOptions, onMessage: (event: MessageEvent) => void): void {
  if (!options.settingsSyncChannel.value) {
    return;
  }
  options.settingsSyncChannel.value.removeEventListener("message", onMessage);
  options.settingsSyncChannel.value.close();
  options.settingsSyncChannel.value = null;
}

function attachWindowListeners(options: UseAppLifecycleOptions, onStorage: (event: StorageEvent) => void): void {
  if (options.isSettingsWindow.value) {
    options.applySettingsRouteFromHash(true);
    window.addEventListener("hashchange", options.onSettingsHashChange);
  }

  window.addEventListener("keydown", options.onWindowKeydown, true);
  window.addEventListener("pointerdown", options.onGlobalPointerDown, true);
  window.addEventListener("storage", onStorage);
  window.addEventListener("resize", options.onViewportResize);
  window.addEventListener("focus", options.onAppFocused);
}

function detachWindowListeners(options: UseAppLifecycleOptions, onStorage: (event: StorageEvent) => void): void {
  window.removeEventListener("hashchange", options.onSettingsHashChange);
  window.removeEventListener("keydown", options.onWindowKeydown, true);
  window.removeEventListener("pointerdown", options.onGlobalPointerDown, true);
  window.removeEventListener("storage", onStorage);
  window.removeEventListener("resize", options.onViewportResize);
  window.removeEventListener("focus", options.onAppFocused);
}

function createSettingsBroadcastHandler(options: UseAppLifecycleOptions) {
  return (event: MessageEvent): void => {
    if (!event.data || event.data.type !== "settings-updated") {
      return;
    }
    options.loadSettings();
  };
}

function createStorageHandler(options: UseAppLifecycleOptions) {
  return (event: StorageEvent): void => {
    if (!shouldReloadSettings(event, options.settingsStorageKeys)) {
      return;
    }
    options.loadSettings();
  };
}

export function useAppLifecycle(options: UseAppLifecycleOptions): void {
  let unlistenFocusChanged: (() => void) | null = null;
  const onSettingsStorageChanged = createStorageHandler(options);
  const onSettingsBroadcast = createSettingsBroadcastHandler(options);

  onMounted(async () => {
    options.loadSettings();
    const appWindow = options.resolveAppWindow();
    if (appWindow) {
      options.currentWindowLabel.value = appWindow.label;
    }
    const inSettingsWindow = options.isSettingsWindow.value || appWindow?.label === "settings";
    if (inSettingsWindow) {
      await options.loadAvailableTerminals();
    }

    attachWindowListeners(options, onSettingsStorageChanged);
    if (typeof BroadcastChannel !== "undefined") {
      options.settingsSyncChannel.value = new BroadcastChannel("zapcmd-settings-sync");
      options.settingsSyncChannel.value.addEventListener("message", onSettingsBroadcast);
    }

    if (options.isTauriRuntime()) {
      if (appWindow?.onFocusChanged) {
        unlistenFocusChanged = await appWindow.onFocusChanged(({ payload }) => {
          if (payload) {
            options.onAppFocused();
          }
        });
      }

      try {
        const currentLauncherHotkey = await options.readLauncherHotkey();
        if (currentLauncherHotkey) {
          options.onLauncherHotkeyLoaded(currentLauncherHotkey);
        }
      } catch {
        // ignore launcher hotkey read error
      }
    }

    await nextTick();
    if (!options.isSettingsWindow.value) {
      options.scheduleSearchInputFocus(false);
      void options.syncWindowSize();
      options.onMainReady?.();
    } else {
      options.onSettingsReady?.();
    }
  });

  onBeforeUnmount(() => {
    options.cancelHotkeyRecording();
    closeSettingsSyncChannel(options, onSettingsBroadcast);
    detachWindowListeners(options, onSettingsStorageChanged);

    if (unlistenFocusChanged) {
      unlistenFocusChanged();
      unlistenFocusChanged = null;
    }

    options.clearResizeTimer();
    options.clearStagingTransitionTimer();
    options.clearStagedFeedbackTimer();
    options.clearExecutionFeedbackTimer();
    options.clearSettingsSavedTimer();
  });
}
