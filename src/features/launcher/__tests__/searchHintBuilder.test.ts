import { describe, expect, it } from "vitest";
import { buildSearchHintLines } from "../searchHintBuilder";

describe("searchHintBuilder", () => {
  it("生成两行搜索提示，并实时带入左右键映射", () => {
    const lines = buildSearchHintLines({
      hotkeys: {
        navigateUp: "↑",
        navigateDown: "↓",
        executeSelected: "Enter",
        stageSelected: "CmdOrCtrl+Enter",
        openActionPanel: "Shift+Enter",
        copySelected: "CmdOrCtrl+Shift+C",
        switchFocus: "Ctrl+Tab",
        toggleQueue: "Tab"
      },
      pointerActions: {
        leftClick: "action-panel",
        rightClick: "stage"
      }
    });

    expect(lines).toHaveLength(2);
    expect(lines[0]?.map((item) => item.action)).toEqual([
      "选择",
      "执行",
      "入队",
      "动作",
      "复制"
    ]);
    expect(lines[1]?.map((item) => item.action)).toContain("左键 动作");
    expect(lines[1]?.map((item) => item.action)).toContain("右键 入队");
    expect(lines[1]?.map((item) => item.action)).toContain("切焦点");
  });
});
