import {
  createAppCompositionRootPorts,
  type AppCompositionRootPorts
} from "./ports";
import {
  createAppWindowRuntimeState,
  createWindowScopedLauncherRuntime
} from "./launcherRuntimeAssembly";
import { createSettingsSyncBroadcaster } from "./launcherSettingsWindow";
import { createSettingsScene } from "./settingsScene";

export interface AppCompositionContextOptions {
  ports?: Partial<AppCompositionRootPorts>;
}

export function createAppCompositionContext(options: AppCompositionContextOptions = {}) {
  const ports = createAppCompositionRootPorts(options.ports);
  const windowRuntime = createAppWindowRuntimeState(ports, "main");
  const settingsScene = createSettingsScene({
    ports,
    isSettingsWindow: windowRuntime.isSettingsWindow,
    settingsSyncChannel: windowRuntime.settingsSyncChannel
  });
  const commandCatalog = settingsScene.commandCatalog;
  const settingsWindow = settingsScene.settingsWindow;
  const launcherRuntime = createWindowScopedLauncherRuntime({
    ports,
    windowRuntime,
    commandCatalog,
    defaultTerminal: settingsScene.defaultTerminal,
    alwaysElevatedTerminal: settingsScene.alwaysElevatedTerminal,
    terminalReusePolicy: settingsScene.terminalReusePolicy,
    availableTerminals: settingsWindow.availableTerminals,
    availableTerminalsTrusted: settingsWindow.availableTerminalsTrusted,
    persistCorrectedTerminal: createSettingsSyncBroadcaster(
      settingsScene.settingsStore,
      windowRuntime.settingsSyncChannel
    )
  });
  const commandManagement = settingsScene.commandManagement;

  return {
    search: launcherRuntime.search,
    commandCatalog,
    domBridge: launcherRuntime.domBridge,
    stagedCommands: launcherRuntime.stagedCommands,
    hotkeyBindings: settingsScene.hotkeyBindings,
    pointerActions: settingsScene.pointerActions,
    defaultTerminal: settingsScene.defaultTerminal,
    terminalReusePolicy: settingsScene.terminalReusePolicy,
    language: settingsScene.language,
    autoCheckUpdate: settingsScene.autoCheckUpdate,
    launchAtLogin: settingsScene.launchAtLogin,
    alwaysElevatedTerminal: settingsScene.alwaysElevatedTerminal,
    queueAutoClearOnSuccess: settingsScene.queueAutoClearOnSuccess,
    currentWindowLabel: launcherRuntime.currentWindowLabel,
    settingsSyncChannel: launcherRuntime.settingsSyncChannel,
    resolveAppWindow: launcherRuntime.resolveAppWindow,
    runCommandInTerminal: launcherRuntime.runCommandInTerminal,
    runCommandsInTerminal: launcherRuntime.runCommandsInTerminal,
    stagedFeedback: launcherRuntime.stagedFeedback,
    stagingGripReorderActive: launcherRuntime.stagingGripReorderActive,
    shouldBlockSearchInputFocusRef: launcherRuntime.shouldBlockSearchInputFocusRef,
    scheduleSearchInputFocus: launcherRuntime.scheduleSearchInputFocus,
    appVersion: settingsScene.appVersion,
    updateStatus: settingsScene.updateManager.updateStatus,
    runtimePlatform: settingsScene.updateManager.runtimePlatform,
    checkUpdate: settingsScene.updateManager.checkUpdate,
    downloadUpdate: settingsScene.updateManager.downloadUpdate,
    openHomepage: settingsScene.openHomepage,
    ensureActiveStagingVisibleRef: launcherRuntime.ensureActiveStagingVisibleRef,
    isSettingsWindow: windowRuntime.isSettingsWindow,
    settingsWindow,
    commandManagement,
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
