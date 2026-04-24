import { describe, expect, it } from "vitest";

import { resolveDropdownPanelStyle } from "../dropdownPositioning";

function createDomRect(overrides: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
    ...overrides
  } as DOMRect;
}

describe("resolveDropdownPanelStyle", () => {
  it("ghost variant 的 panel minWidth 至少 160px，default 跟随 trigger 宽度", () => {
    expect(
      resolveDropdownPanelStyle({
        triggerRect: createDomRect({ left: 12, bottom: 48, width: 120 }),
        variant: "ghost"
      })
    ).toMatchObject({
      top: "54px",
      left: "12px",
      minWidth: "160px"
    });

    expect(
      resolveDropdownPanelStyle({
        triggerRect: createDomRect({ left: 24, bottom: 52, width: 188 }),
        variant: "default"
      })
    ).toMatchObject({
      top: "58px",
      left: "24px",
      minWidth: "188px"
    });
  });

  it("总是返回固定定位与 settings popover zIndex contract", () => {
    expect(
      resolveDropdownPanelStyle({
        triggerRect: createDomRect({ left: 18.3, bottom: 40.7, width: 180.4 }),
        variant: "default"
      })
    ).toEqual({
      position: "fixed",
      top: "47px",
      left: "18px",
      minWidth: "180px",
      zIndex: "var(--ui-settings-z-popover)"
    });
  });
});
