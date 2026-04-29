import { computed, ref, type Ref } from "vue";
import type { StagedCommand } from "../../../features/launcher/types";
import {
  fallbackTerminalOptions,
  type TerminalOption
} from "../../../features/terminals/fallbackTerminals";
import { createCommandExecutor } from "../../../services/commandExecutor";
import { createAppWindowResolver } from "../useAppWindowResolver";
import { useLauncherDomBridge } from "../../launcher/useLauncherDomBridge";
import { useLauncherSearch } from "../../launcher/useLauncherSearch";
import { useSearchFocus } from "../../launcher/useSearchFocus";
import { useStagedFeedback } from "../../launcher/useStagedFeedback";
import { useTerminalExecution } from "../../launcher/useTerminalExecution";
import type { UseCommandCatalogReturn } from "../../launcher/useCommandCatalog";
import type { AppCompositionRootPorts } from "./ports";

export interface AppWindowRuntimeState {
  settingsSyncChannel: Ref<BroadcastChannel | null>;
  currentWindowLabel: Ref<string>;
  isSettingsWindow: Readonly<Ref<boolean>>;
  resolveAppWindow: () => ReturnType<AppCompositionRootPorts["getCurrentWindow"]> | null;
}

interface CreateLauncherRuntimeAssemblyOptions {
  ports: AppCompositionRootPorts;
  commandCatalog: UseCommandCatalogReturn;
  currentWindowLabel: Ref<string>;
  settingsSyncChannel: Ref<BroadcastChannel | null>;
  resolveAppWindow: () => ReturnType<AppCompositionRootPorts["getCurrentWindow"]> | null;
  defaultTerminal: Ref<string>;
  alwaysElevatedTerminal: Ref<boolean>;
  availableTerminals: Ref<TerminalOption[]>;
  availableTerminalsTrusted: Ref<boolean>;
  persistCorrectedTerminal: () => void;
}

interface CreateWindowScopedLauncherRuntimeOptions {
  ports: AppCompositionRootPorts;
  windowRuntime: AppWindowRuntimeState;
  commandCatalog: UseCommandCatalogReturn;
  defaultTerminal: Ref<string>;
  alwaysElevatedTerminal: Ref<boolean>;
  availableTerminals: Ref<TerminalOption[]>;
  availableTerminalsTrusted: Ref<boolean>;
  persistCorrectedTerminal: () => void;
}

/**
 * 统一创建窗口级基础状态，避免 Launcher / App context 重复拼接 window label 与 resolver。
 */
export function createAppWindowRuntimeState(
  ports: AppCompositionRootPorts,
  fallbackLabel = "main"
): AppWindowRuntimeState {
  const settingsSyncChannel = ref<BroadcastChannel | null>(null);
  const isTauriRuntime = ports.isTauriRuntime();
  const resolveAppWindow = createAppWindowResolver(ports.getCurrentWindow, {
    suppressWarning: !isTauriRuntime
  });
  const currentWindowLabel = ref(
    isTauriRuntime ? resolveAppWindow()?.label ?? fallbackLabel : fallbackLabel
  );
  const isSettingsWindow = computed(() => currentWindowLabel.value === "settings");

  return {
    settingsSyncChannel,
    currentWindowLabel,
    isSettingsWindow,
    resolveAppWindow
  };
}

/**
 * 收拢 Launcher 运行时的共享装配，保证 search / focus / terminal execution / staged feedback
 * 在完整 app context 与最小 Launcher 入口之间走同一条构建路径，避免行为漂移。
 */
export function createLauncherRuntimeAssembly(
  options: CreateLauncherRuntimeAssemblyOptions
) {
  const search = useLauncherSearch({
    commandSource: options.commandCatalog.commandTemplates
  });
  const domBridge = useLauncherDomBridge();
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
  const commandExecutor = createCommandExecutor();
  const { runCommandInTerminal, runCommandsInTerminal } = useTerminalExecution({
    commandExecutor,
    defaultTerminal: options.defaultTerminal,
    alwaysElevatedTerminal: options.alwaysElevatedTerminal,
    availableTerminals: options.availableTerminals,
    availableTerminalsTrusted: options.availableTerminalsTrusted,
    fallbackTerminalOptions,
    isTauriRuntime: options.ports.isTauriRuntime,
    readAvailableTerminals: options.ports.readAvailableTerminals,
    persistCorrectedTerminal: options.persistCorrectedTerminal
  });
  return {
    search,
    domBridge,
    stagedCommands,
    stagedFeedback,
    stagingGripReorderActive,
    shouldBlockSearchInputFocusRef,
    scheduleSearchInputFocus,
    ensureActiveStagingVisibleRef,
    currentWindowLabel: options.currentWindowLabel,
    settingsSyncChannel: options.settingsSyncChannel,
    resolveAppWindow: options.resolveAppWindow,
    runCommandInTerminal,
    runCommandsInTerminal
  };
}

/**
 * 基于既有 windowRuntime 统一构造 Launcher runtime，避免 context / launcher entry
 * 分别手动转发 currentWindowLabel、settingsSyncChannel、resolveAppWindow。
 */
export function createWindowScopedLauncherRuntime(
  options: CreateWindowScopedLauncherRuntimeOptions
) {
  return createLauncherRuntimeAssembly({
    ports: options.ports,
    commandCatalog: options.commandCatalog,
    currentWindowLabel: options.windowRuntime.currentWindowLabel,
    settingsSyncChannel: options.windowRuntime.settingsSyncChannel,
    resolveAppWindow: options.windowRuntime.resolveAppWindow,
    defaultTerminal: options.defaultTerminal,
    alwaysElevatedTerminal: options.alwaysElevatedTerminal,
    availableTerminals: options.availableTerminals,
    availableTerminalsTrusted: options.availableTerminalsTrusted,
    persistCorrectedTerminal: options.persistCorrectedTerminal
  });
}
