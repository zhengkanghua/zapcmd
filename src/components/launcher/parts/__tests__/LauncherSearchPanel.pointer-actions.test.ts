import { mount } from "@vue/test-utils";
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
});
