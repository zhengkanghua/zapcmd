import type { Ref } from "vue";
import type { StagedCommand } from "../../../features/launcher/types";
import type { useLauncherDomBridge } from "../../launcher/useLauncherDomBridge";
import type { useLauncherSearch } from "../../launcher/useLauncherSearch";
import type { useStagedFeedback } from "../../launcher/useStagedFeedback";
import type { useTerminalExecution } from "../../launcher/useTerminalExecution";
import type { useCommandCatalog } from "../../launcher/useCommandCatalog";
import type { useHotkeyBindings } from "../../settings/useHotkeyBindings";
import type { PointerActionSettings } from "../../../stores/settingsStore";
import type { AppCompositionRootPorts } from "./ports";
import type { LauncherSettingsWindow } from "./launcherSettingsWindow";

/**
 * Launcher 运行时只依赖主窗口自身的事实源，显式切断对完整 app context 的编译期耦合。
 */
export interface LauncherRuntimeContext {
  search: ReturnType<typeof useLauncherSearch>;
  commandCatalog: ReturnType<typeof useCommandCatalog>;
  domBridge: ReturnType<typeof useLauncherDomBridge>;
  stagedCommands: Ref<StagedCommand[]>;
  hotkeyBindings: ReturnType<typeof useHotkeyBindings>;
  pointerActions: Ref<PointerActionSettings>;
  defaultTerminal: Ref<string>;
  terminalReusePolicy: Ref<string>;
  language: Ref<string>;
  autoCheckUpdate: Ref<boolean>;
  launchAtLogin: Ref<boolean>;
  alwaysElevatedTerminal: Ref<boolean>;
  queueAutoClearOnSuccess: Ref<boolean>;
  currentWindowLabel: Ref<string>;
  settingsSyncChannel: Ref<BroadcastChannel | null>;
  resolveAppWindow: () => ReturnType<AppCompositionRootPorts["getCurrentWindow"]> | null;
  runCommandInTerminal: ReturnType<typeof useTerminalExecution>["runCommandInTerminal"];
  runCommandsInTerminal: ReturnType<typeof useTerminalExecution>["runCommandsInTerminal"];
  stagedFeedback: ReturnType<typeof useStagedFeedback>;
  stagingGripReorderActive: Ref<boolean>;
  shouldBlockSearchInputFocusRef: Ref<() => boolean>;
  scheduleSearchInputFocus: (selectText?: boolean) => void;
  ensureActiveStagingVisibleRef: Ref<() => void>;
  isSettingsWindow: Ref<boolean>;
  settingsWindow: LauncherSettingsWindow;
  windowOpacity: Ref<number>;
  theme: Ref<string>;
  blurEnabled: Ref<boolean>;
  motionPreset: Ref<string>;
  ports: AppCompositionRootPorts;
}

/**
 * 这里保留显式构造函数，防止调用方再用宽泛类型断言把 Launcher context 伪装成完整 app context。
 */
export function createLauncherRuntimeContext(
  params: LauncherRuntimeContext
): LauncherRuntimeContext {
  return params;
}
