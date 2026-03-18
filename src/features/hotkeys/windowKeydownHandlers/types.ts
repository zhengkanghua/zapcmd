import type { HotkeyFieldId } from "../../../stores/settingsStore";

export interface RefLike<T> {
  value: T;
}

export interface SettingsHandlers {
  recordingHotkeyField: RefLike<HotkeyFieldId | null>;
  applyRecordedHotkey: (field: HotkeyFieldId, captured: string) => void;
  cancelHotkeyRecording: () => void;
  closeSettingsWindow: () => void;
}

export interface MainHandlers<TItem> {
  focusZone: RefLike<"search" | "staging">;
  searchInputRef: RefLike<HTMLInputElement | null>;
  drawerRef: RefLike<HTMLElement | null>;
  commandPanelOpen: RefLike<boolean>;
  stagingExpanded: RefLike<boolean>;
  openStagingDrawer: () => void;
  switchFocusZone: () => void;
  toggleStaging: () => void;
  executeStaged: () => Promise<void>;
  clearStaging: () => void;
  drawerOpen: RefLike<boolean>;
  filteredResults: RefLike<TItem[]>;
  activeIndex: RefLike<number>;
  ensureActiveResultVisible: () => void;
  executeResult: (item: TItem) => void;
  stageResult: (item: TItem) => void;
  stagedCommands: RefLike<Array<{ id: string }>>;
  isTypingElement: (target: EventTarget | null) => boolean;
  moveStagedCommand: (fromIndex: number, toIndex: number) => void;
  stagingActiveIndex: RefLike<number>;
  ensureActiveStagingVisible: () => void;
  removeStagedCommand: (id: string) => void;
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
  normalizedStageSelectedHotkey: RefLike<string>;
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
