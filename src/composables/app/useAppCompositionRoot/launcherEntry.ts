import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { currentLocale } from "../../../i18n";
import type { StagedCommand } from "../../../features/launcher/types";
import {
  fallbackTerminalOptions,
  type TerminalOption
} from "../../../features/terminals/fallbackTerminals";
import { createCommandExecutor } from "../../../services/commandExecutor";
import { useLauncherDomBridge } from "../../launcher/useLauncherDomBridge";
import { useLauncherSearch } from "../../launcher/useLauncherSearch";
import { useSearchFocus } from "../../launcher/useSearchFocus";
import { useStagedFeedback } from "../../launcher/useStagedFeedback";
import { useTerminalExecution } from "../../launcher/useTerminalExecution";
import { useCommandCatalog } from "../../launcher/useCommandCatalog";
import { useHotkeyBindings } from "../../settings/useHotkeyBindings";
import { createAppWindowResolver } from "../useAppWindowResolver";
import { useSettingsStore } from "../../../stores/settingsStore";
import { createAppShellVm } from "./appShellVm";
import { bindLauncherAppearanceState } from "./launcherAppearance";
import { createLauncherRuntimeContext } from "./launcherContext";
import { createLauncherVm } from "./launcherVm";
import {
  createLauncherSettingsWindow,
  createSettingsSyncBroadcaster
} from "./launcherSettingsWindow";
import { createAppCompositionRootPorts, type AppCompositionRootPorts } from "./ports";
import { createAppCompositionRuntime } from "./runtime";

export interface UseLauncherEntryOptions {
  ports?: Partial<AppCompositionRootPorts>;
}

export function useLauncherEntry(options: UseLauncherEntryOptions = {}) {
  const ports = createAppCompositionRootPorts(options.ports);
  const settingsStore = useSettingsStore();
  settingsStore.hydrateFromStorage();
  const settingsRefs = storeToRefs(settingsStore);
  const settingsSyncChannel = ref<BroadcastChannel | null>(null);
  const resolveAppWindow = createAppWindowResolver(ports.getCurrentWindow);
  const currentWindowLabel = ref(resolveAppWindow()?.label ?? "main");
  const isSettingsWindow = computed(() => currentWindowLabel.value === "settings");
  bindLauncherAppearanceState({
    language: settingsRefs.language,
    windowOpacity: settingsRefs.windowOpacity,
    theme: settingsRefs.theme,
    blurEnabled: settingsRefs.blurEnabled,
    motionPreset: settingsRefs.motionPreset
  });

  const hotkeyBindings = useHotkeyBindings({
    hotkeys: settingsRefs.hotkeys,
    pointerActions: settingsRefs.pointerActions,
    setHotkey: (field, value) => {
      settingsStore.setHotkey(field, value);
    }
  });
  const commandCatalog = useCommandCatalog({
    isTauriRuntime: ports.isTauriRuntime,
    scanUserCommandFiles: ports.scanUserCommandFiles,
    readUserCommandFile: ports.readUserCommandFile,
    readRuntimePlatform: ports.readRuntimePlatform,
    disabledCommandIds: settingsRefs.disabledCommandIds,
    locale: currentLocale
  });
  const domBridge = useLauncherDomBridge();
  const search = useLauncherSearch({
    commandSource: commandCatalog.commandTemplates
  });
  const stagedCommands = ref<StagedCommand[]>([]);
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
  const availableTerminals = ref<TerminalOption[]>([]);
  const terminalLoading = ref(false);
  const settingsWindow = createLauncherSettingsWindow({
    ports,
    settingsStore,
    defaultTerminal: settingsRefs.defaultTerminal,
    availableTerminals,
    terminalLoading,
    settingsSyncChannel
  });
  const commandExecutor = createCommandExecutor();
  const { runCommandInTerminal, runCommandsInTerminal } = useTerminalExecution({
    commandExecutor,
    defaultTerminal: settingsRefs.defaultTerminal,
    alwaysElevatedTerminal: settingsRefs.alwaysElevatedTerminal,
    terminalReusePolicy: settingsRefs.terminalReusePolicy,
    availableTerminals,
    fallbackTerminalOptions,
    isTauriRuntime: ports.isTauriRuntime,
    readAvailableTerminals: ports.readAvailableTerminals,
    persistCorrectedTerminal: createSettingsSyncBroadcaster(settingsStore, settingsSyncChannel)
  });

  // Launcher 只装配运行时必需的设置事实源，避免主窗口默认实例化完整 Settings scene。
  const context = createLauncherRuntimeContext({
    search,
    commandCatalog,
    domBridge,
    stagedCommands,
    hotkeyBindings,
    pointerActions: settingsRefs.pointerActions,
    defaultTerminal: settingsRefs.defaultTerminal,
    terminalReusePolicy: settingsRefs.terminalReusePolicy,
    language: settingsRefs.language,
    autoCheckUpdate: settingsRefs.autoCheckUpdate,
    launchAtLogin: settingsRefs.launchAtLogin,
    alwaysElevatedTerminal: settingsRefs.alwaysElevatedTerminal,
    currentWindowLabel,
    settingsSyncChannel,
    resolveAppWindow,
    runCommandInTerminal,
    runCommandsInTerminal,
    stagedFeedback,
    stagingGripReorderActive,
    shouldBlockSearchInputFocusRef,
    scheduleSearchInputFocus,
    ensureActiveStagingVisibleRef,
    isSettingsWindow,
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
