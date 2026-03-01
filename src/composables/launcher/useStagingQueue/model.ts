import type { Ref } from "vue";

export type StagingDrawerState = "closed" | "opening" | "open" | "closing";
export type FocusZone = "search" | "staging";

export interface StagedCommandLike {
  id: string;
}

export interface UseStagingQueueOptions<T extends StagedCommandLike> {
  stagedCommands: Ref<T[]>;
  transitionMs: number;
  scheduleSearchInputFocus: (selectText?: boolean) => void;
  ensureActiveStagingVisible: () => void;
  onDrawerStateChanged?: (state: StagingDrawerState) => void;
}

export interface UseStagingQueueResult {
  focusZone: Ref<FocusZone>;
  stagingActiveIndex: Ref<number>;
  stagingDrawerState: Ref<StagingDrawerState>;
  stagingExpanded: Readonly<Ref<boolean>>;
  clearStagingTransitionTimer: () => void;
  openStagingDrawer: () => void;
  closeStagingDrawer: () => void;
  toggleStaging: () => void;
  switchFocusZone: () => void;
  moveStagedCommand: (fromIndex: number, toIndex: number) => void;
  onStagingDragStart: (index: number, event: DragEvent) => void;
  onStagingDragOver: (index: number, event: DragEvent) => void;
  onStagingDragEnd: () => void;
  onFocusStagingIndex: (index: number) => void;
}
