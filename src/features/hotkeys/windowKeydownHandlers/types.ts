export interface RefLike<T> {
  value: T;
}

export interface SettingsHandlers {
  closeSettingsWindow: () => void;
}

export interface MainHandlers<TItem> {
  focusZone: RefLike<"search" | "queue">;
  searchInputRef: RefLike<HTMLInputElement | null>;
  drawerRef: RefLike<HTMLElement | null>;
  commandPageOpen: RefLike<boolean>;
  queueOpen: RefLike<boolean>;
  openQueuePanel: () => void;
  switchFocusZone: () => void;
  toggleQueue: () => void;
  executeQueue: () => Promise<void>;
  clearQueue: () => void;
  drawerOpen: RefLike<boolean>;
  filteredResults: RefLike<TItem[]>;
  activeIndex: RefLike<number>;
  ensureActiveResultVisible: () => void;
  executeResult: (item: TItem) => void;
  enqueueResult: (item: TItem) => void;
  openActionPanel: (item: TItem) => void;
  copySelected: (item: TItem) => void;
  queuedCommands: RefLike<Array<{ id: string }>>;
  isTypingElement: (target: EventTarget | null) => boolean;
  moveQueuedCommand: (fromIndex: number, toIndex: number) => void;
  queueActiveIndex: RefLike<number>;
  ensureActiveQueueVisible: () => void;
  removeQueuedCommand: (id: string) => void;
  confirmSafetyExecution: () => Promise<void>;
  cancelSafetyExecution: () => void;
  handleMainEscape: () => void;
  queuePostUpdate: (callback: () => void) => void;
  normalizedSwitchFocusHotkey: RefLike<string>;
  normalizedToggleQueueHotkey: RefLike<string>;
  normalizedExecuteQueueHotkey: RefLike<string>;
  normalizedClearQueueHotkey: RefLike<string>;
  normalizedNavigateDownHotkey: RefLike<string>;
  normalizedNavigateUpHotkey: RefLike<string>;
  normalizedExecuteSelectedHotkey: RefLike<string>;
  normalizedEnqueueSelectedHotkey: RefLike<string>;
  normalizedOpenActionPanelHotkey: RefLike<string>;
  normalizedCopySelectedHotkey: RefLike<string>;
  normalizedReorderUpHotkey: RefLike<string>;
  normalizedReorderDownHotkey: RefLike<string>;
  normalizedRemoveQueueItemHotkey: RefLike<string>;
  normalizedEscapeHotkey: RefLike<string>;
}

export interface WindowKeydownHandlerOptions<TItem> {
  isSettingsWindow: RefLike<boolean>;
  settings: SettingsHandlers;
  main: MainHandlers<TItem>;
}
