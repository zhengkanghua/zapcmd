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
import LauncherQueueReviewPanel from "../LauncherQueueReviewPanel.vue";
import LauncherSearchPanel from "../LauncherSearchPanel.vue";

const DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX =
  LAUNCHER_DRAWER_FLOOR_ROWS * LAUNCHER_DRAWER_ROW_HEIGHT_PX + LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX;
const TEN_ROWS_VIEWPORT_HEIGHT_PX =
  10 * LAUNCHER_DRAWER_ROW_HEIGHT_PX + LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX;

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
  return {
    query: "dock",
    executing: false,
    executionFeedbackMessage: "",
    executionFeedbackTone: "neutral",
    drawerOpen: true,
    drawerViewportHeight: DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX,
    keyboardHints,
    searchHintLines: [keyboardHints],
    leftClickAction: "action-panel",
    rightClickAction: "stage",
    filteredResults: [],
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

  it("drawerOpen=true 时不再渲染 filler，避免人为补高 Search", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        filteredResults: [createCommandTemplate("a")],
        drawerViewportHeight: 24
      }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    const drawer = wrapper.get('[data-testid="result-drawer"]');
    expect(drawer.attributes("style")).toContain("max-height: 24px;");
    expect(wrapper.find(".result-drawer__filler").exists()).toBe(false);
    expect(wrapper.find('[data-testid="result-drawer-floor"]').exists()).toBe(false);
  });

  it("10 条结果时 drawer 高度等于 10 行 token + 固定 chrome，不提前滚动", () => {
    const filteredResults = Array.from({ length: 10 }, (_, idx) =>
      createCommandTemplate(String(idx))
    );
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        filteredResults,
        drawerViewportHeight: TEN_ROWS_VIEWPORT_HEIGHT_PX
      }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    const drawer = wrapper.get('[data-testid="result-drawer"]');
    expect(drawer.attributes("style")).toContain(`max-height: ${TEN_ROWS_VIEWPORT_HEIGHT_PX}px;`);
    expect(wrapper.findAll(".result-item")).toHaveLength(10);
  });

  it("keyboard hint 区保持单行固定高度，不因 wrap 抬高 drawer viewport", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        keyboardHints: [
          { keys: ["Ctrl", "J"], action: "动作一" },
          { keys: ["Ctrl", "K"], action: "动作二" },
          { keys: ["Ctrl", "L"], action: "动作三" }
        ]
      })
    });

    expect(wrapper.get(".keyboard-hint").classes()).toContain("flex-nowrap");
  });

  it("drawerOpen=false 时不再渲染 result-drawer-floor 占位", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        query: "",
        drawerOpen: false,
        drawerViewportHeight: 0,
        reviewOpen: true
      }),
      global: {
        stubs: {
          LauncherQueueSummaryPill: { template: "<button />" }
        }
      }
    });

    expect(wrapper.find('[data-testid="result-drawer-floor"]').exists()).toBe(false);
    expect(wrapper.find(".result-drawer__filler").exists()).toBe(false);
  });

  it("普通搜索态点击 search capsule 不会错误触发回退", async () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        reviewOpen: false,
        flowOpen: false
      })
    });

    await wrapper.get(".search-form").trigger("pointerdown");
    expect(wrapper.emitted("search-capsule-back")).toBeUndefined();
  });

  it("点击 queue pill 时不会把事件误判为 search capsule 回退", async () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        reviewOpen: true,
        flowOpen: false
      }),
      global: {
        stubs: {
          LauncherQueueSummaryPill: {
            template: "<button class='queue-summary-pill'>queue</button>"
          }
        }
      }
    });

    await wrapper.get(".queue-summary-pill").trigger("pointerdown");
    expect(wrapper.emitted("search-capsule-back")).toBeUndefined();
  });

  it("长结果集首屏仅渲染首批结果，避免一次性挂载全部 DOM", () => {
    const filteredResults = Array.from({ length: 260 }, (_, idx) => createCommandTemplate(String(idx)));
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({ filteredResults }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    expect(wrapper.findAll(".result-item")).toHaveLength(60);
  });

  it("长结果集在接近抽屉底部滚动时按批补齐结果 DOM", async () => {
    const filteredResults = Array.from({ length: 260 }, (_, idx) => createCommandTemplate(String(idx)));
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({ filteredResults }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    const drawer = wrapper.get('[data-testid="result-drawer"]');
    Object.defineProperty(drawer.element, "clientHeight", {
      configurable: true,
      value: 240
    });
    Object.defineProperty(drawer.element, "scrollHeight", {
      configurable: true,
      value: 1200
    });
    Object.defineProperty(drawer.element, "scrollTop", {
      configurable: true,
      value: 940,
      writable: true
    });

    await drawer.trigger("scroll");
    await nextTick();

    expect(wrapper.findAll(".result-item")).toHaveLength(120);
  });

  it("滚动未接近抽屉底部时不会提前扩容结果 DOM", async () => {
    const filteredResults = Array.from({ length: 260 }, (_, idx) => createCommandTemplate(String(idx)));
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({ filteredResults }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    const drawer = wrapper.get('[data-testid="result-drawer"]');
    Object.defineProperty(drawer.element, "clientHeight", {
      configurable: true,
      value: 240
    });
    Object.defineProperty(drawer.element, "scrollHeight", {
      configurable: true,
      value: 1200
    });
    Object.defineProperty(drawer.element, "scrollTop", {
      configurable: true,
      value: 200,
      writable: true
    });

    await drawer.trigger("scroll");
    await nextTick();

    expect(wrapper.findAll(".result-item")).toHaveLength(60);
  });

  it("activeIndex 超出首批范围时会补齐到当前激活项，保证键盘导航可达", async () => {
    const filteredResults = Array.from({ length: 260 }, (_, idx) => createCommandTemplate(String(idx)));
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({ filteredResults }),
      global: {
        stubs: {
          LauncherHighlightText: { template: "<span />" }
        }
      }
    });

    expect(wrapper.findAll(".result-item")).toHaveLength(60);

    await wrapper.setProps({
      activeIndex: 85
    });
    await nextTick();

    expect(wrapper.findAll(".result-item")).toHaveLength(120);
  });
});

