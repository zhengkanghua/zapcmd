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

  it("会裁剪空热键，并支持 execute/copy 指针映射文案", () => {
    const lines = buildSearchHintLines({
      hotkeys: {
        navigateUp: " ",
        navigateDown: "",
        executeSelected: "Enter",
        stageSelected: "",
        openActionPanel: "",
        copySelected: "CmdOrCtrl+Shift+C",
        switchFocus: " ",
        toggleQueue: ""
      },
      pointerActions: {
        leftClick: "execute",
        rightClick: "copy"
      }
    });

    expect(lines[0]).toEqual([
      { keys: [], action: "选择" },
      { keys: ["Enter"], action: "执行" },
      { keys: [], action: "入队" },
      { keys: [], action: "动作" },
      { keys: ["CmdOrCtrl+Shift+C"], action: "复制" }
    ]);
    expect(lines[1]).toEqual([
      { keys: [], action: "左键 执行" },
      { keys: [], action: "右键 复制" },
      { keys: [], action: "切焦点" },
      { keys: [], action: "队列" }
    ]);
  });
});
