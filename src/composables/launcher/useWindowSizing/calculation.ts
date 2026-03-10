import { UI_TOP_ALIGN_OFFSET_PX_FALLBACK, type UseWindowSizingOptions, type WindowSize } from "./model";

function resolveShellDragStripHeight(options: UseWindowSizingOptions): number {
  const shell = options.searchShellRef.value;
  const dragStrip = shell ? shell.querySelector<HTMLElement>(".shell-drag-strip") : null;
  if (dragStrip) {
    const height = dragStrip.getBoundingClientRect().height;
    if (Number.isFinite(height) && height > 0) {
      return Math.ceil(height);
    }
  }
  return UI_TOP_ALIGN_OFFSET_PX_FALLBACK;
}

function resolveWindowWidth(options: UseWindowSizingOptions): number {
  const { constants } = options;
  const width = options.searchMainWidth.value + constants.windowSideSafePad * 2;
  return Math.max(options.minShellWidth.value, Math.min(options.windowWidthCap.value, width));
}

function resolveOverlayMinHeight(options: UseWindowSizingOptions): number {
  if (options.pendingCommand.value) {
    return options.constants.paramOverlayMinHeight;
  }
  return options.constants.windowBaseHeight;
}

function measureWindowContentHeightFromLayout(
  options: UseWindowSizingOptions,
  dragStripHeight: number,
  contentHeightCap: number
): number | null {
  const shell = options.searchShellRef.value;
  if (!shell) {
    return null;
  }

  const { constants } = options;
  const rootRect = shell.parentElement?.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  const stagingRect = options.stagingExpanded.value && options.stagingPanelRef.value
    ? options.stagingPanelRef.value.getBoundingClientRect()
    : null;
  const contentBottom = stagingRect ? Math.max(shellRect.bottom, stagingRect.bottom) : shellRect.bottom;
  const topOffset = rootRect
    ? Math.max(0, shellRect.top - rootRect.top)
    : Math.max(0, shellRect.top);

  const windowHeight = Math.ceil(
    topOffset +
      (contentBottom - shellRect.top) +
      constants.windowSafeVerticalPad +
      constants.windowBottomSafePad
  );
  const contentHeight = Math.max(0, windowHeight - dragStripHeight);
  return Math.max(constants.windowBaseHeight, Math.min(contentHeightCap, contentHeight));
}

function estimateWindowContentHeight(options: UseWindowSizingOptions, contentHeightCap: number): number {
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
    rightHeight = panelHeight;
  }
  if (options.pendingCommand.value) {
    leftHeight = Math.max(leftHeight, constants.paramOverlayMinHeight);
  }

  return Math.min(Math.max(leftHeight, rightHeight), contentHeightCap);
}

export function resolveWindowSize(options: UseWindowSizingOptions): WindowSize {
  const dragStripHeight = resolveShellDragStripHeight(options);
  const contentHeightCap = Math.max(0, options.windowHeightCap.value - dragStripHeight);
  const measuredContentHeight = measureWindowContentHeightFromLayout(
    options,
    dragStripHeight,
    contentHeightCap
  );
  const width = resolveWindowWidth(options);
  const overlayMinContentHeight = resolveOverlayMinHeight(options);
  const estimatedContentHeight = estimateWindowContentHeight(options, contentHeightCap);
  const sizingContentHeight =
    measuredContentHeight === null
      ? estimatedContentHeight
      : Math.max(measuredContentHeight, estimatedContentHeight);
  const resolvedContentHeight = Math.min(
    Math.max(sizingContentHeight, overlayMinContentHeight),
    contentHeightCap
  );
  return {
    width,
    height: resolvedContentHeight + dragStripHeight
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
