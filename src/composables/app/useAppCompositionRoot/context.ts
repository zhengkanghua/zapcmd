import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import type { StagedCommand } from "../../../features/launcher/types";
import { fallbackTerminalOptions } from "../../../features/terminals/fallbackTerminals";
import { currentLocale, setAppLocale } from "../../../i18n";
import { createCommandExecutor } from "../../../services/commandExecutor";
import { open } from "@tauri-apps/plugin-shell";
import {
  readUserCommandFiles,
  readRuntimePlatform,
  readAvailableTerminals,
  readAutoStartEnabled,
  writeAutoStartEnabled,
  writeLauncherHotkey
} from "../../../services/tauriBridge";
import { useSettingsStore } from "../../../stores/settingsStore";
import { createAppWindowResolver } from "../useAppWindowResolver";
import { useHotkeyBindings } from "../../settings/useHotkeyBindings";
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

const FALLBACK_APP_VERSION = "";

function resolveAppVersion(): string {
  return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : FALLBACK_APP_VERSION;
}

function resolveHomepageUrl(): string | null {
  const owner = typeof __GITHUB_OWNER__ === "string" ? __GITHUB_OWNER__.trim() : "";
  const repo = typeof __GITHUB_REPO__ === "string" ? __GITHUB_REPO__.trim() : "";
  return owner && repo ? `https://github.com/${owner}/${repo}` : null;
}

async function openHomepageInBrowser(): Promise<void> {
  const url = resolveHomepageUrl();
  if (!url) {
    console.error("homepage url is not configured");
    return;
  }

  if (isTauri()) {
    await open(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
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

export function createAppCompositionContext() {
  const settingsStore = useSettingsStore();
  const {
    hotkeys,
    defaultTerminal,
    language,
    autoCheckUpdate,
    launchAtLogin,
    disabledCommandIds,
    commandView,
    windowOpacity
  } = storeToRefs(settingsStore);
  const commandCatalog = useCommandCatalog({
    isTauriRuntime: isTauri,
    readUserCommandFiles,
    readRuntimePlatform,
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
  const resolveAppWindow = createAppWindowResolver(getCurrentWindow);
  const initialWindowLabel = resolveAppWindow()?.label ?? "main";
  const currentWindowLabel = ref(initialWindowLabel);
  const settingsSyncChannel = ref<BroadcastChannel | null>(null);
  const commandExecutor = createCommandExecutor();
  const { runCommandInTerminal, runCommandsInTerminal } = useTerminalExecution({
    commandExecutor,
    defaultTerminal
  });
  const stagedFeedback = useStagedFeedback({
    durationMs: 220
  });
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
    language,
    autoCheckUpdate,
    launchAtLogin,
    settingsStore,
    getHotkeyValue: hotkeyBindings.getHotkeyValue,
    setHotkeyValue: hotkeyBindings.setHotkeyValue,
    isTauriRuntime: isTauri,
    readAvailableTerminals,
    readAutoStartEnabled,
    writeAutoStartEnabled,
    writeLauncherHotkey,
    fallbackTerminalOptions,
    broadcastSettingsUpdated: () => {
      settingsSyncChannel.value?.postMessage({ type: "settings-updated" });
    }
  });
  bindSettingsSideEffects({ isSettingsWindow, updateManager, language, windowOpacity });
  const commandManagement = useCommandManagement({
    allCommandTemplates: commandCatalog.allCommandTemplates,
    disabledCommandIds,
    commandSourceById: commandCatalog.commandSourceById,
    userCommandSourceById: commandCatalog.userCommandSourceById,
    overriddenCommandIds: commandCatalog.overriddenCommandIds,
    loadIssues: commandCatalog.loadIssues,
    commandView,
    setCommandEnabled: settingsStore.setCommandEnabled.bind(settingsStore),
    setDisabledCommandIds: settingsStore.setDisabledCommandIds.bind(settingsStore),
    setCommandViewState: settingsStore.setCommandViewState.bind(settingsStore)
  });

  return {
    search,
    commandCatalog,
    domBridge,
    stagedCommands,
    hotkeyBindings,
    defaultTerminal,
    language,
    autoCheckUpdate,
    launchAtLogin,
    currentWindowLabel,
    settingsSyncChannel,
    resolveAppWindow,
    runCommandInTerminal,
    runCommandsInTerminal,
    stagedFeedback,
    shouldBlockSearchInputFocusRef,
    scheduleSearchInputFocus,
    appVersion,
    updateStatus: updateManager.updateStatus,
    runtimePlatform: updateManager.runtimePlatform,
    checkUpdate: updateManager.checkUpdate,
    downloadUpdate: updateManager.downloadUpdate,
    openHomepage: openHomepageInBrowser,
    ensureActiveStagingVisibleRef,
    isSettingsWindow,
    settingsWindow,
    commandManagement,
    windowOpacity,
    setWindowOpacity: (value: number) => settingsStore.setWindowOpacity(value)
  };
}
