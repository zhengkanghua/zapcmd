import { storeToRefs } from "pinia";
import { ref, watch, type Ref } from "vue";
import { fallbackTerminalOptions } from "../../../features/terminals/fallbackTerminals";
import { currentLocale, setAppLocale } from "../../../i18n";
import { useSettingsStore } from "../../../stores/settingsStore";
import { useCommandCatalog } from "../../launcher/useCommandCatalog";
import { useHotkeyBindings } from "../../settings/useHotkeyBindings";
import { useCommandManagement } from "../../settings/useCommandManagement";
import { useSettingsWindow } from "../../settings/useSettingsWindow";
import { useUpdateManager } from "../../update/useUpdateManager";
import { useMotionPreset } from "../useMotionPreset";
import { useTheme } from "../useTheme";
import { HOTKEY_DEFINITIONS, SETTINGS_HASH_PREFIX } from "./constants";
import type { AppCompositionRootPorts } from "./ports";

const FALLBACK_APP_VERSION = "";

type SettingsStoreRefs = ReturnType<typeof createSettingsStoreRefs>;

/**
 * 共享的 Settings Scene 只负责装配设置相关依赖与副作用，
 * 让主窗口与设置窗口复用同一份事实源，而不是各自再拼一套。
 */
export type SettingsScene = SettingsStoreRefs & {
  settingsStore: ReturnType<typeof useSettingsStore>;
  hotkeyBindings: ReturnType<typeof useHotkeyBindings>;
  settingsWindow: ReturnType<typeof useSettingsWindow>;
  commandCatalog: ReturnType<typeof useCommandCatalog>;
  commandManagement: ReturnType<typeof useCommandManagement>;
  updateManager: ReturnType<typeof useUpdateManager>;
  themeManager: ReturnType<typeof useTheme>;
  motionPresetManager: ReturnType<typeof useMotionPreset>;
  appVersion: Ref<string>;
  openHomepage: () => Promise<void>;
};

export interface CreateSettingsSceneOptions {
  ports: AppCompositionRootPorts;
  isSettingsWindow: Ref<boolean>;
  settingsSyncChannel: Ref<BroadcastChannel | null>;
}

function resolveAppVersion(): string {
  return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : FALLBACK_APP_VERSION;
}

function resolveHomepageUrl(): string | null {
  const owner = typeof __GITHUB_OWNER__ === "string" ? __GITHUB_OWNER__.trim() : "";
  const repo = typeof __GITHUB_REPO__ === "string" ? __GITHUB_REPO__.trim() : "";
  return owner && repo ? `https://github.com/${owner}/${repo}` : null;
}

function createSettingsStoreRefs(settingsStore: ReturnType<typeof useSettingsStore>) {
  return storeToRefs(settingsStore);
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
  isSettingsWindow: Ref<boolean>;
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

/**
 * 创建一套可复用的 settings scene 装配。
 * 这里故意只收拢 Settings 相关状态，不引入跨窗口共享单例。
 */
export function createSettingsScene(options: CreateSettingsSceneOptions): SettingsScene {
  const settingsStore = useSettingsStore();
  settingsStore.hydrateFromStorage();

  const settingsRefs = createSettingsStoreRefs(settingsStore);
  const updateManager = useUpdateManager();
  const hotkeyBindings = useHotkeyBindings({
    hotkeys: settingsRefs.hotkeys,
    setHotkey: (field, value) => {
      settingsStore.setHotkey(field, value);
    }
  });
  const settingsWindow = useSettingsWindow({
    settingsHashPrefix: SETTINGS_HASH_PREFIX,
    hotkeyDefinitions: HOTKEY_DEFINITIONS,
    isSettingsWindow: options.isSettingsWindow,
    defaultTerminal: settingsRefs.defaultTerminal,
    terminalReusePolicy: settingsRefs.terminalReusePolicy,
    language: settingsRefs.language,
    autoCheckUpdate: settingsRefs.autoCheckUpdate,
    launchAtLogin: settingsRefs.launchAtLogin,
    alwaysElevatedTerminal: settingsRefs.alwaysElevatedTerminal,
    settingsStore,
    getHotkeyValue: hotkeyBindings.getHotkeyValue,
    setHotkeyValue: hotkeyBindings.setHotkeyValue,
    isTauriRuntime: options.ports.isTauriRuntime,
    readAvailableTerminals: options.ports.readAvailableTerminals,
    readAutoStartEnabled: options.ports.readAutoStartEnabled,
    writeAutoStartEnabled: options.ports.writeAutoStartEnabled,
    writeLauncherHotkey: options.ports.writeLauncherHotkey,
    fallbackTerminalOptions,
    broadcastSettingsUpdated: () => {
      options.settingsSyncChannel.value?.postMessage({ type: "settings-updated" });
    }
  });
  const commandCatalog = useCommandCatalog({
    isTauriRuntime: options.ports.isTauriRuntime,
    readUserCommandFiles: options.ports.readUserCommandFiles,
    readRuntimePlatform: options.ports.readRuntimePlatform,
    disabledCommandIds: settingsRefs.disabledCommandIds,
    locale: currentLocale
  });
  const commandManagement = useCommandManagement({
    allCommandTemplates: commandCatalog.allCommandTemplates,
    disabledCommandIds: settingsRefs.disabledCommandIds,
    commandSourceById: commandCatalog.commandSourceById,
    userCommandSourceById: commandCatalog.userCommandSourceById,
    overriddenCommandIds: commandCatalog.overriddenCommandIds,
    loadIssues: commandCatalog.loadIssues,
    setCommandEnabled: settingsStore.setCommandEnabled.bind(settingsStore),
    setDisabledCommandIds: settingsStore.setDisabledCommandIds.bind(settingsStore)
  });
  const themeManager = useTheme({
    themeId: settingsRefs.theme,
    blurEnabled: settingsRefs.blurEnabled
  });
  const motionPresetManager = useMotionPreset({
    presetId: settingsRefs.motionPreset
  });

  bindSettingsSideEffects({
    isSettingsWindow: options.isSettingsWindow,
    updateManager,
    language: settingsRefs.language,
    windowOpacity: settingsRefs.windowOpacity
  });

  return {
    settingsStore,
    ...settingsRefs,
    hotkeyBindings,
    settingsWindow,
    commandCatalog,
    commandManagement,
    updateManager,
    themeManager,
    motionPresetManager,
    appVersion: ref(resolveAppVersion()),
    openHomepage: () => openHomepageInBrowser(options.ports)
  };
}
