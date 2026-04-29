import { ref } from "vue";
import {
  type TerminalOption
} from "../../../features/terminals/fallbackTerminals";
import { createAppShellVm } from "./appShellVm";
import { bindLauncherAppearanceState } from "./launcherAppearance";
import { createLauncherRuntimeContext } from "./launcherContext";
import {
  createAppWindowRuntimeState,
  createWindowScopedLauncherRuntime
} from "./launcherRuntimeAssembly";
import { createLauncherVm } from "./launcherVm";
import {
  createLauncherSettingsWindow,
  createSettingsSyncBroadcaster
} from "./launcherSettingsWindow";
import { createAppCompositionRootPorts, type AppCompositionRootPorts } from "./ports";
import { createAppCompositionRuntime } from "./runtime";
import { createLauncherSettingsFacts } from "./settingsFacts";

export interface UseLauncherEntryOptions {
  ports?: Partial<AppCompositionRootPorts>;
}

export function useLauncherEntry(options: UseLauncherEntryOptions = {}) {
  const ports = createAppCompositionRootPorts(options.ports);
  const settingsFacts = createLauncherSettingsFacts({ ports });
  const {
    settingsStore,
    settingsRefs,
    hotkeyBindings,
    commandCatalog
  } = settingsFacts;
  const windowRuntime = createAppWindowRuntimeState(ports, "main");
  bindLauncherAppearanceState({
    language: settingsRefs.language,
    windowOpacity: settingsRefs.windowOpacity,
    theme: settingsRefs.theme,
    blurEnabled: settingsRefs.blurEnabled,
    motionPreset: settingsRefs.motionPreset
  });
  const availableTerminals = ref<TerminalOption[]>([]);
  const availableTerminalsTrusted = ref(false);
  const terminalLoading = ref(false);
  const settingsWindow = createLauncherSettingsWindow({
    ports,
    settingsStore,
    defaultTerminal: settingsRefs.defaultTerminal,
    availableTerminals,
    availableTerminalsTrusted,
    terminalLoading,
    settingsSyncChannel: windowRuntime.settingsSyncChannel
  });
  const launcherRuntime = createWindowScopedLauncherRuntime({
    ports,
    windowRuntime,
    commandCatalog,
    defaultTerminal: settingsRefs.defaultTerminal,
    alwaysElevatedTerminal: settingsRefs.alwaysElevatedTerminal,
    availableTerminals,
    availableTerminalsTrusted,
    persistCorrectedTerminal: createSettingsSyncBroadcaster(
      settingsStore,
      windowRuntime.settingsSyncChannel
    )
  });

  // Launcher 只装配运行时必需的设置事实源，避免主窗口默认实例化完整 Settings scene。
  const context = createLauncherRuntimeContext({
    search: launcherRuntime.search,
    commandCatalog,
    domBridge: launcherRuntime.domBridge,
    stagedCommands: launcherRuntime.stagedCommands,
    hotkeyBindings,
    pointerActions: settingsRefs.pointerActions,
    defaultTerminal: settingsRefs.defaultTerminal,
    language: settingsRefs.language,
    autoCheckUpdate: settingsRefs.autoCheckUpdate,
    launchAtLogin: settingsRefs.launchAtLogin,
    alwaysElevatedTerminal: settingsRefs.alwaysElevatedTerminal,
    currentWindowLabel: launcherRuntime.currentWindowLabel,
    settingsSyncChannel: launcherRuntime.settingsSyncChannel,
    resolveAppWindow: launcherRuntime.resolveAppWindow,
    runCommandInTerminal: launcherRuntime.runCommandInTerminal,
    runCommandsInTerminal: launcherRuntime.runCommandsInTerminal,
    stagedFeedback: launcherRuntime.stagedFeedback,
    stagingGripReorderActive: launcherRuntime.stagingGripReorderActive,
    shouldBlockSearchInputFocusRef: launcherRuntime.shouldBlockSearchInputFocusRef,
    scheduleSearchInputFocus: launcherRuntime.scheduleSearchInputFocus,
    ensureActiveStagingVisibleRef: launcherRuntime.ensureActiveStagingVisibleRef,
    isSettingsWindow: windowRuntime.isSettingsWindow,
    settingsWindow,
    windowOpacity: settingsRefs.windowOpacity,
    theme: settingsRefs.theme,
    blurEnabled: settingsRefs.blurEnabled,
    motionPreset: settingsRefs.motionPreset,
    ports
  });
  const runtime = createAppCompositionRuntime(context);

  return {
    launcherVm: createLauncherVm(context, runtime),
    launcherCompatVm: {
      availableTerminals,
      terminalLoading
    },
    appShellVm: createAppShellVm(runtime, {
      settingsSaved: ref(false),
      saveSettings: async () => {}
    })
  };
}
