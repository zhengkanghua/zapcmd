import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import type { StagedCommand } from "../../../features/launcher/types";
import { fallbackTerminalOptions } from "../../../features/terminals/fallbackTerminals";
import { currentLocale, setAppLocale } from "../../../i18n";
import { createCommandExecutor } from "../../../services/commandExecutor";
import { useSettingsStore } from "../../../stores/settingsStore";
import { createAppWindowResolver } from "../useAppWindowResolver";
import { useHotkeyBindings } from "../../settings/useHotkeyBindings";
import { useTheme } from "../useTheme";
import { useCommandCatalog } from "../../launcher/useCommandCatalog";
import { useLauncherDomBridge } from "../../launcher/useLauncherDomBridge";
import { useLauncherSearch } from "../../launcher/useLauncherSearch";
import { useSearchFocus } from "../../launcher/useSearchFocus";
import { useSettingsWindow } from "../../settings/useSettingsWindow";
import { useCommandManagement } from "../../settings/useCommandManagement";
import { useStagedFeedback } from "../../launcher/useStagedFeedback";
import { useTerminalExecution } from "../../launcher/useTerminalExecution";
import { useUpdateManager } from "../../update/useUpdateManager";
import { HOTKEY_DEFINITIONS, SETTINGS_HASH_PREFIX } from "./constants";
import {
  createAppCompositionRootPorts,
  type AppCompositionRootPorts
} from "./ports";

const FALLBACK_APP_VERSION = "";

function resolveAppVersion(): string {
  return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : FALLBACK_APP_VERSION;
}

function resolveHomepageUrl(): string | null {
  const owner = typeof __GITHUB_OWNER__ === "string" ? __GITHUB_OWNER__.trim() : "";
  const repo = typeof __GITHUB_REPO__ === "string" ? __GITHUB_REPO__.trim() : "";
  return owner && repo ? `https://github.com/${owner}/${repo}` : null;
}

async function openHomepageInBrowser(ports: AppCompositionRootPorts): Promise<void> {
  const url = resolveHomepageUrl();
  if (!url) {
    ports.logError("homepage url is not configured");
    return;
  }

  await ports.openExternalUrl(url);
}

function bindSettingsSideEffects(deps: {
  isSettingsWindow: { value: boolean };
  updateManager: ReturnType<typeof useUpdateManager>;
  language: { value: string };
  windowOpacity: { value: number };
}): void {
  watch(
    () => deps.isSettingsWindow.value,
    (value) => {
      if (value) {
        void deps.updateManager.loadRuntimePlatform();
      }
    },
    { immediate: true }
  );
  watch(
    () => deps.language.value,
    (value) => {
      setAppLocale(value);
    },
    { immediate: true }
  );
  watch(
    () => deps.windowOpacity.value,
    (value) => {
      document.documentElement.style.setProperty("--ui-opacity", String(value));
    },
    { immediate: true }
  );
}

export interface AppCompositionContextOptions {
  ports?: Partial<AppCompositionRootPorts>;
}

