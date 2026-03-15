import { createPinia } from "pinia";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App.vue";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => false)
}));

vi.mock("@tauri-apps/api/window", () => ({
  LogicalSize: class LogicalSize {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
  },
  getCurrentWindow: vi.fn(() => {
    throw new Error("not running in tauri");
  })
}));

const wrappers: VueWrapper[] = [];
let warnSpy: ReturnType<typeof vi.spyOn> | null = null;
let errorSpy: ReturnType<typeof vi.spyOn> | null = null;

async function waitForUi(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

async function mountApp(): Promise<VueWrapper> {
  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()]
    }
  });
  wrappers.push(wrapper);
  await waitForUi();
  return wrapper;
}

function dispatchWindowKeydown(key: string, init: KeyboardEventInit = {}): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...init
    })
  );
}

function dispatchElementKeydown(
  element: HTMLElement,
  key: string,
  init: KeyboardEventInit = {}
): void {
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...init
    })
  );
}

async function focusSearchAndType(wrapper: VueWrapper, value: string): Promise<void> {
  const input = wrapper.get("#zapcmd-search-input");
  await input.setValue(value);
  (input.element as HTMLInputElement).focus();
  await waitForUi();
}

function readQueueCount(wrapper: VueWrapper): number {
  const pill = wrapper.find(".queue-summary-pill");
  if (!pill.exists()) {
    return 0;
  }
  const match = (pill.attributes("aria-label") ?? "").match(/(\d+)/);
  return match ? Number(match[1]) : Number.NaN;
}

function expectQueueCount(wrapper: VueWrapper, count: number): void {
  expect(readQueueCount(wrapper)).toBe(count);
}

async function openReviewByPill(wrapper: VueWrapper): Promise<void> {
  await wrapper.get(".queue-summary-pill").trigger("click");
  await waitForUi();
}

beforeEach(() => {
  localStorage.clear();
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  while (wrappers.length > 0) {
    wrappers.pop()?.unmount();
  }
  warnSpy?.mockRestore();
  warnSpy = null;
  errorSpy?.mockRestore();
  errorSpy = null;
});

