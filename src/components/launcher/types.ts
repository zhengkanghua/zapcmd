import type { ComponentPublicInstance } from "vue";
import type { CommandArg, CommandTemplate } from "../../features/commands/commandTemplates";
import type { CommandPrerequisite } from "../../features/commands/prerequisiteTypes";

export interface KeyboardHint {
  keys: string[];
  action: string;
}

export type ParamSubmitMode = "stage" | "execute";
export type FocusZone = "search" | "paging" | "results" | "queue";
export type QueuePanelState =
  | "closed"
  | "preparing"
  | "resizing"
  | "opening"
  | "open"
  | "closing";

export type ElementRefArg = Element | ComponentPublicInstance | null;

export interface QueuedCommand {
  id: string;
  title: string;
  renderedCommand: string;
  rawPreview: string;
  args: CommandArg[];
  argValues: Record<string, string>;
  prerequisites?: CommandPrerequisite[];
  adminRequired?: boolean;
  dangerous?: boolean;
}

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
  queuedFeedbackCommandId: string | null;
  queuedCommandCount: number;
  flowOpen: boolean; // 导航栈是否处于非搜索页面（CommandPanel 打开）
  reviewOpen: boolean;
  setSearchInputRef: (el: ElementRefArg) => void;
  setDrawerRef: (el: ElementRefArg) => void;
  setResultButtonRef: (el: ElementRefArg, index: number) => void;
}

export interface LauncherQueueReviewPanelProps {
  queuePanelState: QueuePanelState;
  queueOpen: boolean;
  queuedCommands: QueuedCommand[];
  queueHints: KeyboardHint[];
  focusZone: FocusZone;
  queueActiveIndex: number;
  flowOpen: boolean;
  executing: boolean;
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
  setQueuePanelRef: (el: ElementRefArg) => void;
  setQueueListRef: (el: ElementRefArg) => void;
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
  queuedCommandCount: number;
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
}
// 注：pendingArgValues 不在 spec §4.5 原始接口中。
// 这是有意的偏离：spec §7.1 要求复用 useCommandExecution 状态，
// 而项目架构为纯 props drilling，因此 pendingArgValues 必须作为 prop 传入。
