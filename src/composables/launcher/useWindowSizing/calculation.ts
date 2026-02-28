import type { UseWindowSizingOptions, WindowSize } from "./model";

function resolveWindowWidth(options: UseWindowSizingOptions): number {
  const { constants } = options;
  const stagingWidth = options.stagingExpanded.value
    ? constants.windowStagingWidth
    : constants.windowStagingCollapsedWidth;
  const width =
    options.searchMainWidth.value +
    constants.windowGap +
    stagingWidth +
    constants.windowSideSafePad * 2;
  return Math.max(options.minShellWidth.value, Math.min(options.windowWidthCap.value, width));
}

function resolveOverlayMinHeight(options: UseWindowSizingOptions): number {
  if (options.pendingCommand.value) {
    return options.constants.paramOverlayMinHeight;
  }
  return options.constants.windowBaseHeight;
}

function measureWindowHeightFromLayout(options: UseWindowSizingOptions): number | null {
  const shell = options.searchShellRef.value;
  if (!shell) {
    return null;
  }

  const { constants } = options;
  const rootRect = shell.parentElement?.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  const stagingRect = options.stagingPanelRef.value
    ? options.stagingPanelRef.value.getBoundingClientRect()
    : null;
  const contentBottom = stagingRect ? Math.max(shellRect.bottom, stagingRect.bottom) : shellRect.bottom;
  const topOffset = rootRect
    ? Math.max(0, shellRect.top - rootRect.top)
    : Math.max(0, shellRect.top);

  return Math.max(
    constants.windowBaseHeight,
    Math.min(
      options.windowHeightCap.value,
      Math.ceil(
        topOffset +
          (contentBottom - shellRect.top) +
          constants.windowSafeVerticalPad +
          constants.windowBottomSafePad
      )
    )
  );
}

function estimateWindowHeight(options: UseWindowSizingOptions): number {
  const { constants } = options;
  let leftHeight = constants.windowBaseHeight;
  if (options.drawerOpen.value) {
    leftHeight += options.drawerViewportHeight.value + 10;
  }

  let rightHeight = 0;
  if (options.stagingExpanded.value) {
    const panelHeight = options.stagingPanelRef.value
      ? Math.ceil(options.stagingPanelRef.value.getBoundingClientRect().height)
      : constants.stagingChromeHeight +
        options.stagingVisibleRows.value * constants.stagingCardEstHeight +
        Math.max(options.stagingVisibleRows.value - 1, 0) * constants.stagingListGap;
    rightHeight = constants.stagingTopOffset + panelHeight;
  }
  if (options.pendingCommand.value) {
    leftHeight = Math.max(leftHeight, constants.paramOverlayMinHeight);
  }

  return Math.min(Math.max(leftHeight, rightHeight), options.windowHeightCap.value);
}

export function resolveWindowSize(options: UseWindowSizingOptions): WindowSize {
  const measuredHeight = measureWindowHeightFromLayout(options);
  const width = resolveWindowWidth(options);
  const overlayMinHeight = resolveOverlayMinHeight(options);
  const estimatedHeight = estimateWindowHeight(options);
  return {
    width,
    height: Math.max(measuredHeight ?? estimatedHeight, overlayMinHeight)
  };
}

export function shouldSkipResize(
  lastWindowSize: WindowSize | null,
  nextSize: WindowSize,
  windowSizeEpsilon: number
): boolean {
  if (!lastWindowSize) {
    return false;
  }
  return (
    Math.abs(lastWindowSize.width - nextSize.width) <= windowSizeEpsilon &&
    Math.abs(lastWindowSize.height - nextSize.height) <= windowSizeEpsilon
  );
}
