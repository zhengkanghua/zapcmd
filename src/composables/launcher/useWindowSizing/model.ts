import type { Ref } from "vue";
import { LogicalSize } from "@tauri-apps/api/window";

export const UI_TOP_ALIGN_OFFSET_PX_FALLBACK = 18; // 与 src/styles.css 的 --ui-top-align-offset 保持一致

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
}

export interface UseWindowSizingOptions {
  constants: WindowSizingConstants;
  isSettingsWindow: Ref<boolean>;
  isTauriRuntime: () => boolean;
  resolveAppWindow: () => AppWindowLike | null;
  requestSetMainWindowSize: (width: number, height: number) => Promise<void>;
  requestAnimateMainWindowSize: (width: number, height: number) => Promise<void>;
  searchShellRef: Ref<HTMLElement | null>;
  stagingPanelRef: Ref<HTMLElement | null>;
  stagingExpanded: Ref<boolean>;
  pendingCommand: Ref<unknown>;
  commandPanelInheritedHeight: Ref<number | null>;
  commandPanelLockedHeight: Ref<number | null>;
  flowPanelInheritedHeight: Ref<number | null>;
  flowPanelLockedHeight: Ref<number | null>;
  drawerOpen: Ref<boolean>;
  drawerViewportHeight: Ref<number>;
  searchPanelEffectiveHeight: Ref<number>;
  sharedPanelMaxHeight: Ref<number>;
  searchMainWidth: Ref<number>;
  minShellWidth: Ref<number>;
  windowWidthCap: Ref<number>;
  windowHeightCap: Ref<number>;
  scheduleSearchInputFocus: (selectText?: boolean) => void;
  loadSettings: () => void;
}
