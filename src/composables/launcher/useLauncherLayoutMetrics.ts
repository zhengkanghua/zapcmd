import { computed, type Ref } from "vue";

const WINDOW_BASE_WIDTH = 680;
const WINDOW_BASE_MIN_WIDTH = 420;
const STAGING_CLOSED_WIDTH_PX = 0;
const REVIEW_PANEL_WIDTH_RATIO = 2 / 3;
const REVIEW_PANEL_MIN_WIDTH_PX = 420;
const REVIEW_PANEL_MAX_WIDTH_PX = 480;
const WINDOW_GAP = 12;
const WINDOW_SIDE_SAFE_PAD = 10;
const WINDOW_BASE_HEIGHT = 124;
const WINDOW_SAFE_VERTICAL_PAD = 8;
const WINDOW_BOTTOM_SAFE_PAD = 22;
const DRAWER_CHROME_HEIGHT = 12;
const DRAWER_HINT_HEIGHT = 22;
const DRAWER_DEFAULT_ROWS = 8;
const DRAWER_FLOOR_ROWS = 4;
const DRAWER_ROW_HEIGHT = 72;
const STAGING_CARD_EST_HEIGHT = 140;
const STAGING_LIST_GAP = 8;
const STAGING_CHROME_HEIGHT = 118;
const STAGING_ESTIMATE_ROWS = 6;
const STAGING_TOP_OFFSET = 18;
const WINDOW_RESIZE_DEBOUNCE_MS = 72;
const WINDOW_SIZE_EPSILON = 2;
const PARAM_OVERLAY_MIN_HEIGHT = 340;

export const STAGING_TRANSITION_MS = 200;
export const WINDOW_SIZING_CONSTANTS = {
  windowStagingWidth: REVIEW_PANEL_MAX_WIDTH_PX,
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
  paramOverlayMinHeight: PARAM_OVERLAY_MIN_HEIGHT,
  windowSizeEpsilon: WINDOW_SIZE_EPSILON,
  windowResizeDebounceMs: WINDOW_RESIZE_DEBOUNCE_MS
} as const;

interface UseLauncherLayoutMetricsOptions {
  query: Ref<string>;
  filteredResults: Ref<unknown[]>;
  stagedCommands: Ref<unknown[]>;
  stagingExpanded: Ref<boolean>;
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

function createStagingLayoutMetrics(options: {
  stagedCommands: Ref<unknown[]>;
  stagingExpanded: Ref<boolean>;
  windowHeightCap: Ref<number>;
}) {
  const stagingHasData = computed(() => options.stagedCommands.value.length > 0);

  const stagingVisibleRows = computed(() => {
    if (!stagingHasData.value) {
      return 0;
    }
    const rowsByCount = Math.max(options.stagedCommands.value.length, 1);
    const maxRowsByHeight = Math.max(
      1,
      Math.floor(
        (options.windowHeightCap.value - WINDOW_BASE_HEIGHT - STAGING_CHROME_HEIGHT - 10) /
          (STAGING_CARD_EST_HEIGHT + STAGING_LIST_GAP)
      )
    );
    return Math.min(rowsByCount, STAGING_ESTIMATE_ROWS, maxRowsByHeight);
  });

  const stagingListShouldScroll = computed(
    () => options.stagingExpanded.value && options.stagedCommands.value.length > stagingVisibleRows.value
  );

  const stagingListMaxHeight = computed(() => {
    const rows = stagingVisibleRows.value;
    if (rows <= 0) {
      return "0px";
    }
    const height = rows * STAGING_CARD_EST_HEIGHT + Math.max(rows - 1, 0) * STAGING_LIST_GAP;
    return `${height}px`;
  });

  return {
    stagingVisibleRows,
    stagingListShouldScroll,
    stagingListMaxHeight
  };
}

export function useLauncherLayoutMetrics(options: UseLauncherLayoutMetricsOptions) {
  const drawerOpen = computed(() => options.query.value.trim().length > 0);

  const shellGap = computed(() => 0);

  const windowHeightCap = computed(() => {
    const screenHeight = resolveScreenHeight();
    return Math.max(420, Math.floor(screenHeight * 0.82));
  });

  const windowWidthCap = computed(() => {
    const screenWidth = resolveScreenWidth();
    return Math.max(480, Math.floor(screenWidth * 0.94));
  });

  const searchMainWidth = computed(() => resolveSearchMainWidth(resolveScreenWidth()));
  const reviewWidth = computed(() =>
    clamp(
      Math.floor(searchMainWidth.value * REVIEW_PANEL_WIDTH_RATIO),
      REVIEW_PANEL_MIN_WIDTH_PX,
      REVIEW_PANEL_MAX_WIDTH_PX
    )
  );

  const searchShellStyle = computed<Record<string, string>>(() => ({
    "--search-main-width": `${searchMainWidth.value}px`,
    "--shell-gap": `${shellGap.value}px`,
    "--shell-side-pad": `${WINDOW_SIDE_SAFE_PAD}px`,
    "--review-width": `${reviewWidth.value}px`,
    "--staging-collapsed-width": `${STAGING_CLOSED_WIDTH_PX}px`,
    "--staging-expanded-width": `${reviewWidth.value}px`
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
        (windowHeightCap.value - WINDOW_BASE_HEIGHT - DRAWER_CHROME_HEIGHT - DRAWER_HINT_HEIGHT - 10) /
          DRAWER_ROW_HEIGHT
      )
    );
  });

