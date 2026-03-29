import type { ComponentPublicInstance } from "vue";
import type { CommandTemplate } from "../../features/commands/commandTemplates";
import type { StagedCommand } from "../../features/launcher/types";

export interface KeyboardHint {
  keys: string[];
  action: string;
}

export type ParamSubmitMode = "stage" | "execute";
export type FocusZone = "search" | "paging" | "results" | "staging";
export type StagingDrawerState =
  | "closed"
  | "preparing"
  | "resizing"
  | "opening"
  | "open"
  | "closing";

export type ElementRefArg = Element | ComponentPublicInstance | null;

export interface LauncherSearchPanelProps {
  query: string;
  executing: boolean;
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
  drawerOpen: boolean;
  drawerViewportHeight: number;
  keyboardHints: KeyboardHint[];
  filteredResults: CommandTemplate[];
  activeIndex: number;
  stagedFeedbackCommandId: string | null;
  stagedCommandCount: number;
  flowOpen: boolean; // 导航栈是否处于非搜索页面（CommandPanel 打开）
  reviewOpen: boolean;
  setSearchInputRef: (el: ElementRefArg) => void;
  setDrawerRef: (el: ElementRefArg) => void;
  setResultButtonRef: (el: ElementRefArg, index: number) => void;
}

export interface LauncherStagingPanelProps {
  stagingDrawerState: StagingDrawerState;
  stagingExpanded: boolean;
  stagedCommands: StagedCommand[];
  stagingHints: KeyboardHint[];
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
  focusZone: FocusZone;
  stagingActiveIndex: number;
  flowOpen: boolean;
  executing: boolean;
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
  setStagingPanelRef: (el: ElementRefArg) => void;
  setStagingListRef: (el: ElementRefArg) => void;
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

export interface LauncherCommandPanelProps {
  command: CommandTemplate;
  mode: ParamSubmitMode;
  isDangerous: boolean;
  pendingArgValues: Record<string, string>;
  stagedCommandCount: number;
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
}
// 注：pendingArgValues 不在 spec §4.5 原始接口中。
// 这是有意的偏离：spec §7.1 要求复用 useCommandExecution 状态，
// 而项目架构为纯 props drilling，因此 pendingArgValues 必须作为 prop 传入。
