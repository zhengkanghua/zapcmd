import { computed, onScopeDispose, ref, watch, type Ref } from "vue";
import { fallbackTerminalOptions } from "../../../features/terminals/fallbackTerminals";
import { setAppLocale, t } from "../../../i18n";
import {
  openExternalTarget,
  type ExternalTargetOpenResult
} from "../../../services/externalNavigator";
import { useCommandManagement } from "../../settings/useCommandManagement";
import { useSettingsWindow } from "../../settings/useSettingsWindow";
import { useUpdateManager } from "../../update/useUpdateManager";
import { useMotionPreset } from "../useMotionPreset";
import { useTheme } from "../useTheme";
import { HOTKEY_DEFINITIONS, SETTINGS_HASH_PREFIX } from "./constants";
import type { AppCompositionRootPorts } from "./ports";
import { createSettingsSceneFacts, type SettingsStoreRefs } from "./settingsFacts";

const FALLBACK_APP_VERSION = "";
const HOMEPAGE_ACTION_STATUS_DISMISS_DELAY_MS = 2800;
type SettingsSceneFacts = ReturnType<typeof createSettingsSceneFacts>;
type SettingsSceneCommandCatalog = ReturnType<SettingsSceneFacts["createCommandCatalog"]>;

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
  settingsStore: SettingsSceneFacts["settingsStore"];
  hotkeyBindings: SettingsSceneFacts["hotkeyBindings"];
  settingsWindow: ReturnType<typeof useSettingsWindow>;
  commandCatalog: SettingsSceneCommandCatalog;
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
  facts: SettingsSceneFacts;
}) {
  const { settingsStore, settingsRefs, hotkeyBindings } = params.facts;
  const updateManager = useUpdateManager({
    readRuntimePlatform: params.options.ports.readRuntimePlatform
  });
  const settingsWindow = useSettingsWindow({
    settingsHashPrefix: SETTINGS_HASH_PREFIX,
    hotkeyDefinitions: HOTKEY_DEFINITIONS,
    isSettingsWindow: params.options.isSettingsWindow,
    defaultTerminal: settingsRefs.defaultTerminal,
    terminalReusePolicy: settingsRefs.terminalReusePolicy,
    language: settingsRefs.language,
    autoCheckUpdate: settingsRefs.autoCheckUpdate,
    launchAtLogin: settingsRefs.launchAtLogin,
    alwaysElevatedTerminal: settingsRefs.alwaysElevatedTerminal,
    pointerActions: settingsRefs.pointerActions,
    settingsStore,
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
  const commandCatalog = params.facts.createCommandCatalog({
    activated: commandCatalogActivated
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
  const facts = createSettingsSceneFacts({
    ports: options.ports
  });
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
    facts
  });

  bindSettingsSideEffects({
    isSettingsWindow: options.isSettingsWindow,
    updateManager,
    language: facts.settingsRefs.language,
    windowOpacity: facts.settingsRefs.windowOpacity
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
    settingsStore: facts.settingsStore,
    ...facts.settingsRefs,
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
