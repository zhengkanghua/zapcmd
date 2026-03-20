export interface ResolvePanelHeightOptions {
  panelMaxHeight: number;
  inheritedPanelHeight: number;
  panelMinHeight: number;
}

export interface ClampSearchPanelHeightOptions {
  panelMaxHeight: number;
  naturalPanelHeight: number;
}

export interface ResolveSearchPanelEffectiveHeightOptions {
  searchCapsuleHeight: number;
  resultDrawerEffectiveHeight: number;
}

export interface ResolveSharedPanelMaxHeightOptions {
  searchCapsuleHeight: number;
  maxSearchResultsViewportHeight: number;
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

/**
 * Search 有效高度只由搜索框胶囊区与当前结果抽屉 viewport 组成。
 */
export function resolveSearchPanelEffectiveHeight(
  options: ResolveSearchPanelEffectiveHeightOptions
): number {
  return options.searchCapsuleHeight + options.resultDrawerEffectiveHeight;
}

/**
 * 共享面板上限只由搜索框胶囊区与搜索结果最大 viewport 组成。
 */
export function resolveSharedPanelMaxHeight(options: ResolveSharedPanelMaxHeightOptions): number {
  return options.searchCapsuleHeight + options.maxSearchResultsViewportHeight;
}
