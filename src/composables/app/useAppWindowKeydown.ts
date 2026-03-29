import { computed, nextTick, type Ref } from "vue";
import { createWindowKeydownHandler } from "../../features/hotkeys/windowKeydownHandlers";

type SettingsWindowLike = object;

interface CommandQueueLike {
  focusZone: Ref<"search" | "queue">;
  queueOpen: Ref<boolean>;
  openQueuePanel: () => void;
  switchFocusZone: () => void;
  toggleQueue: () => void;
  moveQueuedCommand: (fromIndex: number, toIndex: number) => void;
  queueActiveIndex: Ref<number>;
}

interface CommandExecutionLike<TItem> {
  executeQueue: () => Promise<void>;
  clearQueue: () => void;
  executeResult: (item: TItem) => void;
  enqueueResult: (item: TItem) => void;
  removeQueuedCommand: (id: string) => void;
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
  normalizedEnqueueSelectedHotkey: Ref<string>;
  normalizedReorderUpHotkey: Ref<string>;
  normalizedReorderDownHotkey: Ref<string>;
  normalizedRemoveQueueItemHotkey: Ref<string>;
  normalizedEscapeHotkey: Ref<string>;
}

interface UseAppWindowKeydownOptions<TItem> {
  isSettingsWindow: Ref<boolean>;
  settingsWindow: SettingsWindowLike;
  closeSettingsWindow: () => void;
  queue: CommandQueueLike;
  commandExecution: CommandExecutionLike<TItem>;
  searchInputRef: Ref<HTMLInputElement | null>;
  drawerRef: Ref<HTMLElement | null>;
  drawerOpen: Ref<boolean>;
  filteredResults: Ref<TItem[]>;
  activeIndex: Ref<number>;
  ensureActiveResultVisible: () => void;
  queuedCommands: Ref<Array<{ id: string }>>;
  ensureActiveQueueVisible: () => void;
  handleMainEscape: () => void;
  hotkeyBindings: HotkeyBindingsLike;
  isTypingElement: (target: EventTarget | null) => boolean;
}

export function useAppWindowKeydown<TItem>(options: UseAppWindowKeydownOptions<TItem>) {
  const commandPanelOpen = computed(
    () =>
      options.commandExecution.pendingCommand.value !== null ||
      options.commandExecution.safetyDialog.value !== null
  );

  return createWindowKeydownHandler({
    isSettingsWindow: options.isSettingsWindow,
    settings: {
      closeSettingsWindow: options.closeSettingsWindow
    },
    main: {
      focusZone: options.queue.focusZone,
      searchInputRef: options.searchInputRef,
      drawerRef: options.drawerRef,
      queueOpen: options.queue.queueOpen,
      openQueuePanel: options.queue.openQueuePanel,
      switchFocusZone: options.queue.switchFocusZone,
      toggleQueue: options.queue.toggleQueue,
      executeQueue: options.commandExecution.executeQueue,
      clearQueue: options.commandExecution.clearQueue,
      drawerOpen: options.drawerOpen,
      filteredResults: options.filteredResults,
      activeIndex: options.activeIndex,
      ensureActiveResultVisible: options.ensureActiveResultVisible,
      executeResult: options.commandExecution.executeResult,
      enqueueResult: options.commandExecution.enqueueResult,
      queuedCommands: options.queuedCommands,
      isTypingElement: options.isTypingElement,
      moveQueuedCommand: options.queue.moveQueuedCommand,
      queueActiveIndex: options.queue.queueActiveIndex,
      ensureActiveQueueVisible: options.ensureActiveQueueVisible,
      removeQueuedCommand: options.commandExecution.removeQueuedCommand,
      commandPanelOpen,
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
      normalizedEnqueueSelectedHotkey: options.hotkeyBindings.normalizedEnqueueSelectedHotkey,
      normalizedReorderUpHotkey: options.hotkeyBindings.normalizedReorderUpHotkey,
      normalizedReorderDownHotkey: options.hotkeyBindings.normalizedReorderDownHotkey,
      normalizedRemoveQueueItemHotkey: options.hotkeyBindings.normalizedRemoveQueueItemHotkey,
      normalizedEscapeHotkey: options.hotkeyBindings.normalizedEscapeHotkey
    }
  });
}
