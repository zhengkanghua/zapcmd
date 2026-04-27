import { computed, ref, type Ref } from "vue";
import {
  FLOW_PANEL_WIDTH_RATIO,
  FLOW_PANEL_MIN_WIDTH,
  FLOW_PANEL_MAX_WIDTH
} from "../../components/launcher/parts/flowPanelLayout";
import {
  resolveSearchPanelEffectiveHeight,
  resolveSharedPanelMaxHeight
} from "./useWindowSizing/panelHeightContract";

const WINDOW_BASE_WIDTH = 680;
const WINDOW_BASE_MIN_WIDTH = 420;
const STAGING_CLOSED_WIDTH_PX = 0;
const WINDOW_GAP = 12;
const WINDOW_SIDE_SAFE_PAD = 10;
const WINDOW_BASE_HEIGHT = 124;
export const SEARCH_INPUT_HEIGHT_PX = 38;
export const SEARCH_CAPSULE_PAD_PX = 12;
export const SEARCH_CAPSULE_HEIGHT_PX =
  SEARCH_INPUT_HEIGHT_PX + SEARCH_CAPSULE_PAD_PX * 2;
export const LAUNCHER_SHELL_MARGIN_TOP_PX = 8;
export const LAUNCHER_SHELL_BREATHING_BOTTOM_PX = 8;
export const LAUNCHER_SHELL_VERTICAL_CHROME_PX =
  LAUNCHER_SHELL_MARGIN_TOP_PX + LAUNCHER_SHELL_BREATHING_BOTTOM_PX;
const WINDOW_SAFE_VERTICAL_PAD = 8;
const WINDOW_BOTTOM_SAFE_PAD = 22;
export const LAUNCHER_DRAWER_CHROME_HEIGHT_PX = 12;
export const LAUNCHER_DRAWER_HINT_HEIGHT_PX = 22;
export const LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX =
  LAUNCHER_DRAWER_CHROME_HEIGHT_PX + LAUNCHER_DRAWER_HINT_HEIGHT_PX;
export const LAUNCHER_DRAWER_ROW_HEIGHT_PX = 44;
export const LAUNCHER_DRAWER_MAX_ROWS = 10;
export const LAUNCHER_DRAWER_FLOOR_ROWS = 6;
export const DRAWER_GAP_EST_PX = 10;
const DRAWER_ROW_HEIGHT = LAUNCHER_DRAWER_ROW_HEIGHT_PX;
const STAGING_CARD_EST_HEIGHT = 140;
const STAGING_LIST_GAP = 8;
const STAGING_CHROME_HEIGHT = 118;
const STAGING_TOP_OFFSET = 18;
const WINDOW_SIZE_EPSILON = 2;
const COMMAND_PAGE_MIN_HEIGHT = 340;

export const STAGING_TRANSITION_MS = 200;
export const WINDOW_SIZING_CONSTANTS = {
  windowStagingWidth: FLOW_PANEL_MAX_WIDTH,
  windowStagingCollapsedWidth: STAGING_CLOSED_WIDTH_PX,
  windowGap: WINDOW_GAP,
  windowSideSafePad: WINDOW_SIDE_SAFE_PAD,
  windowBaseHeight: WINDOW_BASE_HEIGHT,
  windowSafeVerticalPad: WINDOW_SAFE_VERTICAL_PAD,
  windowBottomSafePad: WINDOW_BOTTOM_SAFE_PAD,
  stagingChromeHeight: STAGING_CHROME_HEIGHT,
  stagingCardEstHeight: STAGING_CARD_EST_HEIGHT,
  stagingListGap: STAGING_LIST_GAP,
  stagingTopOffset: STAGING_TOP_OFFSET,
  commandPageMinHeight: COMMAND_PAGE_MIN_HEIGHT,
  windowSizeEpsilon: WINDOW_SIZE_EPSILON
} as const;

export const LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX =
  LAUNCHER_DRAWER_MAX_ROWS * LAUNCHER_DRAWER_ROW_HEIGHT_PX +
  LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX;
// 语义上等同 sharedPanelMaxHeight：Search 胶囊区 + 结果抽屉最大 viewport。
export const LAUNCHER_FRAME_DESIGN_CAP_PX =
  SEARCH_CAPSULE_HEIGHT_PX + LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX;

interface UseLauncherLayoutMetricsOptions {
  query: Ref<string>;
  filteredResults: Ref<unknown[]>;
  stagedCommands: Ref<unknown[]>;
  stagingExpanded: Ref<boolean>;
  commandPageOpen: Ref<boolean>;
}

const launcherScreenMetricsVersion = ref(0);
let launcherScreenMetricsListenerBound = false;

export function refreshLauncherScreenMetrics(): void {
  launcherScreenMetricsVersion.value += 1;
}

export function getLauncherScreenMetricsVersionForTest(): number {
  return launcherScreenMetricsVersion.value;
}

function ensureLauncherScreenMetricsListener(): void {
  if (launcherScreenMetricsListenerBound || typeof window === "undefined") {
    return;
  }

  window.addEventListener("resize", refreshLauncherScreenMetrics);
  window.addEventListener("focus", refreshLauncherScreenMetrics);
  launcherScreenMetricsListenerBound = true;
}

function resolveScreenHeight(): number {
  if (typeof window !== "undefined" && Number.isFinite(window.screen?.availHeight)) {
    return window.screen.availHeight;
  }
  return 900;
}

function resolveScreenWidth(): number {
  if (typeof window !== "undefined" && Number.isFinite(window.screen?.availWidth)) {
    return window.screen.availWidth;
  }
  return 1440;
}

