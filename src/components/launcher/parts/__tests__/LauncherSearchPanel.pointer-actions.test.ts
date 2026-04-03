import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it } from "vitest";
import type { CommandTemplate } from "../../../../features/commands/types";
import type { LauncherSearchPanelProps } from "../../types";
import LauncherSearchPanel from "../LauncherSearchPanel.vue";

function createCommand(id: string): CommandTemplate {
  return {
    id,
    title: `title-${id}`,
    description: `desc-${id}`,
    preview: `cmd ${id}`,
    folder: "folder",
    category: "cat",
    needsArgs: false
  };
}

function createProps(
  overrides: Partial<LauncherSearchPanelProps> = {}
): LauncherSearchPanelProps {
  return {
    query: "dock",
    executing: false,
    executionFeedbackMessage: "",
    executionFeedbackTone: "neutral",
    drawerOpen: true,
    drawerViewportHeight: 320,
    keyboardHints: [],
    searchHintLines: [],
    leftClickAction: "action-panel",
    rightClickAction: "stage",
    filteredResults: [createCommand("docker-logs")],
    activeIndex: 0,
    queuedFeedbackCommandId: null,
    queuedCommandCount: 0,
    flowOpen: false,
    reviewOpen: false,
    setSearchInputRef: () => {},
    setDrawerRef: () => {},
    setResultButtonRef: () => {},
    ...overrides
  };
}

describe("LauncherSearchPanel pointer actions", () => {
  it("默认左键打开动作面板", async () => {
    const command = createCommand("docker-logs");
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({ filteredResults: [command] }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    await wrapper.get(".result-item").trigger("click");

    expect(wrapper.emitted("open-action-panel")?.[0]).toEqual([command]);
    expect(wrapper.emitted("execute-result")).toBeUndefined();
  });

  it("默认右键加入执行流", async () => {
    const command = createCommand("docker-logs");
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({ filteredResults: [command] }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    await wrapper.get(".result-item").trigger("contextmenu");

    expect(wrapper.emitted("enqueue-result")?.[0]).toEqual([command]);
  });

  it("一级提示换行后才隐藏二级提示", async () => {
    const wrapper = mount(LauncherSearchPanel, {
      attachTo: document.body,
      props: createProps({
        searchHintLines: [
          [
            { keys: ["↑", "↓"], action: "选择" },
            { keys: ["Enter"], action: "执行" },
            { keys: ["Ctrl+Enter"], action: "入队" },
            { keys: ["Shift+Enter"], action: "动作" },
            { keys: ["Ctrl+Shift+C"], action: "复制" }
          ],
          [
            { keys: [], action: "左键 动作" },
            { keys: [], action: "右键 入队" },
            { keys: ["Ctrl+Tab"], action: "切焦点" }
          ]
        ]
      }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    expect(wrapper.findAll(".keyboard-hint")).toHaveLength(2);

    const primaryLine = wrapper.findAll(".keyboard-hint")[0]!.element as HTMLElement;
    Object.defineProperty(primaryLine, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 240,
        height: 40,
        top: 0,
        left: 0,
        right: 240,
        bottom: 40,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });

    window.dispatchEvent(new Event("resize"));
    await nextTick();

    expect(wrapper.findAll(".keyboard-hint")).toHaveLength(1);
  });
});
