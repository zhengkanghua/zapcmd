import { nextTick, ref } from "vue";
import { shouldDeferGlobalEscape } from "../../../features/hotkeys/escapeOwnership";
import { isTypingElement } from "../../launcher/useMainWindowShell";
import { useAppLifecycleBridge } from "../useAppLifecycleBridge";
import { createAppWindowResolver } from "../useAppWindowResolver";
import { SETTINGS_STORAGE_KEYS } from "./constants";
import {
  createAppCompositionRootPorts,
  type AppCompositionRootPorts
} from "./ports";
import { createSettingsScene } from "./settingsScene";
import { createSettingsVm, type SettingsVmContext } from "./settingsVm";
import { createSettingsMutationHandlers } from "./viewModel";

export interface UseSettingsEntryOptions {
  ports?: Partial<AppCompositionRootPorts>;
}

function createNoopAsync() {
  return async () => {};
}

function createSettingsReadyCallback(ports: AppCompositionRootPorts) {
  return async () => {
    if (!ports.isTauriRuntime()) {
      return;
    }

    await nextTick();
    await new Promise<void>((resolve) => {
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => resolve());
        return;
      }
      resolve();
    });

    try {
      await ports.invoke("show_settings_window_when_ready");
    } catch (error) {
      ports.logError("show_settings_window_when_ready invoke failed", error);
    }
  };
}

function createSettingsWindowKeydownHandler(ports: AppCompositionRootPorts) {
  return (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || event.defaultPrevented) {
      return;
    }
    if (
      shouldDeferGlobalEscape(event, {
        isTypingTarget: isTypingElement
      })
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (ports.isTauriRuntime()) {
      void ports.getCurrentWindow().close();
    }
  };
}

export function useSettingsEntry(options: UseSettingsEntryOptions = {}) {
  const ports = createAppCompositionRootPorts(options.ports);
  const settingsSyncChannel = ref<BroadcastChannel | null>(null);
  const isSettingsWindow = ref(true);
  const resolveAppWindow = createAppWindowResolver(ports.getCurrentWindow);
  const currentWindowLabel = ref(resolveAppWindow()?.label ?? "settings");
  const settingsScene = createSettingsScene({
    ports,
    isSettingsWindow,
    settingsSyncChannel
  });
  const settingsContext: SettingsVmContext = {
    settingsScene
  };
  const settingsMutationHandlers = createSettingsMutationHandlers(settingsContext);
  const settingsVm = createSettingsVm(settingsContext, settingsMutationHandlers);

  useAppLifecycleBridge({
    runtime: {
      isSettingsWindow,
      isTauriRuntime: ports.isTauriRuntime,
      resolveAppWindow,
      currentWindowLabel,
      settingsSyncChannel,
      settingsStorageKeys: SETTINGS_STORAGE_KEYS
    },
    settingsWindow: settingsScene.settingsWindow,
    windowSizing: {
      onViewportResize: () => {},
      onAppFocused: () => {},
      syncWindowSize: createNoopAsync(),
      clearResizeTimer: () => {}
    },
    queue: {
      clearQueueTransitionTimer: () => {}
    },
    stagedFeedback: {
      clearStagedFeedbackTimer: () => {}
    },
    execution: {
      clearExecutionFeedbackTimer: () => {}
    },
    onWindowKeydown: createSettingsWindowKeydownHandler(ports),
    readLauncherHotkey: ports.readLauncherHotkey,
    launcherHotkey: settingsScene.hotkeyBindings.launcherHotkey,
    scheduleSearchInputFocus: () => {},
    onSettingsReady: createSettingsReadyCallback(ports)
  });

  return {
    settingsVm
  };
}