function resolveSearchMainWidth(screenWidth: number): number {
  const preferred = Math.floor(screenWidth * 0.56);
  const maxByScreen = Math.floor(screenWidth * 0.94) - WINDOW_SIDE_SAFE_PAD * 2;
  const upper = Math.min(WINDOW_BASE_WIDTH, maxByScreen);
  const lower = Math.min(WINDOW_BASE_MIN_WIDTH, upper);
  return Math.max(lower, Math.min(upper, preferred));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createOverlayPanelWidths(options: {
  searchMainWidth: Ref<number>;
  commandPageOpen: Ref<boolean>;
  stagingExpanded: Ref<boolean>;
}) {
  const dualDrawerMode = computed(
    () => options.commandPageOpen.value && options.stagingExpanded.value
  );
  const widePanelWidth = computed(() =>
    clamp(
      Math.floor(options.searchMainWidth.value * FLOW_PANEL_WIDTH_RATIO),
      FLOW_PANEL_MIN_WIDTH,
      FLOW_PANEL_MAX_WIDTH
    )
  );
  const splitPanelWidth = computed(() => Math.floor(options.searchMainWidth.value / 2));
  const panelWidth = computed(() =>
    dualDrawerMode.value ? splitPanelWidth.value : widePanelWidth.value
  );
  const flowPanelWidth = computed(() => panelWidth.value);
  const flowWidth = computed(() => panelWidth.value);

  return {
    flowPanelWidth,
    flowWidth
  };
}

export function useLauncherLayoutMetrics(options: UseLauncherLayoutMetricsOptions) {
  ensureLauncherScreenMetricsListener();
  const drawerOpen = computed(() => options.query.value.trim().length > 0);
  const shellGap = computed(() => 0);
  const windowHeightCap = computed(() => {
    const _screenMetricsVersion = launcherScreenMetricsVersion.value;
    const screenHeight = resolveScreenHeight();
    return Math.max(420, Math.floor(screenHeight * 0.82));
  });

  const windowWidthCap = computed(() => {
    const _screenMetricsVersion = launcherScreenMetricsVersion.value;
    const screenWidth = resolveScreenWidth();
    return Math.max(480, Math.floor(screenWidth * 0.94));
  });

  const searchMainWidth = computed(() => {
    const _screenMetricsVersion = launcherScreenMetricsVersion.value;
    return resolveSearchMainWidth(resolveScreenWidth());
  });
  const { flowPanelWidth, flowWidth } = createOverlayPanelWidths({
    searchMainWidth,
    commandPageOpen: options.commandPageOpen,
    stagingExpanded: options.stagingExpanded
  });

  const searchShellStyle = computed<Record<string, string>>(() => ({
    "--search-main-width": `${searchMainWidth.value}px`,
    "--shell-gap": `${shellGap.value}px`,
    "--shell-side-pad": `${WINDOW_SIDE_SAFE_PAD}px`,
    "--launcher-panel-max-height": `${LAUNCHER_FRAME_DESIGN_CAP_PX}px`,
    "--launcher-shell-margin-top": `${LAUNCHER_SHELL_MARGIN_TOP_PX}px`,
    "--launcher-shell-breathing-bottom": `${LAUNCHER_SHELL_BREATHING_BOTTOM_PX}px`,
    "--flow-panel-width": `${flowPanelWidth.value}px`,
    "--flow-width": `${flowWidth.value}px`,
    "--drawer-row-height": `${LAUNCHER_DRAWER_ROW_HEIGHT_PX}px`,
    "--staging-collapsed-width": `${STAGING_CLOSED_WIDTH_PX}px`,
    "--staging-expanded-width": `${flowPanelWidth.value}px`
  }));

  const minShellWidth = computed(
    () =>
      searchMainWidth.value +
      shellGap.value +
      STAGING_CLOSED_WIDTH_PX +
      WINDOW_SIDE_SAFE_PAD * 2
  );

  const drawerMaxRowsByHeight = computed(() => {
    return Math.max(
      1,
      Math.floor(
        (windowHeightCap.value - WINDOW_BASE_HEIGHT - LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX - DRAWER_GAP_EST_PX) /
          DRAWER_ROW_HEIGHT
      )
    );
  });

  const drawerVisibleRows = computed(() => {
    if (!drawerOpen.value) {
      return 0;
    }
    const rowsByResultCount = Math.max(options.filteredResults.value.length, 1);
    return Math.min(rowsByResultCount, LAUNCHER_DRAWER_MAX_ROWS, drawerMaxRowsByHeight.value);
  });

  const drawerViewportHeight = computed(() => {
    if (!drawerOpen.value) {
      return 0;
    }
    return drawerVisibleRows.value * DRAWER_ROW_HEIGHT + LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX;
  });
  const searchCapsuleHeight = computed(() => SEARCH_CAPSULE_HEIGHT_PX);
  const searchPanelEffectiveHeight = computed(() =>
    resolveSearchPanelEffectiveHeight({
      searchCapsuleHeight: searchCapsuleHeight.value,
      resultDrawerEffectiveHeight: drawerViewportHeight.value
    })
  );
  const sharedPanelMaxHeight = computed(() =>
    resolveSharedPanelMaxHeight({
      searchCapsuleHeight: searchCapsuleHeight.value,
      maxSearchResultsViewportHeight: LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX
    })
  );

  return {
    drawerOpen,
    windowHeightCap,
    windowWidthCap,
    searchMainWidth,
    searchShellStyle,
    minShellWidth,
    drawerVisibleRows,
    drawerViewportHeight,
    searchCapsuleHeight,
    searchPanelEffectiveHeight,
    sharedPanelMaxHeight
  };
}
