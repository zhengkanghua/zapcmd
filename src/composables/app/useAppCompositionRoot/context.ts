import { computed, ref } from "vue";
import type { StagedCommand } from "../../../features/launcher/types";
import { fallbackTerminalOptions } from "../../../features/terminals/fallbackTerminals";
import { createCommandExecutor } from "../../../services/commandExecutor";
import { createAppWindowResolver } from "../useAppWindowResolver";
import { useLauncherDomBridge } from "../../launcher/useLauncherDomBridge";
import { useLauncherSearch } from "../../launcher/useLauncherSearch";
import { useSearchFocus } from "../../launcher/useSearchFocus";
import { useStagedFeedback } from "../../launcher/useStagedFeedback";
import { useTerminalExecution } from "../../launcher/useTerminalExecution";
import {
  createAppCompositionRootPorts,
  type AppCompositionRootPorts
} from "./ports";
import { createSettingsScene } from "./settingsScene";

export interface AppCompositionContextOptions {
  ports?: Partial<AppCompositionRootPorts>;
}

export function createAppCompositionContext(options: AppCompositionContextOptions = {}) {
  const ports = createAppCompositionRootPorts(options.ports);
  const settingsSyncChannel = ref<BroadcastChannel | null>(null);
  const currentWindowLabel = ref(createAppWindowResolver(ports.getCurrentWindow)()?.label ?? "main");
  const isSettingsWindow = computed(() => currentWindowLabel.value === "settings");
  const settingsScene = createSettingsScene({
    ports,
    isSettingsWindow,
    settingsSyncChannel
  });
  const commandCatalog = settingsScene.commandCatalog;
  const search = useLauncherSearch({
    commandSource: commandCatalog.commandTemplates
  });
  const domBridge = useLauncherDomBridge();
  const stagedCommands = ref<StagedCommand[]>([]);
  const resolveAppWindow = createAppWindowResolver(ports.getCurrentWindow);
  const stagedFeedback = useStagedFeedback({
    durationMs: 220
  });
  const stagingGripReorderActive = ref(false);
  const shouldBlockSearchInputFocusRef = ref<() => boolean>(() => false);
  const { scheduleSearchInputFocus } = useSearchFocus({
    searchInputRef: domBridge.searchInputRef,
    shouldBlockFocus: () => shouldBlockSearchInputFocusRef.value()
  });
  const ensureActiveStagingVisibleRef = ref<() => void>(() => {});
  const settingsWindow = settingsScene.settingsWindow;
  const commandExecutor = createCommandExecutor();
  const { runCommandInTerminal, runCommandsInTerminal } = useTerminalExecution({
    commandExecutor,
    defaultTerminal: settingsScene.defaultTerminal,
    alwaysElevatedTerminal: settingsScene.alwaysElevatedTerminal,
    terminalReusePolicy: settingsScene.terminalReusePolicy,
    availableTerminals: settingsWindow.availableTerminals,
    fallbackTerminalOptions,
    isTauriRuntime: ports.isTauriRuntime,
    readAvailableTerminals: ports.readAvailableTerminals,
    persistCorrectedTerminal: () => {
      settingsScene.settingsStore.persist();
      settingsSyncChannel.value?.postMessage({ type: "settings-updated" });
    }
  });
  const commandManagement = settingsScene.commandManagement;

  return {
    search, commandCatalog, domBridge, stagedCommands,
    hotkeyBindings: settingsScene.hotkeyBindings,
    defaultTerminal: settingsScene.defaultTerminal,
    terminalReusePolicy: settingsScene.terminalReusePolicy,
    language: settingsScene.language,
    autoCheckUpdate: settingsScene.autoCheckUpdate,
    launchAtLogin: settingsScene.launchAtLogin,
    alwaysElevatedTerminal: settingsScene.alwaysElevatedTerminal,
    currentWindowLabel, settingsSyncChannel, resolveAppWindow,
    runCommandInTerminal, runCommandsInTerminal, stagedFeedback, stagingGripReorderActive,
    shouldBlockSearchInputFocusRef, scheduleSearchInputFocus, appVersion: settingsScene.appVersion,
    updateStatus: settingsScene.updateManager.updateStatus,
    runtimePlatform: settingsScene.updateManager.runtimePlatform,
    checkUpdate: settingsScene.updateManager.checkUpdate,
    downloadUpdate: settingsScene.updateManager.downloadUpdate,
    openHomepage: settingsScene.openHomepage,
    ensureActiveStagingVisibleRef, isSettingsWindow, settingsWindow, commandManagement,
    settingsScene,
    windowOpacity: settingsScene.windowOpacity,
    theme: settingsScene.theme,
    blurEnabled: settingsScene.blurEnabled,
    motionPreset: settingsScene.motionPreset,
    themeManager: settingsScene.themeManager,
    motionPresetManager: settingsScene.motionPresetManager,
    ports,
    setWindowOpacity: (value: number) => settingsScene.settingsStore.setWindowOpacity(value),
    setTheme: (value: string) => settingsScene.settingsStore.setTheme(value),
    setBlurEnabled: (value: boolean) => settingsScene.settingsStore.setBlurEnabled(value),
    setMotionPreset: (value: string) => settingsScene.settingsStore.setMotionPreset(value)
  };
}
