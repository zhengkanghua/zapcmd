import { storeToRefs } from "pinia";
import { computed, onScopeDispose, ref, watch, type Ref } from "vue";
import { fallbackTerminalOptions } from "../../../features/terminals/fallbackTerminals";
import { currentLocale, setAppLocale, t } from "../../../i18n";
import {
  openExternalTarget,
  type ExternalTargetOpenResult
} from "../../../services/externalNavigator";
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
const HOMEPAGE_ACTION_STATUS_DISMISS_DELAY_MS = 2800;

type SettingsStoreRefs = ReturnType<typeof createSettingsStoreRefs>;

export interface SettingsActionStatus {
  tone: "success" | "error";
  message: string;
}

export interface SettingsExternalActionResult {
  ok: boolean;
  code: ExternalTargetOpenResult["code"];
  message: string;
  detail?: string;
  url?: string;
}

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
  homepageActionStatus: Ref<SettingsActionStatus | null>;
  openHomepage: () => Promise<SettingsExternalActionResult>;
};

export interface CreateSettingsSceneOptions {
  ports: AppCompositionRootPorts;
  isSettingsWindow: Ref<boolean>;
  settingsSyncChannel: Ref<BroadcastChannel | null>;
  resolveHomepageUrl?: () => string | null;
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

function mapHomepageOpenResult(
  result: ExternalTargetOpenResult
): SettingsExternalActionResult {
  if (result.ok) {
    return {
      ...result,
      message: t("settings.about.openHomepageSuccess")
    };
  }

  if (result.code === "missing-url") {
    return {
      ...result,
      message: t("settings.about.openHomepageMissing"),
      detail: result.message
    };
  }

  return {
    ...result,
    message: t("settings.about.openHomepageFailed", { reason: result.message }),
    detail: result.message
  };
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

function createHomepageActionStatusController() {
  const homepageActionStatus = ref<SettingsActionStatus | null>(null);
  let homepageActionStatusTimer: ReturnType<typeof setTimeout> | null = null;

  function clearHomepageActionStatusTimer(): void {
    if (!homepageActionStatusTimer) {
      return;
    }
    clearTimeout(homepageActionStatusTimer);
    homepageActionStatusTimer = null;
  }

  function showHomepageActionStatus(status: SettingsActionStatus): void {
    clearHomepageActionStatusTimer();
    homepageActionStatus.value = status;
    homepageActionStatusTimer = setTimeout(() => {
      homepageActionStatus.value = null;
      homepageActionStatusTimer = null;
    }, HOMEPAGE_ACTION_STATUS_DISMISS_DELAY_MS);
  }

  onScopeDispose(() => {
    clearHomepageActionStatusTimer();
  });

  return {
    homepageActionStatus,
    showHomepageActionStatus
  };
}

function createSettingsSceneRuntime(params: {
  options: CreateSettingsSceneOptions;
  settingsStore: ReturnType<typeof useSettingsStore>;
  settingsRefs: SettingsStoreRefs;
}) {
  const updateManager = useUpdateManager({
    readRuntimePlatform: params.options.ports.readRuntimePlatform
  });
  const hotkeyBindings = useHotkeyBindings({
    hotkeys: params.settingsRefs.hotkeys,
    pointerActions: params.settingsRefs.pointerActions,
    setHotkey: (field, value) => {
      params.settingsStore.setHotkey(field, value);
    }
  });
  const settingsWindow = useSettingsWindow({
    settingsHashPrefix: SETTINGS_HASH_PREFIX,
    hotkeyDefinitions: HOTKEY_DEFINITIONS,
    isSettingsWindow: params.options.isSettingsWindow,
    defaultTerminal: params.settingsRefs.defaultTerminal,
    terminalReusePolicy: params.settingsRefs.terminalReusePolicy,
    language: params.settingsRefs.language,
    autoCheckUpdate: params.settingsRefs.autoCheckUpdate,
    launchAtLogin: params.settingsRefs.launchAtLogin,
    alwaysElevatedTerminal: params.settingsRefs.alwaysElevatedTerminal,
    pointerActions: params.settingsRefs.pointerActions,
    settingsStore: params.settingsStore,
    getHotkeyValue: hotkeyBindings.getHotkeyValue,
    setHotkeyValue: hotkeyBindings.setHotkeyValue,
    isTauriRuntime: params.options.ports.isTauriRuntime,
    readAvailableTerminals: params.options.ports.readAvailableTerminals,
    refreshAvailableTerminals: params.options.ports.refreshAvailableTerminals,
    readAutoStartEnabled: params.options.ports.readAutoStartEnabled,
    writeAutoStartEnabled: params.options.ports.writeAutoStartEnabled,
    writeLauncherHotkey: params.options.ports.writeLauncherHotkey,
    fallbackTerminalOptions,
    broadcastSettingsUpdated: () => {
      params.options.settingsSyncChannel.value?.postMessage({ type: "settings-updated" });
    }
  });
  const commandCatalogActivated = computed(
    () =>
      !params.options.isSettingsWindow.value ||
      settingsWindow.settingsRoute.value === "commands"
  );
  const commandCatalog = useCommandCatalog({
    isTauriRuntime: params.options.ports.isTauriRuntime,
    scanUserCommandFiles: params.options.ports.scanUserCommandFiles,
    readUserCommandFile: params.options.ports.readUserCommandFile,
    readRuntimePlatform: params.options.ports.readRuntimePlatform,
    disabledCommandIds: params.settingsRefs.disabledCommandIds,
    locale: currentLocale,
    activated: commandCatalogActivated
  });
  const commandManagement = useCommandManagement({
    allCommandTemplates: commandCatalog.allCommandTemplates,
    disabledCommandIds: params.settingsRefs.disabledCommandIds,
    commandSourceById: commandCatalog.commandSourceById,
    userCommandSourceById: commandCatalog.userCommandSourceById,
    overriddenCommandIds: commandCatalog.overriddenCommandIds,
    loadIssues: commandCatalog.loadIssues,
    setCommandEnabled: params.settingsStore.setCommandEnabled.bind(params.settingsStore),
    setDisabledCommandIds: params.settingsStore.setDisabledCommandIds.bind(params.settingsStore)
  });
  const themeManager = useTheme({
    themeId: params.settingsRefs.theme,
    blurEnabled: params.settingsRefs.blurEnabled
  });
  const motionPresetManager = useMotionPreset({
    presetId: params.settingsRefs.motionPreset
  });

  return {
    updateManager,
    hotkeyBindings,
    settingsWindow,
    commandCatalog,
    commandManagement,
    themeManager,
    motionPresetManager
  };
}

/**
 * 创建一套可复用的 settings scene 装配。
 * 这里故意只收拢 Settings 相关状态，不引入跨窗口共享单例。
 */
export function createSettingsScene(options: CreateSettingsSceneOptions): SettingsScene {
  const settingsStore = useSettingsStore();
  const settingsRefs = createSettingsStoreRefs(settingsStore);
  const { homepageActionStatus, showHomepageActionStatus } =
    createHomepageActionStatusController();
  const {
    updateManager,
    hotkeyBindings,
    settingsWindow,
    commandCatalog,
    commandManagement,
    themeManager,
    motionPresetManager
  } = createSettingsSceneRuntime({
    options,
    settingsStore,
    settingsRefs
  });

  bindSettingsSideEffects({
    isSettingsWindow: options.isSettingsWindow,
    updateManager,
    language: settingsRefs.language,
    windowOpacity: settingsRefs.windowOpacity
  });

  async function openHomepage(): Promise<SettingsExternalActionResult> {
    const result = await openExternalTarget({
      url: options.resolveHomepageUrl?.() ?? resolveHomepageUrl(),
      targetName: "homepage",
      openExternalUrl: options.ports.openExternalUrl,
      logError: options.ports.logError
    });
    const translatedResult = mapHomepageOpenResult(result);
    showHomepageActionStatus({
      tone: translatedResult.ok ? "success" : "error",
      message: translatedResult.message
    });
    return translatedResult;
  }

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
    homepageActionStatus,
    openHomepage
  };
}
