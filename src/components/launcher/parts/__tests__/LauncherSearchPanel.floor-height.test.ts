import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import { describe, expect, it } from "vitest";

import type { CommandTemplate } from "../../../../features/commands/types";
import {
  LAUNCHER_DRAWER_FLOOR_ROWS,
  LAUNCHER_DRAWER_ROW_HEIGHT_PX,
  LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX
} from "../../../../composables/launcher/useLauncherLayoutMetrics";
import type { KeyboardHint, LauncherSearchPanelProps } from "../../types";
import LauncherSearchPanel from "../LauncherSearchPanel.vue";

const DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX =
  LAUNCHER_DRAWER_FLOOR_ROWS * LAUNCHER_DRAWER_ROW_HEIGHT_PX + LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX;

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
  const keyboardHints: KeyboardHint[] = [
    {
      keys: ["Enter"],
      action: "执行"
    }
  ];
  const stagingHints: KeyboardHint[] = [
    {
      keys: ["Esc"],
      action: "返回"
    }
  ];
  return {
    query: "dock",
    executing: false,
    executionFeedbackMessage: "",
    executionFeedbackTone: "neutral",
    drawerOpen: true,
    drawerViewportHeight: DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX,
    drawerFloorViewportHeight: DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX,
    drawerFillerHeight: 0,
    keyboardHints,
    filteredResults: [],
    activeIndex: 0,
    stagedFeedbackCommandId: null,
    stagedCommandCount: 0,
    flowOpen: false,
    reviewOpen: false,
    stagingDrawerState: "closed",
    stagedCommands: [],
    stagingHints,
    stagingListShouldScroll: false,
    stagingListMaxHeight: "0px",
    focusZone: "search",
    stagingActiveIndex: 0,
    setSearchInputRef: () => {},
    setDrawerRef: () => {},
    setResultButtonRef: () => {},
    setStagingPanelRef: () => {},
    setStagingListRef: () => {},
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

  it("Review 打开但 drawerOpen=false 时渲染 floor 占位，避免左侧背景塌陷", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        query: "",
        drawerOpen: false,
        drawerViewportHeight: 0,
        drawerFillerHeight: 0,
        reviewOpen: true,
        drawerFloorViewportHeight: DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX
      }),
      global: {
        stubs: {
          LauncherQueueSummaryPill: { template: "<button />" }
        }
      }
    });

    const floor = wrapper.get('[data-testid="result-drawer-floor"]');
    expect((floor.element as HTMLElement).style.height).toBe(`${DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX}px`);
    expect(floor.attributes("aria-hidden")).toBe("true");
    expect(floor.attributes()).toHaveProperty("inert");
  });

  it("Flow 打开但 drawerOpen=false 时渲染 floor 占位，避免左侧背景塌陷", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        query: "",
        drawerOpen: false,
        drawerViewportHeight: 0,
        drawerFillerHeight: 0,
        flowOpen: true,
        reviewOpen: false,
        drawerFloorViewportHeight: DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX
      }),
      global: {
        stubs: {
          LauncherQueueSummaryPill: { template: "<button />" }
        }
      }
    });

    const floor = wrapper.get('[data-testid="result-drawer-floor"]');
    expect((floor.element as HTMLElement).style.height).toBe(`${DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX}px`);
    expect(floor.attributes("aria-hidden")).toBe("true");
    expect(floor.attributes()).toHaveProperty("inert");
  });
});

