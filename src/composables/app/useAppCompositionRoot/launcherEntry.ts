import { storeToRefs } from "pinia";
import { computed, ref, watch, type Ref } from "vue";
import { currentLocale, setAppLocale } from "../../../i18n";
import { fallbackTerminalOptions, type TerminalOption } from "../../../features/terminals/fallbackTerminals";
import { resolveEffectiveTerminal } from "../../../features/terminals/resolveEffectiveTerminal";
import type { StagedCommand } from "../../../features/launcher/types";
import { createCommandExecutor } from "../../../services/commandExecutor";
import { useLauncherDomBridge } from "../../launcher/useLauncherDomBridge";
import { useLauncherSearch } from "../../launcher/useLauncherSearch";
import { useSearchFocus } from "../../launcher/useSearchFocus";
import { useStagedFeedback } from "../../launcher/useStagedFeedback";
import { useTerminalExecution } from "../../launcher/useTerminalExecution";
import { useCommandCatalog } from "../../launcher/useCommandCatalog";
import { useHotkeyBindings } from "../../settings/useHotkeyBindings";
import { useMotionPreset } from "../useMotionPreset";
import { useTheme } from "../useTheme";
import { createAppWindowResolver } from "../useAppWindowResolver";
import { useSettingsStore } from "../../../stores/settingsStore";
import type { createAppCompositionContext } from "./context";
import { createAppShellVm } from "./appShellVm";
import { createLauncherVm } from "./launcherVm";
import { createAppCompositionRootPorts, type AppCompositionRootPorts } from "./ports";
import { createAppCompositionRuntime } from "./runtime";

export interface UseLauncherEntryOptions {
  ports?: Partial<AppCompositionRootPorts>;
}

function createSettingsSyncBroadcaster(
  settingsStore: ReturnType<typeof useSettingsStore>,
  settingsSyncChannel: { value: BroadcastChannel | null }
) {
  return () => {
    settingsStore.persist();
    settingsSyncChannel.value?.postMessage({ type: "settings-updated" });
  };
}

function ensureDefaultTerminal(params: {
  defaultTerminal: { value: string };
  availableTerminals: { value: TerminalOption[] };
  settingsStore: ReturnType<typeof useSettingsStore>;
}): boolean {
  const resolution = resolveEffectiveTerminal(
    params.defaultTerminal.value,
    params.availableTerminals.value,
    fallbackTerminalOptions()
  );
  if (!resolution.effectiveId || !resolution.corrected) {
    return false;
  }
  params.settingsStore.setDefaultTerminal(resolution.effectiveId);
  return true;
}

function createLauncherSettingsWindow(params: {
  ports: AppCompositionRootPorts;
  settingsStore: ReturnType<typeof useSettingsStore>;
  defaultTerminal: { value: string };
  availableTerminals: { value: TerminalOption[] };
  terminalLoading: { value: boolean };
  settingsSyncChannel: { value: BroadcastChannel | null };
}) {
  const broadcastPersistedSettings = createSettingsSyncBroadcaster(
    params.settingsStore,
    params.settingsSyncChannel
  );

  async function loadAvailableTerminals(): Promise<void> {
    params.terminalLoading.value = true;
    try {
      if (!params.ports.isTauriRuntime()) {
        params.availableTerminals.value = fallbackTerminalOptions();
      } else {
        const terminals = await params.ports.readAvailableTerminals();
        params.availableTerminals.value =
          Array.isArray(terminals) && terminals.length > 0 ? terminals : fallbackTerminalOptions();
      }
      if (ensureDefaultTerminal(params)) {
        broadcastPersistedSettings();
      }
    } catch (error) {
      console.warn("launcher terminal bootstrap failed; using fallback", error);
      params.availableTerminals.value = fallbackTerminalOptions();
      if (ensureDefaultTerminal(params)) {
        broadcastPersistedSettings();
      }
    } finally {
      params.terminalLoading.value = false;
    }
  }

  return {
    availableTerminals: params.availableTerminals,
    terminalLoading: params.terminalLoading,
    loadSettings(): void {
      params.settingsStore.hydrateFromStorage();
      if (params.availableTerminals.value.length > 0 && ensureDefaultTerminal(params)) {
        broadcastPersistedSettings();
      }
    },
    loadAvailableTerminals,
    applySettingsRouteFromHash(): void {},
    onSettingsHashChange(): void {},
    onGlobalPointerDown(_event: PointerEvent): void {}
  };
}

function bindLauncherAppearanceState(params: {
  language: Ref<string>;
  windowOpacity: Ref<number>;
  theme: Ref<string>;
  blurEnabled: Ref<boolean>;
  motionPreset: Ref<string>;
}): void {
  watch(
    () => params.language.value,
    (value) => {
      setAppLocale(value);
    },
    { immediate: true }
  );
  watch(
    () => params.windowOpacity.value,
    (value) => {
      document.documentElement.style.setProperty("--ui-opacity", String(value));
    },
    { immediate: true }
  );
  useTheme({
    themeId: params.theme,
    blurEnabled: params.blurEnabled
  });
  useMotionPreset({
    presetId: params.motionPreset
  });
}

function createLauncherRuntimeContext(params: {
  search: ReturnType<typeof useLauncherSearch>;
  commandCatalog: ReturnType<typeof useCommandCatalog>;
  domBridge: ReturnType<typeof useLauncherDomBridge>;
  stagedCommands: { value: StagedCommand[] };
  hotkeyBindings: ReturnType<typeof useHotkeyBindings>;
  pointerActions: { value: { leftClick: string; rightClick: string } };
  defaultTerminal: { value: string };
  terminalReusePolicy: { value: string };
  language: { value: string };
  autoCheckUpdate: { value: boolean };
  launchAtLogin: { value: boolean };
  alwaysElevatedTerminal: { value: boolean };
  currentWindowLabel: { value: string };
  settingsSyncChannel: { value: BroadcastChannel | null };
  resolveAppWindow: () => unknown;
  runCommandInTerminal: ReturnType<typeof useTerminalExecution>["runCommandInTerminal"];
  runCommandsInTerminal: ReturnType<typeof useTerminalExecution>["runCommandsInTerminal"];
  stagedFeedback: ReturnType<typeof useStagedFeedback>;
  stagingGripReorderActive: { value: boolean };
  shouldBlockSearchInputFocusRef: { value: () => boolean };
  scheduleSearchInputFocus: (selectText?: boolean) => void;
  ensureActiveStagingVisibleRef: { value: () => void };
  isSettingsWindow: { value: boolean };
  settingsWindow: ReturnType<typeof createLauncherSettingsWindow>;
  windowOpacity: { value: number };
  theme: { value: string };
  blurEnabled: { value: boolean };
  motionPreset: { value: string };
  ports: AppCompositionRootPorts;
}) {
  return {
    ...params
  } as ReturnType<typeof createAppCompositionContext>;
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
