import { nextTick, watch, type Ref } from "vue";
import type { StagingDrawerState } from "./useStagingQueue";

interface UseLauncherWatchersOptions {
  drawerOpen: Ref<boolean>;
  drawerVisibleRows: Ref<number>;
  stagingVisibleRows: Ref<number>;
  pendingCommand: Ref<unknown>;
  stagingDrawerState: Ref<StagingDrawerState>;
  scheduleWindowSync: () => void;
  filteredResults: Ref<unknown[]>;
  resultButtons: Ref<Array<HTMLElement | null>>;
  activeIndex: Ref<number>;
  drawerRef: Ref<HTMLElement | null>;
  ensureActiveResultVisible: () => void;
  paramInputRef: Ref<HTMLInputElement | null>;
}

function bindLayoutWatchers(options: UseLauncherWatchersOptions): void {
  watch(
    [
      options.drawerOpen,
      options.drawerVisibleRows,
      options.stagingVisibleRows,
      options.pendingCommand
    ],
    () => {
      options.scheduleWindowSync();
    }
  );

  watch(options.stagingDrawerState, () => {
    options.scheduleWindowSync();
  });
}

function bindResultWatcher(options: UseLauncherWatchersOptions): void {
  watch(
    () => options.filteredResults.value.length,
    () => {
      options.resultButtons.value = [];
      options.activeIndex.value = 0;
      if (options.drawerRef.value) {
        options.drawerRef.value.scrollTop = 0;
      }
      void nextTick(() => options.ensureActiveResultVisible());
    }
  );
}

function bindPendingCommandWatcher(options: UseLauncherWatchersOptions): void {
  watch(options.pendingCommand, async (value) => {
    if (!value) {
      return;
    }
    await nextTick();
    options.paramInputRef.value?.focus({ preventScroll: true });
    options.paramInputRef.value?.select();
  });
}

export function useLauncherWatchers(options: UseLauncherWatchersOptions): void {
  bindLayoutWatchers(options);
  bindResultWatcher(options);
  bindPendingCommandWatcher(options);
}
