import { mount } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import path from "node:path";
import { defineComponent, nextTick, ref } from "vue";
import { describe, expect, it } from "vitest";

import type { CommandTemplate } from "../../../../features/commands/types";
import {
  LAUNCHER_DRAWER_FLOOR_ROWS,
  LAUNCHER_DRAWER_ROW_HEIGHT_PX,
  LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX
} from "../../../../composables/launcher/useLauncherLayoutMetrics";
import type { KeyboardHint, LauncherSearchPanelProps } from "../../types";
import LauncherFlowPanel from "../LauncherFlowPanel.vue";
import LauncherSearchPanel from "../LauncherSearchPanel.vue";

const DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX =
  LAUNCHER_DRAWER_FLOOR_ROWS * LAUNCHER_DRAWER_ROW_HEIGHT_PX + LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX;
const launcherCss = readFileSync(path.resolve(process.cwd(), "src/styles/launcher.css"), "utf8");

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
    filteredResults: [],
    activeIndex: 0,
    stagedFeedbackCommandId: null,
    stagedCommandCount: 0,
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

  it("SearchPanel contract 不再允许保留 .result-drawer__filler 样式钩子", () => {
    expect(launcherCss).not.toMatch(/\.result-drawer__filler\s*\{/);
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
      components: { LauncherSearchPanel, LauncherFlowPanel },
      setup() {
        const reviewOpen = ref(true);
        const stagingDrawerState = ref<"open" | "closed">("open");
        const searchInput = ref<HTMLInputElement | null>(null);
        const drawerHeight = DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX;
        const setSearchInputRef = (el: unknown) => {
          searchInput.value = el instanceof HTMLInputElement ? el : null;
        };

        async function onToggleStaging(): Promise<void> {
          reviewOpen.value = false;
          stagingDrawerState.value = "closed";
          await nextTick();
          searchInput.value?.focus();
        }

        return { reviewOpen, stagingDrawerState, setSearchInputRef, onToggleStaging, drawerHeight };
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
            :staged-feedback-command-id="null"
            :staged-command-count="1"
            :flow-open="false"
            :review-open="reviewOpen"
            :set-search-input-ref="setSearchInputRef"
            :set-drawer-ref="() => {}"
            :set-result-button-ref="() => {}"
            @toggle-staging="onToggleStaging"
          />

          <LauncherFlowPanel
            v-if="reviewOpen"
            :staging-drawer-state="stagingDrawerState"
            :staging-expanded="reviewOpen"
            :staged-commands="[{ id: 'cmd-1', title: '示例命令', rawPreview: 'echo preview', renderedCommand: 'echo preview', args: [], argValues: {} }]"
            :staging-hints="[{ keys: ['Esc'], action: '返回' }]"
            :focus-zone="'staging'"
            :staging-active-index="0"
            :flow-open="false"
            :executing="false"
            :execution-feedback-message="''"
            :execution-feedback-tone="'neutral'"
            :set-staging-panel-ref="() => {}"
            :set-staging-list-ref="() => {}"
            @toggle-staging="onToggleStaging"
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