describe("LauncherSearchPanel in-panel Review 契约回归（Phase 17）", () => {
  it("Review 打开时 results drawer 仍保持 inert/aria-hidden（背景可见但不可交互）", () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        reviewOpen: true
      })
    });

    const drawer = wrapper.get(".result-drawer");
    expect(drawer.attributes()).toHaveProperty("inert");
    expect(drawer.attributes("aria-hidden")).toBe("true");
  });

  it("Review 打开时点击 search capsule/输入区域会触发 search-capsule-back（等同 Esc）", async () => {
    const wrapper = mount(LauncherSearchPanel, {
      props: createProps({
        reviewOpen: true
      })
    });

    await wrapper.get(".search-form").trigger("pointerdown");
    expect(wrapper.emitted("search-capsule-back")).toHaveLength(1);
  });

  it("点击 scrim 关闭后焦点回到搜索输入框（由父层 scheduleSearchInputFocus 等价模拟）", async () => {
    const Harness = defineComponent({
      components: { LauncherSearchPanel, LauncherQueueReviewPanel },
      setup() {
        const reviewOpen = ref(true);
        const queuePanelState = ref<"open" | "closed">("open");
        const searchInput = ref<HTMLInputElement | null>(null);
        const drawerHeight = DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX;
        const setSearchInputRef = (el: unknown) => {
          searchInput.value = el instanceof HTMLInputElement ? el : null;
        };

        async function onToggleQueue(): Promise<void> {
          reviewOpen.value = false;
          queuePanelState.value = "closed";
          await nextTick();
          searchInput.value?.focus();
        }

        return { reviewOpen, queuePanelState, setSearchInputRef, onToggleQueue, drawerHeight };
      },
      template: `
        <div>
          <LauncherSearchPanel
            :query="'dock'"
            :executing="false"
            :execution-feedback-message="''"
            :execution-feedback-tone="'neutral'"
            :drawer-open="true"
            :drawer-viewport-height="drawerHeight"
            :keyboard-hints="[{ keys: ['Esc'], action: '返回' }]"
            :filtered-results="[]"
            :active-index="0"
            :queued-feedback-command-id="null"
            :queued-command-count="1"
            :flow-open="false"
            :review-open="reviewOpen"
            :set-search-input-ref="setSearchInputRef"
            :set-drawer-ref="() => {}"
            :set-result-button-ref="() => {}"
            @toggle-queue="onToggleQueue"
          />

          <LauncherQueueReviewPanel
            v-if="reviewOpen"
            :queue-panel-state="queuePanelState"
            :queue-open="reviewOpen"
            :queued-commands="[{ id: 'cmd-1', title: '示例命令', rawPreview: 'echo preview', renderedPreview: 'echo preview', executionTemplate: { kind: 'exec', program: 'echo', args: ['preview'] }, execution: { kind: 'exec', program: 'echo', args: ['preview'] }, args: [], argValues: {} }]"
            :refreshing-all-queued-preflight="false"
            :refreshing-queued-command-ids="[]"
            :queue-hints="[{ keys: ['Esc'], action: '返回' }]"
            :focus-zone="'queue'"
            :queue-active-index="0"
            :flow-open="false"
            :executing="false"
            :execution-feedback-message="''"
            :execution-feedback-tone="'neutral'"
            :set-queue-panel-ref="() => {}"
            :set-queue-list-ref="() => {}"
            @toggle-queue="onToggleQueue"
          />
        </div>
      `
    });

    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    await wrapper.get(".flow-panel-overlay__scrim").trigger("click");
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
        reviewOpen: false
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
        reviewOpen: false
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
        reviewOpen: false
      })
    });

    const drawer = wrapper.get(".result-drawer");
    expect(drawer.attributes()).toHaveProperty("inert");
    expect(drawer.attributes("aria-hidden")).toBe("true");
  });
});
