import type { ComponentPublicInstance } from "vue";
import type { CommandArg, CommandTemplate } from "../../features/commands/commandTemplates";
import type { StagedCommand } from "../../features/launcher/types";

export type ParamSubmitMode = "stage" | "execute";
export type FocusZone = "search" | "staging";
export type StagingDrawerState = "closed" | "opening" | "open" | "closing";

export type ElementRefArg = Element | ComponentPublicInstance | null;

export interface LauncherSearchPanelProps {
  query: string;
  executing: boolean;
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
  drawerOpen: boolean;
  drawerViewportHeight: number;
  keyboardHintText: string;
  filteredResults: CommandTemplate[];
  activeIndex: number;
  stagedFeedbackCommandId: string | null;
  setSearchInputRef: (el: ElementRefArg) => void;
  setDrawerRef: (el: ElementRefArg) => void;
  setResultButtonRef: (el: ElementRefArg, index: number) => void;
}

export interface LauncherStagingPanelProps {
  stagingDrawerState: StagingDrawerState;
  stagingExpanded: boolean;
  stagedCommands: StagedCommand[];
  stagingHintText: string;
  stagingListShouldScroll: boolean;
  stagingListMaxHeight: string;
  focusZone: FocusZone;
  stagingActiveIndex: number;
  executing: boolean;
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
