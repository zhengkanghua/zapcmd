import type { Ref } from "vue";
import { useLauncherWatchers } from "./useLauncherWatchers";
import type { StagingDrawerState } from "./useStagingQueue";

interface WindowSizingWatcherModule {
  scheduleWindowSync: () => void;
}

interface UseLauncherWatcherBindingsOptions {
  drawerOpen: Ref<boolean>;
  drawerVisibleRows: Ref<number>;
  stagingVisibleRows: Ref<number>;
  pendingCommand: Ref<unknown>;
  stagingDrawerState: Ref<StagingDrawerState>;
  filteredResults: Ref<unknown[]>;
  resultButtons: Ref<Array<HTMLElement | null>>;
  activeIndex: Ref<number>;
  drawerRef: Ref<HTMLElement | null>;
  ensureActiveResultVisible: () => void;
  paramInputRef: Ref<HTMLInputElement | null>;
  windowSizing: WindowSizingWatcherModule;
}

export function useLauncherWatcherBindings(options: UseLauncherWatcherBindingsOptions): void {
  useLauncherWatchers({
    drawerOpen: options.drawerOpen,
    drawerVisibleRows: options.drawerVisibleRows,
    stagingVisibleRows: options.stagingVisibleRows,
    pendingCommand: options.pendingCommand,
    stagingDrawerState: options.stagingDrawerState,
    scheduleWindowSync: options.windowSizing.scheduleWindowSync,
    filteredResults: options.filteredResults,
    resultButtons: options.resultButtons,
    activeIndex: options.activeIndex,
    drawerRef: options.drawerRef,
    ensureActiveResultVisible: options.ensureActiveResultVisible,
    paramInputRef: options.paramInputRef
  });
}
