import type { Ref } from "vue";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type { StagedCommand } from "../../../features/launcher/types";
import type { FocusZone } from "../../launcher/useStagingQueue";

export type ParamSubmitMode = "stage" | "execute";
export type ExecutionFeedbackTone = "neutral" | "success" | "error";

export interface ExecutionSafetyItem {
  title: string;
  renderedCommand: string;
  reasons: string[];
}

export interface ExecutionSafetyDialog {
  mode: "single" | "queue";
  title: string;
  description: string;
  items: ExecutionSafetyItem[];
}

export interface UseCommandExecutionOptions {
  stagedCommands: Ref<StagedCommand[]>;
  focusZone: Ref<FocusZone>;
  stagingActiveIndex: Ref<number>;
  openStagingDrawer: () => void;
  ensureActiveStagingVisible: () => void;
  clearSearchQueryAndSelection: () => void;
  triggerStagedFeedback: (commandId: string) => void;
  scheduleSearchInputFocus: (selectText?: boolean) => void;
  runCommandInTerminal: (renderedCommand: string) => Promise<void>;
  runCommandsInTerminal?: (renderedCommands: string[]) => Promise<void>;
  feedbackDurationMs?: number;
}

export interface CommandExecutionState {
  executing: Ref<boolean>;
  pendingCommand: Ref<CommandTemplate | null>;
  pendingSubmitMode: Ref<ParamSubmitMode>;
  pendingArgValues: Ref<Record<string, string>>;
  safetyDialog: Ref<ExecutionSafetyDialog | null>;
  executionFeedbackMessage: Ref<string>;
  executionFeedbackTone: Ref<ExecutionFeedbackTone>;
  clearExecutionFeedbackTimer: () => void;
  requestSafetyConfirmation: (
    dialog: ExecutionSafetyDialog,
    onConfirm: () => Promise<void>
  ) => void;
  confirmSafetyExecution: () => Promise<void>;
  cancelSafetyExecution: () => void;
  setExecutionFeedback: (
    tone: ExecutionFeedbackTone,
    message: string,
    autoDismiss?: boolean
  ) => void;
}