describe("App UI hotkeys regression", () => {
  it("does not show fixed terminal output hint in launcher search area", async () => {
    const wrapper = await mountApp();
    expect(wrapper.find(".terminal-hint").exists()).toBe(false);
  });

  it("opens Review with Ctrl+Tab and reserves Tab for focus traversal in Review state", async () => {
    const wrapper = await mountApp();
    expect(wrapper.find(".flow-panel-overlay").exists()).toBe(false);

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.get(".flow-panel-overlay").classes().join(" ")).toMatch(/state-(opening|open)/);

    const panel = wrapper.get(".flow-panel").element as HTMLElement;
    dispatchElementKeydown(panel, "Tab");
    await waitForUi();
    expect(wrapper.get(".flow-panel-overlay").classes().join(" ")).toMatch(/state-(opening|open)/);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    const overlay = wrapper.find(".flow-panel-overlay");
    expect(
      !overlay.exists() || overlay.classes().join(" ").match(/state-(closing|closed)/)
    ).toBeTruthy();
  });

  it("navigates search results with ArrowDown/ArrowUp", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    let results = wrapper.findAll(".result-item");
    expect(results.length).toBeGreaterThan(1);
    expect(results[0].classes()).toContain("result-item--active");

    dispatchWindowKeydown("ArrowDown");
    await waitForUi();
    results = wrapper.findAll(".result-item");
    expect(results[1].classes()).toContain("result-item--active");

    dispatchWindowKeydown("ArrowUp");
    await waitForUi();
    results = wrapper.findAll(".result-item");
    expect(results[0].classes()).toContain("result-item--active");
  });

  it("stages selected command with CmdOrCtrl+Enter", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    expectQueueCount(wrapper, 1);
    expect(wrapper.find(".flow-panel-overlay").exists()).toBe(false);

    await focusSearchAndType(wrapper, "docker");
    await openReviewByPill(wrapper);
    expect(wrapper.get(".result-drawer").attributes("inert")).not.toBeUndefined();
    expect(wrapper.get(".result-drawer").attributes("aria-hidden")).toBe("true");
    expect(wrapper.findAll(".staging-card").length).toBe(1);
  });

  it("opens param overlay with CmdOrCtrl+Enter when command requires args and stages after submit", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);
    expect(wrapper.get("[data-testid='confirm-btn']").text()).toContain("加入执行流");

    const inputs = wrapper.findAll(".command-panel__form .command-panel__input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    await inputs[0].setValue("my-container");
    await inputs[1].setValue("50");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    expect(wrapper.find(".command-panel").exists()).toBe(false);
    expectQueueCount(wrapper, 1);
    expect(wrapper.find(".flow-panel-overlay").exists()).toBe(false);

    await openReviewByPill(wrapper);
    const command = wrapper.get(".flow-card__command");
    expect(command.text()).toContain("my-container");
  });

  it("opens param overlay with Enter when command requires args and executes after submit", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);
    expect(wrapper.get("[data-testid='confirm-btn']").text()).toContain("直接执行");

    const inputs = wrapper.findAll(".command-panel__form .command-panel__input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    await inputs[0].setValue("exec-container");
    await inputs[1].setValue("50");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();
    await waitForUi();

    expect(wrapper.find(".command-panel").exists()).toBe(false);
    expectQueueCount(wrapper, 0);
  });

  it("executes selected command with Enter when result item is focused", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    const firstResult = wrapper.get(".result-item").element as HTMLElement;
    firstResult.focus();
    await waitForUi();

    dispatchWindowKeydown("Enter");
    await waitForUi();

    expect(wrapper.find(".command-panel").exists()).toBe(true);
    expect(wrapper.get("[data-testid='confirm-btn']").text()).toContain("直接执行");
  });

  it("executes selected command with left click", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    await wrapper.get(".result-item").trigger("click");
    await waitForUi();

    expect(wrapper.find(".command-panel").exists()).toBe(true);
    expect(wrapper.get("[data-testid='confirm-btn']").text()).toContain("直接执行");
  });

  it("stages selected command with right click (contextmenu)", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    await wrapper.get(".result-item").trigger("contextmenu");
    await waitForUi();

    expect(wrapper.find(".command-panel").exists()).toBe(true);
    expect(wrapper.get("[data-testid='confirm-btn']").text()).toContain("加入执行流");
  });

  it("keeps param overlay open when required arg is empty", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);
  });

  it("switches to staging by Ctrl+Tab and removes selected item with Delete", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expectQueueCount(wrapper, 1);

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".flow-panel-overlay").exists()).toBe(true);
    expect(wrapper.findAll(".staging-card--active").length).toBe(1);

    dispatchWindowKeydown("Delete");
    await waitForUi();
    expectQueueCount(wrapper, 0);
  });

  it("does not remove staging item on Delete when typing in staging input", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    const inputs = wrapper.findAll(".command-panel__form .command-panel__input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    await inputs[0].setValue("typing-guard");
    await inputs[1].setValue("50");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();
    expectQueueCount(wrapper, 1);

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();

    // 新 FlowPanel 使用紧凑参数标签，点击 value 后进入编辑态
    const paramValue = wrapper.get(".flow-card__param-value");
    await paramValue.trigger("click");
    await waitForUi();

    const paramInput = wrapper.get(".flow-card__param-input");
    (paramInput.element as HTMLElement).focus();
    dispatchElementKeydown(paramInput.element as HTMLElement, "Delete");
    await waitForUi();

    expectQueueCount(wrapper, 1);
  });

  it("clears staging queue with Ctrl+Backspace", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expectQueueCount(wrapper, 1);

    dispatchWindowKeydown("Backspace", { ctrlKey: true });
    await waitForUi();
    expectQueueCount(wrapper, 0);
  });

  it("executes queue with Ctrl+Enter and keeps staged commands when execution is blocked", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expectQueueCount(wrapper, 2);

    await openReviewByPill(wrapper);
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();
    expectQueueCount(wrapper, 2);
  });

  it("reorders staging items with Alt+ArrowDown", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();

    const beforeTitles = wrapper.findAll(".staging-card h3").map((item) => item.text());
    expect(beforeTitles.length).toBe(2);

    dispatchWindowKeydown("ArrowDown", { altKey: true });
    await waitForUi();

    const afterTitles = wrapper.findAll(".staging-card h3").map((item) => item.text());
    expect(afterTitles).toEqual([beforeTitles[1], beforeTitles[0]]);
  });

  it("reorders staged items upward with Alt+ArrowUp", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();
    const beforeTitles = wrapper.findAll(".staging-card h3").map((item) => item.text());
    dispatchWindowKeydown("ArrowDown");
    await waitForUi();

    dispatchWindowKeydown("ArrowUp", { altKey: true });
    await waitForUi();

    const titles = wrapper.findAll(".staging-card h3").map((item) => item.text());
    expect(titles[0]).toBe(beforeTitles[1]);
  });

  it("navigates staged items with ArrowDown/ArrowUp after focus switch", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();
    const stagedTitles = wrapper.findAll(".staging-card h3").map((item) => item.text());
    let activeCards = wrapper.findAll(".staging-card--active");
    expect(activeCards.length).toBe(1);
    expect(activeCards[0].find("h3").text()).toBe(stagedTitles[0]);

    dispatchWindowKeydown("ArrowDown");
    await waitForUi();
    activeCards = wrapper.findAll(".staging-card--active");
    expect(activeCards.length).toBe(1);
    expect(activeCards[0].find("h3").text()).toBe(stagedTitles[1]);

    dispatchWindowKeydown("ArrowUp");
    await waitForUi();
    activeCards = wrapper.findAll(".staging-card--active");
    expect(activeCards.length).toBe(1);
    expect(activeCards[0].find("h3").text()).toBe(stagedTitles[0]);
  });

  it("clears query on Escape when search text exists", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    expect(wrapper.findAll(".result-item").length).toBeGreaterThan(0);

    dispatchWindowKeydown("Escape");
    await waitForUi();

    const input = wrapper.get("#zapcmd-search-input").element as HTMLInputElement;
    expect(input.value).toBe("");
    expect(wrapper.findAll(".result-item").length).toBe(0);
  });

  it("closes staging before clearing query on Escape when both are active", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    expect(wrapper.findAll(".result-item").length).toBeGreaterThan(0);

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();

    expect(wrapper.get(".flow-panel-overlay").classes().join(" ")).toMatch(/state-(opening|open)/);

    dispatchWindowKeydown("Escape");
    await waitForUi();

    const input = wrapper.get("#zapcmd-search-input").element as HTMLInputElement;
    expect(input.value).toBe("git");

    const overlay = wrapper.find(".flow-panel-overlay");
    expect(
      !overlay.exists() || overlay.classes().join(" ").match(/state-(closing|closed)/)
    ).toBeTruthy();
  });

  it("closes param overlay on Escape", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(false);
  });

  it("closes CommandPanel when clicking cancel button", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    await wrapper.get(".command-panel__btn--cancel").trigger("click");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(false);
  });

  it("closes staging panel on Escape when query is empty", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();

    expect(wrapper.get(".flow-panel-overlay").classes().join(" ")).toMatch(/state-(opening|open)/);

    dispatchWindowKeydown("Escape");
    await waitForUi();

    const overlay = wrapper.find(".flow-panel-overlay");
    expect(
      !overlay.exists() || overlay.classes().join(" ").match(/state-(closing|closed)/)
    ).toBeTruthy();
  });

  it("dangerous command uses inline danger confirmation (no separate safety dialog)", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);
    expect(wrapper.find("[data-testid='danger-banner']").exists()).toBe(true);
    expect(wrapper.get("[data-testid='confirm-btn']").text()).toContain("确定执行");
    expect(wrapper.get("[data-testid='confirm-btn']").classes()).toContain("command-panel__btn--danger");

    await wrapper.get(".command-panel__input").setValue("443");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
    expect(wrapper.find(".command-panel").exists()).toBe(false);
  });

  it("keeps staged queue and arg value after canceling safety dialog with Escape", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);
    await wrapper.get(".command-panel__input").setValue("443");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();
    expectQueueCount(wrapper, 1);
    await openReviewByPill(wrapper);
    expect(wrapper.get(".flow-card__command").text()).toContain("443");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
    expectQueueCount(wrapper, 1);
    expect(wrapper.get(".flow-card__command").text()).toContain("443");
    expect(wrapper.get(".flow-card__param-value").text()).toBe("443");
  });

  it("keeps staged queue and arg value after canceling safety dialog by clicking overlay background", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);
    await wrapper.get(".command-panel__input").setValue("443");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();
    expectQueueCount(wrapper, 1);
    await openReviewByPill(wrapper);
    expect(wrapper.get(".flow-card__command").text()).toContain("443");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);

    await wrapper.get(".safety-overlay").trigger("click");
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
    expectQueueCount(wrapper, 1);
    expect(wrapper.get(".flow-card__command").text()).toContain("443");
    expect(wrapper.get(".flow-card__param-value").text()).toBe("443");
  });
});
