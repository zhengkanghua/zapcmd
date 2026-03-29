import type { Ref } from "vue";

export type QueuePanelState =
  | "closed"
  | "preparing"
  | "resizing"
  | "opening"
  | "open"
  | "closing";
export type FocusZone = "search" | "queue";

export interface QueuedCommandLike {
  id: string;
}

export interface UseCommandQueueOptions<T extends QueuedCommandLike> {
  queuedCommands: Ref<T[]>;
  transitionMs: number;
  scheduleSearchInputFocus: (selectText?: boolean) => void;
  ensureActiveQueueVisible: () => void;
  preparePanelReveal?: () => Promise<void>;
  onPanelStateChanged?: (state: QueuePanelState) => void;
}

export interface UseCommandQueueResult {
  focusZone: Ref<FocusZone>;
  queueActiveIndex: Ref<number>;
  queuePanelState: Ref<QueuePanelState>;
  queueOpen: Readonly<Ref<boolean>>;
  clearQueueTransitionTimer: () => void;
  openQueuePanel: () => void;
  closeQueuePanel: () => void;
  toggleQueue: () => void;
  switchFocusZone: () => void;
  moveQueuedCommand: (fromIndex: number, toIndex: number) => void;
  onQueueDragStart: (index: number, event: DragEvent) => void;
  onQueueDragOver: (index: number, event: DragEvent) => void;
  onQueueDragEnd: () => void;
  onFocusQueueIndex: (index: number) => void;
}
