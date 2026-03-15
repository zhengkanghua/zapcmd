import type { ComponentPublicInstance } from "vue";
import type { CommandArg, CommandTemplate } from "../../features/commands/commandTemplates";
import type { StagedCommand } from "../../features/launcher/types";

export interface KeyboardHint {
  keys: string[];
  action: string;
}

export type ParamSubmitMode = "stage" | "execute";
export type FocusZone = "search" | "paging" | "results" | "staging";
export type StagingDrawerState = "closed" | "opening" | "open" | "closing";

export type ElementRefArg = Element | ComponentPublicInstance | null;

export interface LauncherSearchPanelProps {
  query: string;
  executing: boolean;
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
  drawerOpen: boolean;
  drawerViewportHeight: number;
  drawerFloorViewportHeight: number;
  drawerFillerHeight: number;
  keyboardHints: KeyboardHint[];
  filteredResults: CommandTemplate[];
  activeIndex: number;
  stagedFeedbackCommandId: string | null;
  stagedCommandCount: number;
  flowOpen: boolean;
  reviewOpen: boolean;
  stagingDrawerState: StagingDrawerState;
  stagedCommands: StagedCommand[];
  stagingHints: KeyboardHint[];
  stagingListShouldScroll: boolean;
  stagingListMaxHeight: string;
  focusZone: FocusZone;
  stagingActiveIndex: number;
  setSearchInputRef: (el: ElementRefArg) => void;
  setDrawerRef: (el: ElementRefArg) => void;
  setResultButtonRef: (el: ElementRefArg, index: number) => void;
  setStagingPanelRef: (el: ElementRefArg) => void;
  setStagingListRef: (el: ElementRefArg) => void;
}

export interface LauncherStagingPanelProps {
  stagingDrawerState: StagingDrawerState;
  stagingExpanded: boolean;
  stagedCommands: StagedCommand[];
  stagingHints: KeyboardHint[];
  stagingListShouldScroll: boolean;
  stagingListMaxHeight: string;
  focusZone: FocusZone;
  stagingActiveIndex: number;
  executing: boolean;
  setStagingPanelRef: (el: ElementRefArg) => void;
  setStagingListRef: (el: ElementRefArg) => void;
}

export interface LauncherFlowPanelProps {
  stagingDrawerState: StagingDrawerState;
  stagingExpanded: boolean;
  stagedCommands: StagedCommand[];
  stagingHints: KeyboardHint[];
  stagingListShouldScroll: boolean;
  stagingListMaxHeight: string;
  drawerFloorViewportHeight: number;
  focusZone: FocusZone;
  stagingActiveIndex: number;
  flowOpen: boolean;
  executing: boolean;
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
  setStagingPanelRef: (el: ElementRefArg) => void;
  setStagingListRef: (el: ElementRefArg) => void;
}

export interface LauncherParamOverlayProps {
  pendingCommand: CommandTemplate | null;
  pendingArgs: CommandArg[];
  pendingArgValues: Record<string, string>;
  pendingSubmitHint: string;
  pendingSubmitMode: ParamSubmitMode;
  setParamInputRef: (el: ElementRefArg, index: number) => void;
}

export interface LauncherSafetyDialog {
  mode: "single" | "queue";
  title: string;
  description: string;
  items: Array<{
    title: string;
    renderedCommand: string;
    reasons: string[];
  }>;
}

export interface LauncherSafetyOverlayProps {
  safetyDialog: LauncherSafetyDialog | null;
  executing: boolean;
}

export interface LauncherCommandPanelProps {
  command: CommandTemplate;
  mode: ParamSubmitMode;
  isDangerous: boolean;
  pendingArgValues: Record<string, string>;
}
// 注：pendingArgValues 不在 spec §4.5 原始接口中。
// 这是有意的偏离：spec §7.1 要求复用 useCommandExecution 状态，
// 而项目架构为纯 props drilling，因此 pendingArgValues 必须作为 prop 传入。
