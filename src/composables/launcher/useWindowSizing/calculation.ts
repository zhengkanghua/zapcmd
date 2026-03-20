import { UI_TOP_ALIGN_OFFSET_PX_FALLBACK, type UseWindowSizingOptions, type WindowSize } from "./model";
import { clampSearchPanelHeight, resolvePanelHeight } from "./panelHeightContract";
import { DRAWER_GAP_EST_PX, LAUNCHER_FRAME_DESIGN_CAP_PX } from "../useLauncherLayoutMetrics";

interface ResolveWindowSizeOverrides {
  commandPanelExitFrameHeightLock?: number | null;
  ignoreCommandPanelExitLock?: boolean;
  ignoreMeasuredSearchPanelHeight?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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

function resolveFrameMaxHeight(options: UseWindowSizingOptions, dragStripHeight: number): number {
  const screenCapFrame = Math.max(0, options.windowHeightCap.value - dragStripHeight);
  return Math.min(screenCapFrame, LAUNCHER_FRAME_DESIGN_CAP_PX);
}

function measureWindowContentHeightFromLayout(
  options: UseWindowSizingOptions,
  dragStripHeight: number,
  frameMaxHeight: number
): number | null {
  const shell = options.searchShellRef.value;
  if (!shell) {
    return null;
  }

  // Command / Flow 高度统一走 session；这里仅用于 Search 自然高度采样。
  // nav-slide out-in 期间新面板未挂载时，绝不能回退到旧 shell 高度污染会话。
  if (options.pendingCommand.value !== null) {
    return null;
  }

  const rootRect = shell.parentElement?.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  const topOffset = rootRect
    ? Math.max(0, shellRect.top - rootRect.top)
    : Math.max(0, shellRect.top);
  const windowHeight = Math.ceil(
    topOffset +
      shellRect.height +
      options.constants.windowSafeVerticalPad +
      options.constants.windowBottomSafePad
  );
  const contentHeight = Math.max(0, windowHeight - dragStripHeight);
  return clampSearchPanelHeight({
    panelMaxHeight: frameMaxHeight,
    naturalPanelHeight: Math.max(options.constants.windowBaseHeight, contentHeight)
  });
}

function estimateWindowContentHeight(options: UseWindowSizingOptions, frameMaxHeight: number): number {
  let naturalPanelHeight = options.constants.windowBaseHeight;
  if (options.pendingCommand.value === null && options.drawerOpen.value) {
    naturalPanelHeight += options.drawerViewportHeight.value + DRAWER_GAP_EST_PX;
  }
  return clampSearchPanelHeight({
    panelMaxHeight: frameMaxHeight,
    naturalPanelHeight
  });
}

function resolveSearchPanelFrameHeight(
  options: UseWindowSizingOptions,
  dragStripHeight: number,
  frameMaxHeight: number,
  overrides: ResolveWindowSizeOverrides
): number {
  const measuredContentHeight = overrides.ignoreMeasuredSearchPanelHeight
    ? null
    : measureWindowContentHeightFromLayout(
        options,
        dragStripHeight,
        frameMaxHeight
      );
  const estimatedContentHeight = estimateWindowContentHeight(options, frameMaxHeight);
  return measuredContentHeight === null
    ? estimatedContentHeight
    : Math.max(measuredContentHeight, estimatedContentHeight);
}

export function resolveCommandPanelFrameHeight(
  options: UseWindowSizingOptions,
  panelMaxHeight: number
): number | null {
  if (options.pendingCommand.value === null) {
    return null;
  }

  const inheritedPanelHeight =
    options.commandPanelLockedHeight.value ?? options.commandPanelInheritedHeight.value;
  if (inheritedPanelHeight === null) {
    return null;
  }

  return resolvePanelHeight({
    panelMaxHeight,
    inheritedPanelHeight,
    panelMinHeight: options.constants.paramOverlayMinHeight
  });
}

export function resolveFlowPanelFrameHeight(
  options: UseWindowSizingOptions,
  panelMaxHeight: number
): number | null {
  if (!options.stagingExpanded.value) {
    return null;
  }

  const inheritedPanelHeight =
    options.flowPanelLockedHeight.value ?? options.flowPanelInheritedHeight.value;
  if (inheritedPanelHeight === null) {
    return null;
  }

  return resolvePanelHeight({
    panelMaxHeight,
    inheritedPanelHeight,
    panelMinHeight: 0
  });
}

export function resolveWindowSize(
  options: UseWindowSizingOptions,
  overrides: ResolveWindowSizeOverrides = {}
): WindowSize {
  const dragStripHeight = resolveShellDragStripHeight(options);
  const frameMaxHeight = resolveFrameMaxHeight(options, dragStripHeight);
  const width = resolveWindowWidth(options);
  const searchFrameHeight = resolveSearchPanelFrameHeight(
    options,
    dragStripHeight,
    frameMaxHeight,
    overrides
  );
  const commandFrameHeight = resolveCommandPanelFrameHeight(options, frameMaxHeight);
  const flowFrameHeight = resolveFlowPanelFrameHeight(options, frameMaxHeight);
  const leftFrameHeight =
    options.pendingCommand.value === null
      ? searchFrameHeight
      : commandFrameHeight ?? options.constants.paramOverlayMinHeight;
  const rightFrameHeight = flowFrameHeight ?? 0;
  let resolvedFrameHeight = Math.max(leftFrameHeight, rightFrameHeight);

  if (
    !overrides.ignoreCommandPanelExitLock &&
    overrides.commandPanelExitFrameHeightLock !== null &&
    overrides.commandPanelExitFrameHeightLock !== undefined
  ) {
    resolvedFrameHeight = clamp(
      Math.max(resolvedFrameHeight, overrides.commandPanelExitFrameHeightLock),
      options.constants.windowBaseHeight,
      frameMaxHeight
    );
  }

  return {
    width,
    height: resolvedFrameHeight + dragStripHeight
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
