import { storeToRefs } from "pinia";
import type { Ref } from "vue";
import { currentLocale } from "../../../i18n";
import { useCommandCatalog } from "../../launcher/useCommandCatalog";
import { useHotkeyBindings } from "../../settings/useHotkeyBindings";
import { useSettingsStore } from "../../../stores/settingsStore";
import type { AppCompositionRootPorts } from "./ports";

function createSettingsStoreRefs(settingsStore: ReturnType<typeof useSettingsStore>) {
  return storeToRefs(settingsStore);
}

export type SettingsStoreRefs = ReturnType<typeof createSettingsStoreRefs>;

interface CreateSharedSettingsFactsOptions {
  ports: AppCompositionRootPorts;
  hydrateFromStorage?: boolean;
}

interface CreateCommandCatalogOptions {
  activated?: Readonly<Ref<boolean>>;
}

function createSharedSettingsFacts(options: CreateSharedSettingsFactsOptions) {
  const settingsStore = useSettingsStore();
  if (options.hydrateFromStorage) {
    settingsStore.hydrateFromStorage();
  }

  const settingsRefs = createSettingsStoreRefs(settingsStore);
  const hotkeyBindings = useHotkeyBindings({
    hotkeys: settingsRefs.hotkeys,
    pointerActions: settingsRefs.pointerActions,
    setHotkey: (field, value) => {
      settingsStore.setHotkey(field, value);
    }
  });

  function createCommandCatalog(options: CreateCommandCatalogOptions = {}) {
    return useCommandCatalog({
      isTauriRuntime: optionsRef.ports.isTauriRuntime,
      scanUserCommandFiles: optionsRef.ports.scanUserCommandFiles,
      readUserCommandFile: optionsRef.ports.readUserCommandFile,
      readRuntimePlatform: optionsRef.ports.readRuntimePlatform,
      disabledCommandIds: settingsRefs.disabledCommandIds,
      locale: currentLocale,
      activated: options.activated
    });
  }

  const optionsRef = options;

  return {
    settingsStore,
    settingsRefs,
    hotkeyBindings,
    createCommandCatalog
  };
}

/**
 * Launcher 入口只拿运行时需要的设置事实源，避免顺手装配完整 Settings scene。
 */
export function createLauncherSettingsFacts(options: {
  ports: AppCompositionRootPorts;
}) {
  const facts = createSharedSettingsFacts({
    ports: options.ports,
    hydrateFromStorage: true
  });

  return {
    ...facts,
    commandCatalog: facts.createCommandCatalog()
  };
}

/**
 * Settings scene 复用同一批 store refs / hotkey bindings，再按窗口专属状态补 scene 依赖。
 */
export function createSettingsSceneFacts(options: {
  ports: AppCompositionRootPorts;
}) {
  return createSharedSettingsFacts({
    ports: options.ports,
    hydrateFromStorage: false
  });
}
