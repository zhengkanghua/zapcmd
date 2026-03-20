import { afterEach, describe, expect, it } from "vitest";

import {
  resolveCommandPanelMinHeight,
  resolveFlowPanelMinHeight,
  measureCommandPanelFullNaturalHeight,
  measureFlowPanelMinHeight
} from "../../launcher/useWindowSizing/panelMeasurement";

function mockElementHeight(
  element: HTMLElement,
  options: {
    height: number;
    scrollHeight?: number;
  }
): void {
  const { height, scrollHeight = height } = options;
  Object.defineProperty(element, "offsetHeight", {
    configurable: true,
    value: height
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: height
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: scrollHeight
  });
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({
        top: 0,
        bottom: height,
        left: 0,
        right: 0,
        width: 0,
        height,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }) as DOMRect
  });
}

function buildCommandShell(input: {
  headerHeight: number;
  contentScrollHeight: number;
  footerHeight: number;
  dividerHeights: [number, number];
}): HTMLElement {
  const shell = document.createElement("div");
  const panel = document.createElement("section");
  panel.className = "command-panel";

  const header = document.createElement("header");
  header.className = "command-panel__header";
  mockElementHeight(header, { height: input.headerHeight });

  const dividerTop = document.createElement("div");
  dividerTop.className = "command-panel__divider";
  mockElementHeight(dividerTop, { height: input.dividerHeights[0] });

  const content = document.createElement("div");
  content.className = "command-panel__content";
  mockElementHeight(content, {
    height: input.contentScrollHeight,
    scrollHeight: input.contentScrollHeight
  });

  const dividerBottom = document.createElement("div");
  dividerBottom.className = "command-panel__divider";
  mockElementHeight(dividerBottom, { height: input.dividerHeights[1] });

  const footer = document.createElement("footer");
  footer.className = "command-panel__footer";
  mockElementHeight(footer, { height: input.footerHeight });

  panel.appendChild(header);
  panel.appendChild(dividerTop);
  panel.appendChild(content);
  panel.appendChild(dividerBottom);
  panel.appendChild(footer);
  shell.appendChild(panel);
  document.body.appendChild(shell);
  return shell;
}

function buildFlowShell(input: {
  headerHeight: number;
  footerHeight: number;
  emptyStateHeight?: number;
  cardHeights?: number[];
}): HTMLElement {
  const shell = document.createElement("div");
  const panel = document.createElement("section");
  panel.className = "flow-panel";

  const header = document.createElement("header");
  header.className = "flow-panel__header";
  mockElementHeight(header, { height: input.headerHeight });

  const body = document.createElement("div");
  body.className = "flow-panel__body";

  if (typeof input.emptyStateHeight === "number") {
    const empty = document.createElement("div");
    empty.className = "flow-panel__empty";
    mockElementHeight(empty, { height: input.emptyStateHeight });
    body.appendChild(empty);
  }

  if (input.cardHeights?.length) {
    const list = document.createElement("ul");
    list.className = "flow-panel__list";
    input.cardHeights.forEach((height, index) => {
      const item = document.createElement("li");
      item.className = "flow-panel__list-item";
      item.dataset.stagingIndex = String(index);
      const card = document.createElement("article");
      card.className = "flow-panel__card staging-card";
      mockElementHeight(card, { height });
      item.appendChild(card);
      list.appendChild(item);
    });
    body.appendChild(list);
  }

  const footer = document.createElement("footer");
  footer.className = "flow-panel__footer";
  mockElementHeight(footer, { height: input.footerHeight });

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(footer);
  shell.appendChild(panel);
  document.body.appendChild(shell);
  return shell;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("panelMeasurement", () => {
  it("CommandPanel fallback min height 只在实测不足时兜底", () => {
    expect(
      resolveCommandPanelMinHeight({
        fallbackMinHeight: 340,
        fullNaturalHeight: 354
      })
    ).toBe(354);

    expect(
      resolveCommandPanelMinHeight({
        fallbackMinHeight: 340,
        fullNaturalHeight: null
      })
    ).toBe(340);
  });

  it("FlowPanel 只有测不到 DOM 时才回退兜底；有实测时直接采用真实最小高度", () => {
    expect(
      resolveFlowPanelMinHeight({
        fallbackMinHeight: 320,
        measuredMinHeight: 260
      })
    ).toBe(260);

    expect(
      resolveFlowPanelMinHeight({
        fallbackMinHeight: 320,
        measuredMinHeight: 0
      })
    ).toBe(320);

    expect(
      resolveFlowPanelMinHeight({
        fallbackMinHeight: 320,
        measuredMinHeight: null
      })
    ).toBe(320);
  });

  it("CommandPanel 完整盒子高度包含 header + content + footer + 两个 divider", () => {
    const shell = buildCommandShell({
      headerHeight: 52,
      contentScrollHeight: 240,
      footerHeight: 60,
      dividerHeights: [3, 7]
    });

    expect(measureCommandPanelFullNaturalHeight(shell)).toBe(362);
  });

  it("CommandPanel 缺少关键节点时返回 null，不读取残缺 DOM", () => {
    const shell = buildCommandShell({
      headerHeight: 52,
      contentScrollHeight: 240,
      footerHeight: 60,
      dividerHeights: [1, 1]
    });
    shell.querySelector(".command-panel__footer")?.remove();

    expect(measureCommandPanelFullNaturalHeight(shell)).toBeNull();
  });

  it("FlowPanel 空态按 header + empty-state + footer 计算，且空态优先于列表", () => {
    const shell = buildFlowShell({
      headerHeight: 52,
      emptyStateHeight: 96,
      footerHeight: 60,
      cardHeights: [110, 148]
    });

    expect(measureFlowPanelMinHeight(shell)).toBe(208);
  });

  it("FlowPanel 非空态按前 2 张真实异高卡片求和", () => {
    const shell = buildFlowShell({
      headerHeight: 52,
      footerHeight: 60,
      cardHeights: [110, 148]
    });

    expect(measureFlowPanelMinHeight(shell)).toBe(370);
  });

  it("目标面板 DOM 缺席时返回 null，不回退读取旧面板高度", () => {
    const shell = document.createElement("div");
    const legacy = document.createElement("section");
    legacy.className = "staging-panel";
    mockElementHeight(legacy, { height: 999, scrollHeight: 999 });
    shell.appendChild(legacy);
    document.body.appendChild(shell);

    expect(measureCommandPanelFullNaturalHeight(shell)).toBeNull();
    expect(measureFlowPanelMinHeight(shell)).toBeNull();
  });
});