export function createAppCompositionContext(options: AppCompositionContextOptions = {}) {
  const ports = createAppCompositionRootPorts(options.ports);
  const settingsStore = useSettingsStore();
  const {
    hotkeys,
    defaultTerminal,
    terminalReusePolicy,
    language,
    autoCheckUpdate,
    launchAtLogin,
    alwaysElevatedTerminal,
    disabledCommandIds,
    windowOpacity,
    theme,
    blurEnabled
  } = storeToRefs(settingsStore);
  const commandCatalog = useCommandCatalog({
    isTauriRuntime: ports.isTauriRuntime,
    readUserCommandFiles: ports.readUserCommandFiles,
    readRuntimePlatform: ports.readRuntimePlatform,
    disabledCommandIds,
    locale: currentLocale
  });
  const search = useLauncherSearch({
    commandSource: commandCatalog.commandTemplates
  });
  const domBridge = useLauncherDomBridge();
  const stagedCommands = ref<StagedCommand[]>([]);
  const hotkeyBindings = useHotkeyBindings({
    hotkeys,
    setHotkey: (field, value) => settingsStore.setHotkey(field, value)
  });
  const resolveAppWindow = createAppWindowResolver(ports.getCurrentWindow);
  const initialWindowLabel = resolveAppWindow()?.label ?? "main";
  const currentWindowLabel = ref(initialWindowLabel);
  const settingsSyncChannel = ref<BroadcastChannel | null>(null);
  const stagedFeedback = useStagedFeedback({
    durationMs: 220
  });
  const stagingGripReorderActive = ref(false);
  const shouldBlockSearchInputFocusRef = ref<() => boolean>(() => false);
  const { scheduleSearchInputFocus } = useSearchFocus({
    searchInputRef: domBridge.searchInputRef,
    shouldBlockFocus: () => shouldBlockSearchInputFocusRef.value()
  });
  const updateManager = useUpdateManager();
  const appVersion = ref(resolveAppVersion());
  const ensureActiveStagingVisibleRef = ref<() => void>(() => {});
  const isSettingsWindow = computed(() => currentWindowLabel.value === "settings");
  const settingsWindow = useSettingsWindow({
    settingsHashPrefix: SETTINGS_HASH_PREFIX,
    hotkeyDefinitions: HOTKEY_DEFINITIONS,
    isSettingsWindow,
    defaultTerminal,
    terminalReusePolicy,
    language,
    autoCheckUpdate,
    launchAtLogin,
    alwaysElevatedTerminal,
    settingsStore,
    getHotkeyValue: hotkeyBindings.getHotkeyValue,
    setHotkeyValue: hotkeyBindings.setHotkeyValue,
    isTauriRuntime: ports.isTauriRuntime,
    readAvailableTerminals: ports.readAvailableTerminals,
    readAutoStartEnabled: ports.readAutoStartEnabled,
    writeAutoStartEnabled: ports.writeAutoStartEnabled,
    writeLauncherHotkey: ports.writeLauncherHotkey,
    fallbackTerminalOptions,
    broadcastSettingsUpdated: () => {
      settingsSyncChannel.value?.postMessage({ type: "settings-updated" });
    }
  });
  const commandExecutor = createCommandExecutor();
  const { runCommandInTerminal, runCommandsInTerminal } = useTerminalExecution({
    commandExecutor,
    defaultTerminal,
    alwaysElevatedTerminal,
    terminalReusePolicy,
    availableTerminals: settingsWindow.availableTerminals,
    fallbackTerminalOptions,
    isTauriRuntime: ports.isTauriRuntime,
    readAvailableTerminals: ports.readAvailableTerminals,
    persistCorrectedTerminal: () => {
      settingsStore.persist();
      settingsSyncChannel.value?.postMessage({ type: "settings-updated" });
    }
  });
  bindSettingsSideEffects({ isSettingsWindow, updateManager, language, windowOpacity });
  const themeManager = useTheme({ themeId: theme, blurEnabled });
  const commandManagement = useCommandManagement({
    allCommandTemplates: commandCatalog.allCommandTemplates,
    disabledCommandIds,
    commandSourceById: commandCatalog.commandSourceById,
    userCommandSourceById: commandCatalog.userCommandSourceById,
    overriddenCommandIds: commandCatalog.overriddenCommandIds,
    loadIssues: commandCatalog.loadIssues,
    setCommandEnabled: settingsStore.setCommandEnabled.bind(settingsStore),
    setDisabledCommandIds: settingsStore.setDisabledCommandIds.bind(settingsStore)
  });

  return {
    search, commandCatalog, domBridge, stagedCommands, hotkeyBindings,
    defaultTerminal, terminalReusePolicy, language, autoCheckUpdate, launchAtLogin, alwaysElevatedTerminal,
    currentWindowLabel, settingsSyncChannel, resolveAppWindow,
    runCommandInTerminal, runCommandsInTerminal, stagedFeedback, stagingGripReorderActive,
    shouldBlockSearchInputFocusRef, scheduleSearchInputFocus, appVersion,
    updateStatus: updateManager.updateStatus, runtimePlatform: updateManager.runtimePlatform,
    checkUpdate: updateManager.checkUpdate, downloadUpdate: updateManager.downloadUpdate,
    openHomepage: () => openHomepageInBrowser(ports),
    ensureActiveStagingVisibleRef, isSettingsWindow, settingsWindow, commandManagement,
    windowOpacity, theme, blurEnabled, themeManager, ports,
    setWindowOpacity: (value: number) => settingsStore.setWindowOpacity(value),
    setTheme: (value: string) => settingsStore.setTheme(value),
    setBlurEnabled: (value: boolean) => settingsStore.setBlurEnabled(value)
  };
}
