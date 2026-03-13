import { computed, nextTick, type Ref } from "vue";
import { createWindowKeydownHandler } from "../../features/hotkeys/windowKeydownHandlers";
import type { HotkeyFieldId } from "../../stores/settingsStore";

interface SettingsWindowLike {
  recordingHotkeyField: Ref<HotkeyFieldId | null>;
  applyRecordedHotkey: (field: HotkeyFieldId, captured: string) => void;
  cancelHotkeyRecording: () => void;
  terminalDropdownOpen: Ref<boolean>;
  closeConfirmOpen: Ref<boolean>;
  cancelCloseConfirm: () => void;
  availableTerminals: Ref<Array<{ id: string }>>;
  terminalFocusIndex: Ref<number>;
  selectTerminalOption: (id: string) => void;
  closeTerminalDropdown: () => void;
}

interface StagingQueueLike {
  focusZone: Ref<"search" | "staging">;
  stagingExpanded: Ref<boolean>;
  openStagingDrawer: () => void;
  switchFocusZone: () => void;
  toggleStaging: () => void;
  moveStagedCommand: (fromIndex: number, toIndex: number) => void;
  stagingActiveIndex: Ref<number>;
}

interface CommandExecutionLike<TItem> {
  executeStaged: () => Promise<void>;
  clearStaging: () => void;
  executeResult: (item: TItem) => void;
  stageResult: (item: TItem) => void;
  removeStagedCommand: (id: string) => void;
  pendingCommand: Ref<unknown>;
  safetyDialog: Ref<unknown>;
  confirmSafetyExecution: () => Promise<void>;
  cancelSafetyExecution: () => void;
}

interface HotkeyBindingsLike {
  normalizedSwitchFocusHotkey: Ref<string>;
  normalizedToggleQueueHotkey: Ref<string>;
  normalizedExecuteQueueHotkey: Ref<string>;
  normalizedClearQueueHotkey: Ref<string>;
  normalizedNavigateDownHotkey: Ref<string>;
  normalizedNavigateUpHotkey: Ref<string>;
  normalizedExecuteSelectedHotkey: Ref<string>;
  normalizedStageSelectedHotkey: Ref<string>;
  normalizedReorderUpHotkey: Ref<string>;
  normalizedReorderDownHotkey: Ref<string>;
  normalizedRemoveQueueItemHotkey: Ref<string>;
  normalizedEscapeHotkey: Ref<string>;
}

interface UseAppWindowKeydownOptions<TItem> {
  isSettingsWindow: Ref<boolean>;
  settingsWindow: SettingsWindowLike;
  closeSettingsWindow: () => void;
  stagingQueue: StagingQueueLike;
  commandExecution: CommandExecutionLike<TItem>;
  searchInputRef: Ref<HTMLInputElement | null>;
  drawerOpen: Ref<boolean>;
  filteredResults: Ref<TItem[]>;
  activeIndex: Ref<number>;
  ensureActiveResultVisible: () => void;
  stagedCommands: Ref<Array<{ id: string }>>;
  ensureActiveStagingVisible: () => void;
  handleMainEscape: () => void;
  hotkeyBindings: HotkeyBindingsLike;
  isTypingElement: (target: EventTarget | null) => boolean;
}

export function useAppWindowKeydown<TItem>(options: UseAppWindowKeydownOptions<TItem>) {
  const safetyDialogOpen = computed(() => options.commandExecution.safetyDialog.value !== null);
  const paramDialogOpen = computed(() => options.commandExecution.pendingCommand.value !== null);

  return createWindowKeydownHandler({
    isSettingsWindow: options.isSettingsWindow,
    settings: {
      recordingHotkeyField: options.settingsWindow.recordingHotkeyField,
      applyRecordedHotkey: options.settingsWindow.applyRecordedHotkey,
      cancelHotkeyRecording: options.settingsWindow.cancelHotkeyRecording,
      terminalDropdownOpen: options.settingsWindow.terminalDropdownOpen,
      closeConfirmOpen: options.settingsWindow.closeConfirmOpen,
      cancelCloseConfirm: options.settingsWindow.cancelCloseConfirm,
      availableTerminals: options.settingsWindow.availableTerminals,
      terminalFocusIndex: options.settingsWindow.terminalFocusIndex,
      selectTerminalOption: options.settingsWindow.selectTerminalOption,
      closeTerminalDropdown: options.settingsWindow.closeTerminalDropdown,
      closeSettingsWindow: options.closeSettingsWindow
    },
    main: {
      focusZone: options.stagingQueue.focusZone,
      searchInputRef: options.searchInputRef,
      stagingExpanded: options.stagingQueue.stagingExpanded,
      openStagingDrawer: options.stagingQueue.openStagingDrawer,
      switchFocusZone: options.stagingQueue.switchFocusZone,
      toggleStaging: options.stagingQueue.toggleStaging,
      executeStaged: options.commandExecution.executeStaged,
      clearStaging: options.commandExecution.clearStaging,
      drawerOpen: options.drawerOpen,
      filteredResults: options.filteredResults,
      activeIndex: options.activeIndex,
      ensureActiveResultVisible: options.ensureActiveResultVisible,
      executeResult: options.commandExecution.executeResult,
      stageResult: options.commandExecution.stageResult,
      stagedCommands: options.stagedCommands,
      isTypingElement: options.isTypingElement,
      moveStagedCommand: options.stagingQueue.moveStagedCommand,
      stagingActiveIndex: options.stagingQueue.stagingActiveIndex,
      ensureActiveStagingVisible: options.ensureActiveStagingVisible,
      removeStagedCommand: options.commandExecution.removeStagedCommand,
      safetyDialogOpen,
      paramDialogOpen,
      confirmSafetyExecution: options.commandExecution.confirmSafetyExecution,
      cancelSafetyExecution: options.commandExecution.cancelSafetyExecution,
      handleMainEscape: options.handleMainEscape,
      queuePostUpdate: (callback) => {
        void nextTick(callback);
      },
      normalizedSwitchFocusHotkey: options.hotkeyBindings.normalizedSwitchFocusHotkey,
      normalizedToggleQueueHotkey: options.hotkeyBindings.normalizedToggleQueueHotkey,
      normalizedExecuteQueueHotkey: options.hotkeyBindings.normalizedExecuteQueueHotkey,
      normalizedClearQueueHotkey: options.hotkeyBindings.normalizedClearQueueHotkey,
      normalizedNavigateDownHotkey: options.hotkeyBindings.normalizedNavigateDownHotkey,
      normalizedNavigateUpHotkey: options.hotkeyBindings.normalizedNavigateUpHotkey,
      normalizedExecuteSelectedHotkey: options.hotkeyBindings.normalizedExecuteSelectedHotkey,
      normalizedStageSelectedHotkey: options.hotkeyBindings.normalizedStageSelectedHotkey,
      normalizedReorderUpHotkey: options.hotkeyBindings.normalizedReorderUpHotkey,
      normalizedReorderDownHotkey: options.hotkeyBindings.normalizedReorderDownHotkey,
      normalizedRemoveQueueItemHotkey: options.hotkeyBindings.normalizedRemoveQueueItemHotkey,
      normalizedEscapeHotkey: options.hotkeyBindings.normalizedEscapeHotkey
    }
  });
}
