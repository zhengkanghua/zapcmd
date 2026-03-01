import type { Ref } from "vue";
import { LogicalSize } from "@tauri-apps/api/window";

export interface WindowSize {
  width: number;
  height: number;
}

export interface AppWindowLike {
  setSize(size: LogicalSize): Promise<void> | void;
}

export interface WindowSizingConstants {
  windowStagingWidth: number;
  windowStagingCollapsedWidth: number;
  windowGap: number;
  windowSideSafePad: number;
  windowBaseHeight: number;
  windowSafeVerticalPad: number;
  windowBottomSafePad: number;
  stagingChromeHeight: number;
  stagingCardEstHeight: number;
  stagingListGap: number;
  stagingTopOffset: number;
  paramOverlayMinHeight: number;
  windowSizeEpsilon: number;
  windowResizeDebounceMs: number;
}

export interface UseWindowSizingOptions {
  constants: WindowSizingConstants;
  isSettingsWindow: Ref<boolean>;
  isTauriRuntime: () => boolean;
  resolveAppWindow: () => AppWindowLike | null;
  requestSetMainWindowSize: (width: number, height: number) => Promise<void>;
  searchShellRef: Ref<HTMLElement | null>;
  stagingPanelRef: Ref<HTMLElement | null>;
  stagingExpanded: Ref<boolean>;
  pendingCommand: Ref<unknown>;
  drawerOpen: Ref<boolean>;
  drawerViewportHeight: Ref<number>;
  stagingVisibleRows: Ref<number>;
  searchMainWidth: Ref<number>;
  minShellWidth: Ref<number>;
  windowWidthCap: Ref<number>;
  windowHeightCap: Ref<number>;
  scheduleSearchInputFocus: (selectText?: boolean) => void;
  loadSettings: () => void;
}
