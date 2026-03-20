interface ResolveCommandPanelMinHeightOptions {
  fallbackMinHeight: number;
  fullNaturalHeight: number | null;
}

interface ResolveFlowPanelMinHeightOptions {
  fallbackMinHeight: number;
  measuredMinHeight: number | null;
}

const FLOW_PANEL_BODY_VERTICAL_PADDING_FALLBACK_PX = 24;
const FLOW_PANEL_LIST_GAP_FALLBACK_PX = 8;

function measureElementBoxHeight(element: HTMLElement, useScrollHeight = false): number {
  const candidates = [
    element.getBoundingClientRect().height,
    element.offsetHeight,
    element.clientHeight,
    useScrollHeight ? element.scrollHeight : 0
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (candidates.length === 0) {
    return 0;
  }

  return Math.ceil(Math.max(...candidates));
}

function queryPanel(shell: HTMLElement, selector: string): HTMLElement | null {
  if (shell.matches(selector)) {
    return shell;
  }
  return shell.querySelector<HTMLElement>(selector);
}

function parsePixelValue(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function measureVerticalPadding(element: HTMLElement, fallback = 0): number {
  const style = globalThis.getComputedStyle?.(element);
  const resolved =
    parsePixelValue(style?.paddingTop ?? "") + parsePixelValue(style?.paddingBottom ?? "");
  if (resolved > 0) {
    return Math.ceil(resolved);
  }
  return fallback;
}

function measureVerticalGap(element: HTMLElement, fallback = 0): number {
  const style = globalThis.getComputedStyle?.(element);
  const rowGap = parsePixelValue(style?.rowGap ?? "");
  const gap = parsePixelValue(style?.gap ?? "");
  const resolved = rowGap || gap;
  if (resolved > 0) {
    return Math.ceil(resolved);
  }
  return fallback;
}

function measureFlowListItemsSpan(listItems: HTMLElement[]): number {
  if (listItems.length === 0) {
    return 0;
  }

  if (listItems.length === 1) {
    return measureElementBoxHeight(listItems[0]!);
  }

  const firstRect = listItems[0]!.getBoundingClientRect();
  const secondRect = listItems[1]!.getBoundingClientRect();
  if (
    Number.isFinite(firstRect.top) &&
    Number.isFinite(firstRect.bottom) &&
    Number.isFinite(secondRect.top) &&
    Number.isFinite(secondRect.bottom) &&
    secondRect.bottom > firstRect.top
  ) {
    return Math.ceil(secondRect.bottom - firstRect.top);
  }

  return listItems.reduce((total, item) => total + measureElementBoxHeight(item), 0);
}

/**
 * CommandPanel 最低高度优先使用完整盒子自然高度；实测缺失时退回静态兜底。
 */
export function resolveCommandPanelMinHeight(
  options: ResolveCommandPanelMinHeightOptions
): number {
  return Math.max(options.fallbackMinHeight, options.fullNaturalHeight ?? 0);
}

/**
 * FlowPanel 最低高度有实测时直接采用真实值；只有实测缺失时才退回静态兜底。
 */
export function resolveFlowPanelMinHeight(
  options: ResolveFlowPanelMinHeightOptions
): number {
  if (Number.isFinite(options.measuredMinHeight) && (options.measuredMinHeight ?? 0) > 0) {
    return options.measuredMinHeight as number;
  }
  return options.fallbackMinHeight;
}

/**
 * 只基于当前 command-panel DOM 计算完整盒子自然高度，避免读取旧面板残留节点。
 */
export function measureCommandPanelFullNaturalHeight(shell: HTMLElement): number | null {
  const panel = queryPanel(shell, ".command-panel");
  if (!panel) {
    return null;
  }

  const header = panel.querySelector<HTMLElement>(".command-panel__header");
  const content = panel.querySelector<HTMLElement>(".command-panel__content");
  const footer = panel.querySelector<HTMLElement>(".command-panel__footer");
  const dividers = Array.from(panel.querySelectorAll<HTMLElement>(".command-panel__divider"));

  if (!header || !content || !footer || dividers.length < 2) {
    return null;
  }

  const dividerHeight = dividers
    .slice(0, 2)
    .reduce((total, divider) => total + measureElementBoxHeight(divider), 0);

  return (
    measureElementBoxHeight(header) +
    measureElementBoxHeight(content, true) +
    measureElementBoxHeight(footer) +
    dividerHeight
  );
}

/**
 * FlowPanel 只测空态或前两张真实卡片，显式忽略 toast、编辑态与滚动条造成的瞬时波动。
 */
export function measureFlowPanelMinHeight(shell: HTMLElement): number | null {
  const panel = queryPanel(shell, ".flow-panel");
  if (!panel) {
    return null;
  }

  const header = panel.querySelector<HTMLElement>(".flow-panel__header");
  const body = panel.querySelector<HTMLElement>(".flow-panel__body");
  const footer = panel.querySelector<HTMLElement>(".flow-panel__footer");
  if (!header || !body || !footer) {
    return null;
  }

  const emptyState = body.querySelector<HTMLElement>(".flow-panel__empty");
  const bodyVerticalPadding = measureVerticalPadding(
    body,
    FLOW_PANEL_BODY_VERTICAL_PADDING_FALLBACK_PX
  );
  if (emptyState) {
    return (
      measureElementBoxHeight(header) +
      bodyVerticalPadding +
      measureElementBoxHeight(emptyState, true) +
      measureElementBoxHeight(footer)
    );
  }

  const list = body.querySelector<HTMLElement>(".flow-panel__list");
  const listItems = Array.from(body.querySelectorAll<HTMLElement>(".flow-panel__list-item")).slice(0, 2);
  if (listItems.length === 0) {
    return null;
  }

  const cardHeight = listItems.reduce((total, item) => {
    const card = item.querySelector<HTMLElement>(".flow-panel__card, .staging-card") ?? item;
    return total + measureElementBoxHeight(card, true);
  }, 0);
  const interCardGap =
    Math.max(0, listItems.length - 1) *
    measureVerticalGap(list ?? body, FLOW_PANEL_LIST_GAP_FALLBACK_PX);
  const listItemsSpanHeight = measureFlowListItemsSpan(listItems);

  return (
    measureElementBoxHeight(header) +
    bodyVerticalPadding +
    Math.max(listItemsSpanHeight, cardHeight + interCardGap) +
    measureElementBoxHeight(footer)
  );
}