describe("LauncherSearchPanel in-panel Review 契约回归（Phase 17）", () => {
  it("Review 打开时 results drawer 仍保持 inert/aria-hidden（背景可见但不可交互）", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        reviewOpen: true,
        stagingDrawerState: "open",
        stagedCommands: [
          {
            id: "cmd-1",
            title: "示例命令",
            rawPreview: "echo preview",
            renderedCommand: "echo preview",
            args: [],
            argValues: {}
          }
        ]
      })
    });

    const drawer = wrapper.get(".result-drawer");
    expect(drawer.attributes()).toHaveProperty("inert");
    expect(drawer.attributes("aria-hidden")).toBe("true");
  });

  it("Review 打开时点击 search capsule/输入区域会触发 search-capsule-back（等同 Esc）", async () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        reviewOpen: true,
        stagingDrawerState: "open",
        stagedCommands: [
          {
            id: "cmd-1",
            title: "示例命令",
            rawPreview: "echo preview",
            renderedCommand: "echo preview",
            args: [],
            argValues: {}
          }
        ]
      })
    });

    await wrapper.get(".search-form").trigger("pointerdown");
    expect(wrapper.emitted("search-capsule-back")).toHaveLength(1);
  });

  it("点击 scrim 关闭后焦点回到搜索输入框（由父层 scheduleSearchInputFocus 等价模拟）", async () => {
    const Harness = defineComponent({
      components: { LauncherSearchPanel },
      setup() {
        const reviewOpen = ref(true);
        const searchInput = ref<HTMLInputElement | null>(null);
        const drawerHeight = DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX;
        const setSearchInputRef = (el: unknown) => {
          searchInput.value = el instanceof HTMLInputElement ? el : null;
        };

        async function onToggleStaging(): Promise<void> {
          reviewOpen.value = false;
          await nextTick();
          searchInput.value?.focus();
        }

        return { reviewOpen, setSearchInputRef, onToggleStaging, drawerHeight };
      },
      template: `
        <LauncherSearchPanel
          :query="'dock'"
          :executing="false"
          :execution-feedback-message="''"
          :execution-feedback-tone="'neutral'"
          :drawer-open="true"
          :drawer-viewport-height="drawerHeight"
          :drawer-floor-viewport-height="drawerHeight"
          :drawer-filler-height="0"
          :keyboard-hints="[{ keys: ['Esc'], action: '返回' }]"
          :filtered-results="[]"
          :active-index="0"
          :staged-feedback-command-id="null"
          :staged-command-count="1"
          :flow-open="false"
          :review-open="reviewOpen"
          :staging-drawer-state="'open'"
          :staged-commands="[{ id: 'cmd-1', title: '示例命令', rawPreview: 'echo preview', renderedCommand: 'echo preview', args: [], argValues: {} }]"
          :staging-hints="[{ keys: ['Esc'], action: '返回' }]"
          :staging-list-should-scroll="true"
          :staging-list-max-height="'200px'"
          :focus-zone="'staging'"
          :staging-active-index="0"
          :set-search-input-ref="setSearchInputRef"
          :set-drawer-ref="() => {}"
          :set-result-button-ref="() => {}"
          :set-staging-panel-ref="() => {}"
          :set-staging-list-ref="() => {}"
          @toggle-staging="onToggleStaging"
        />
      `
    });

    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    await wrapper.get(".review-overlay__scrim").trigger("click");
    await nextTick();

    const input = wrapper.get('[data-testid="zapcmd-search-input"]').element as HTMLInputElement;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    expect(active).toBe(input);
    wrapper.unmount();
  });
});

describe("LauncherSearchPanel Flow 打开时 Search Capsule 回退/禁用输入（Phase 20）", () => {
  it("Flow 打开时点击 search capsule（queue pill 除外）会触发 search-capsule-back", async () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        flowOpen: true,
        reviewOpen: false,
        stagingDrawerState: "closed"
      }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    await wrapper.get(".search-form").trigger("pointerdown");
    expect(wrapper.emitted("search-capsule-back")).toHaveLength(1);
  });

  it("Flow 打开时搜索输入不允许修改 query（不 emit query-input）", async () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        flowOpen: true,
        query: "dock",
        reviewOpen: false,
        stagingDrawerState: "closed"
      })
    });

    await wrapper.get('[data-testid="zapcmd-search-input"]').setValue("new query");
    expect(wrapper.emitted("query-input")).toBeUndefined();
  });

  it("Flow 打开时 results drawer 保持 inert/aria-hidden（背景可见但不可交互）", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        flowOpen: true,
        drawerOpen: true,
        filteredResults: [createCommandTemplate("a")],
        reviewOpen: false,
        stagingDrawerState: "closed"
      })
    });

    const drawer = wrapper.get(".result-drawer");
    expect(drawer.attributes()).toHaveProperty("inert");
    expect(drawer.attributes("aria-hidden")).toBe("true");
  });
});
