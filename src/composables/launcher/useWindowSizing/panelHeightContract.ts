export interface ResolvePanelHeightOptions {
  panelMaxHeight: number;
  inheritedPanelHeight: number;
  panelMinHeight: number;
}

export interface ClampSearchPanelHeightOptions {
  panelMaxHeight: number;
  naturalPanelHeight: number;
}

/**
 * 统一 Command / Flow 面板高度收口规则，确保继承高度、最小高度和上限口径一致。
 */
export function resolvePanelHeight(options: ResolvePanelHeightOptions): number {
  return Math.min(
    options.panelMaxHeight,
    Math.max(options.inheritedPanelHeight, options.panelMinHeight)
  );
}

/**
 * Search 只使用自然高度，不继承其他面板的历史高度。
 */
export function clampSearchPanelHeight(options: ClampSearchPanelHeightOptions): number {
  return Math.min(options.panelMaxHeight, options.naturalPanelHeight);
}
