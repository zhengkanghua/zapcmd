import { describe, expect, it } from "vitest";

import { resolveDropdownKeyAction } from "../dropdownKeyboard";

describe("resolveDropdownKeyAction", () => {
  it("closed 状态下 ArrowDown / ArrowUp / Enter / Space 会产出 open action", () => {
    expect(
      resolveDropdownKeyAction({
        key: "ArrowDown",
        open: false,
        selectedIndex: 1,
        focusIndex: -1,
        optionCount: 3
      })
    ).toEqual({ type: "open", initialIndex: 2 });

    expect(
      resolveDropdownKeyAction({
        key: "ArrowUp",
        open: false,
        selectedIndex: 1,
        focusIndex: -1,
        optionCount: 3
      })
    ).toEqual({ type: "open", initialIndex: 2 });

    expect(
      resolveDropdownKeyAction({
        key: "Enter",
        open: false,
        selectedIndex: 1,
        focusIndex: -1,
        optionCount: 3
      })
    ).toEqual({ type: "open", initialIndex: 1 });

    expect(
      resolveDropdownKeyAction({
        key: " ",
        open: false,
        selectedIndex: -1,
        focusIndex: -1,
        optionCount: 3
      })
    ).toEqual({ type: "open", initialIndex: 0 });
  });

  it("open 状态下 ArrowDown / ArrowUp / Home / End 产出稳定 focus action", () => {
    expect(
      resolveDropdownKeyAction({
        key: "ArrowDown",
        open: true,
        selectedIndex: 0,
        focusIndex: 1,
        optionCount: 3
      })
    ).toEqual({ type: "focus", nextIndex: 2 });

    expect(
      resolveDropdownKeyAction({
        key: "ArrowUp",
        open: true,
        selectedIndex: 0,
        focusIndex: 1,
        optionCount: 3
      })
    ).toEqual({ type: "focus", nextIndex: 0 });

    expect(
      resolveDropdownKeyAction({
        key: "Home",
        open: true,
        selectedIndex: 0,
        focusIndex: 2,
        optionCount: 3
      })
    ).toEqual({ type: "focus", nextIndex: 0 });

    expect(
      resolveDropdownKeyAction({
        key: "End",
        open: true,
        selectedIndex: 0,
        focusIndex: 1,
        optionCount: 3
      })
    ).toEqual({ type: "focus", nextIndex: 2 });
  });

  it("open 状态下 Enter / Space / Tab / Escape 会产出 select 或 close action", () => {
    expect(
      resolveDropdownKeyAction({
        key: "Enter",
        open: true,
        selectedIndex: 0,
        focusIndex: 2,
        optionCount: 3
      })
    ).toEqual({ type: "select" });

    expect(
      resolveDropdownKeyAction({
        key: " ",
        open: true,
        selectedIndex: 0,
        focusIndex: 2,
        optionCount: 3
      })
    ).toEqual({ type: "select" });

    expect(
      resolveDropdownKeyAction({
        key: "Tab",
        open: true,
        selectedIndex: 0,
        focusIndex: 2,
        optionCount: 3
      })
    ).toEqual({ type: "close" });

    expect(
      resolveDropdownKeyAction({
        key: "Escape",
        open: true,
        selectedIndex: 0,
        focusIndex: 2,
        optionCount: 3
      })
    ).toEqual({ type: "close" });
  });

  it("无选项或未命中快捷键时返回 noop，避免越界 focus", () => {
    expect(
      resolveDropdownKeyAction({
        key: "ArrowDown",
        open: false,
        selectedIndex: -1,
        focusIndex: -1,
        optionCount: 0
      })
    ).toEqual({ type: "noop" });

    expect(
      resolveDropdownKeyAction({
        key: "a",
        open: true,
        selectedIndex: 0,
        focusIndex: 0,
        optionCount: 3
      })
    ).toEqual({ type: "noop" });
  });
});
