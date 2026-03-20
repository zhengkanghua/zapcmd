import { describe, expect, it } from "vitest";

import { clampSearchPanelHeight, resolvePanelHeight } from "../../launcher/useWindowSizing/panelHeightContract";

describe("panelHeightContract", () => {
  it("resolvePanelHeight 在 inherited 低于 min 时返回 min", () => {
    expect(
      resolvePanelHeight({
        panelMaxHeight: 640,
        inheritedPanelHeight: 420,
        panelMinHeight: 560
      })
    ).toBe(560);
  });

  it("resolvePanelHeight cap 为硬上限", () => {
    expect(
      resolvePanelHeight({
        panelMaxHeight: 640,
        inheritedPanelHeight: 720,
        panelMinHeight: 680
      })
    ).toBe(640);
  });

  it("resolvePanelHeight 在 min 与 max 之间时沿用 inherited", () => {
    expect(
      resolvePanelHeight({
        panelMaxHeight: 640,
        inheritedPanelHeight: 600,
        panelMinHeight: 560
      })
    ).toBe(600);
  });

  it("clampSearchPanelHeight 只按 natural height 限制搜索", () => {
    expect(
      clampSearchPanelHeight({
        panelMaxHeight: 640,
        naturalPanelHeight: 124
      })
    ).toBe(124);
  });

  it("clampSearchPanelHeight 在 natural 超过 max 时 clamp 到 max", () => {
    expect(
      clampSearchPanelHeight({
        panelMaxHeight: 640,
        naturalPanelHeight: 820
      })
    ).toBe(640);
  });
});