  const drawerVisibleRows = computed(() => {
    if (!drawerOpen.value) {
      return 0;
    }
    const rowsByResultCount = Math.max(options.filteredResults.value.length, 1);
    return Math.min(rowsByResultCount, DRAWER_DEFAULT_ROWS, drawerMaxRowsByHeight.value);
  });

  const drawerUsesFloorHeight = computed(() => {
    if (!drawerOpen.value) {
      return false;
    }
    if (!options.stagingExpanded.value) {
      return false;
    }
    return options.filteredResults.value.length < DRAWER_FLOOR_ROWS;
  });

  const drawerFloorVisibleRows = computed(() => {
    if (!options.stagingExpanded.value) {
      return 0;
    }
    return Math.min(DRAWER_FLOOR_ROWS, drawerMaxRowsByHeight.value, DRAWER_DEFAULT_ROWS);
  });

  const drawerNaturalViewportHeight = computed(() => {
    if (!drawerOpen.value) {
      return 0;
    }
    return drawerVisibleRows.value * DRAWER_ROW_HEIGHT + DRAWER_CHROME_HEIGHT + DRAWER_HINT_HEIGHT;
  });

  const drawerFloorViewportHeight = computed(() => {
    if (drawerFloorVisibleRows.value <= 0) {
      return 0;
    }
    return (
      drawerFloorVisibleRows.value * DRAWER_ROW_HEIGHT + DRAWER_CHROME_HEIGHT + DRAWER_HINT_HEIGHT
    );
  });

  const drawerViewportHeight = computed(() => {
    if (!drawerOpen.value) {
      return 0;
    }
    if (drawerUsesFloorHeight.value) {
      return drawerFloorViewportHeight.value;
    }
    return drawerNaturalViewportHeight.value;
  });

  const drawerFillerHeight = computed(() => {
    if (!drawerUsesFloorHeight.value) {
      return 0;
    }
    return Math.max(0, drawerFloorViewportHeight.value - drawerNaturalViewportHeight.value);
  });

  const { stagingVisibleRows, stagingListShouldScroll, stagingListMaxHeight } =
    createStagingLayoutMetrics({
      stagedCommands: options.stagedCommands,
      stagingExpanded: options.stagingExpanded,
      windowHeightCap
    });

  return {
    drawerOpen,
    windowHeightCap,
    windowWidthCap,
    searchMainWidth,
    searchShellStyle,
    minShellWidth,
    drawerUsesFloorHeight,
    drawerVisibleRows,
    drawerViewportHeight,
    drawerFloorViewportHeight,
    drawerFillerHeight,
    stagingVisibleRows,
    stagingListShouldScroll,
    stagingListMaxHeight
  };
}
