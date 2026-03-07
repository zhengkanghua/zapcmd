import { computed, type Ref } from "vue";

const WINDOW_BASE_WIDTH = 680;
const WINDOW_BASE_MIN_WIDTH = 420;
const WINDOW_STAGING_WIDTH = 300;
const WINDOW_STAGING_COLLAPSED_WIDTH = 72;
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
const STAGING_CARD_EST_HEIGHT = 96;
const STAGING_LIST_GAP = 8;
const STAGING_CHROME_HEIGHT = 118;
const STAGING_ESTIMATE_ROWS = 6;
const STAGING_TOP_OFFSET = 18;
const WINDOW_RESIZE_DEBOUNCE_MS = 72;
const WINDOW_SIZE_EPSILON = 2;
const PARAM_OVERLAY_MIN_HEIGHT = 340;

export const STAGING_TRANSITION_MS = 170;
export const WINDOW_SIZING_CONSTANTS = {
  windowStagingWidth: WINDOW_STAGING_WIDTH,
  windowStagingCollapsedWidth: WINDOW_STAGING_COLLAPSED_WIDTH,
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
  const maxByOpenLayout = Math.floor(screenWidth * 0.94) - WINDOW_GAP - WINDOW_STAGING_WIDTH;
  const upper = Math.min(WINDOW_BASE_WIDTH, maxByOpenLayout);
  const lower = Math.min(WINDOW_BASE_MIN_WIDTH, upper);
  return Math.max(lower, Math.min(upper, preferred));
}

export function useLauncherLayoutMetrics(options: UseLauncherLayoutMetricsOptions) {
  const drawerOpen = computed(() => options.query.value.trim().length > 0);
  const stagingHasData = computed(() => options.stagedCommands.value.length > 0);

  const windowHeightCap = computed(() => {
    const screenHeight = resolveScreenHeight();
    return Math.max(420, Math.floor(screenHeight * 0.82));
  });

  const windowWidthCap = computed(() => {
    const screenWidth = resolveScreenWidth();
    return Math.max(480, Math.floor(screenWidth * 0.94));
  });

  const searchMainWidth = computed(() => resolveSearchMainWidth(resolveScreenWidth()));

  const searchShellStyle = computed<Record<string, string>>(() => ({
    "--search-main-width": `${searchMainWidth.value}px`,
    "--shell-gap": `${WINDOW_GAP}px`,
    "--shell-side-pad": `${WINDOW_SIDE_SAFE_PAD}px`,
    "--staging-collapsed-width": `${WINDOW_STAGING_COLLAPSED_WIDTH}px`,
    "--staging-expanded-width": `${WINDOW_STAGING_WIDTH}px`
  }));

  const minShellWidth = computed(
    () =>
      searchMainWidth.value +
      WINDOW_GAP +
      WINDOW_STAGING_COLLAPSED_WIDTH +
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
    if (!drawerOpen.value) {
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
    if (!drawerOpen.value) {
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

  const stagingVisibleRows = computed(() => {
    if (!stagingHasData.value) {
      return 0;
    }
    const rowsByCount = Math.max(options.stagedCommands.value.length, 1);
    const maxRowsByHeight = Math.max(
      1,
      Math.floor(
        (windowHeightCap.value - WINDOW_BASE_HEIGHT - STAGING_CHROME_HEIGHT - 10) /
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
