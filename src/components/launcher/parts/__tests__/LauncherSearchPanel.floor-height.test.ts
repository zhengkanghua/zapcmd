import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { CommandTemplate } from "../../../../features/commands/types";
import type { LauncherSearchPanelProps } from "../../types";
import LauncherSearchPanel from "../LauncherSearchPanel.vue";

function createCommandTemplate(id: string): CommandTemplate {
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
    drawerViewportHeight: 322,
    drawerFillerHeight: 0,
    keyboardHintText: "hint",
    filteredResults: [],
    activeIndex: 0,
    stagedFeedbackCommandId: null,
    stagedCommandCount: 0,
    reviewOpen: false,
    setSearchInputRef: () => {},
    setDrawerRef: () => {},
    setResultButtonRef: () => {},
    ...overrides
  };
}

describe("LauncherSearchPanel floor height 语义约束（Phase 13）", () => {
  it("无假结果 DOM：.result-item 数量严格等于 filteredResults.length", () => {
    const counts = [0, 1, 3, 4] as const;
    for (const count of counts) {
      const filteredResults = Array.from({ length: count }, (_, idx) =>
        createCommandTemplate(String(idx))
      );
      const wrapper = mount(LauncherSearchPanel, {
        props: createProps({ filteredResults }),
        global: {
          stubs: {
            LauncherHighlightText: { template: "<span />" }
          }
        }
      });

      expect(wrapper.findAll(".result-item")).toHaveLength(count);
      wrapper.unmount();
    }
  });

  it("drawerFillerHeight > 0 时渲染 filler，且 aria-hidden 且不进入 <ul>", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        filteredResults: [createCommandTemplate("a")],
        drawerFillerHeight: 24
      }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    const filler = wrapper.get(".result-drawer__filler");
    expect(filler.attributes("aria-hidden")).toBe("true");
    expect(wrapper.find(".result-list .result-drawer__filler").exists()).toBe(false);

    const drawer = wrapper.get(".result-drawer");
    const lastChild = drawer.element.lastElementChild as HTMLElement | null;
    expect(lastChild?.classList.contains("result-drawer__filler")).toBe(true);

    expect(filler.findAll("button, a, input, textarea, select, [tabindex]")).toHaveLength(0);
  });

  it("drawerFillerHeight = 0 时不渲染 filler，避免污染 DOM", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        filteredResults: [createCommandTemplate("a")],
        drawerFillerHeight: 0
      }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    expect(wrapper.find(".result-drawer__filler").exists()).toBe(false);
  });
});
