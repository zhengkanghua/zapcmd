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

  it("toggles staging panel with Tab", async () => {
    const wrapper = await mountApp();
    const panel = wrapper.get(".staging-panel");
    expect(panel.classes()).toContain("staging-panel--closed");

    dispatchWindowKeydown("Tab");
    await waitForUi();
    expect(panel.classes()).toContain("staging-panel--opening");

    dispatchWindowKeydown("Tab");
    await waitForUi();
    expect(panel.classes()).toContain("staging-panel--closing");
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

  it("stages selected command with ArrowRight", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    expect(wrapper.get(".staging-chip__count").text()).toBe("1");
    expect(wrapper.findAll(".staging-card").length).toBe(1);
  });

  it("opens param overlay with ArrowRight when command requires args and stages after submit", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    const requiredInput = wrapper.get("#param-input-container");
    await requiredInput.setValue("my-container");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();

    expect(wrapper.find(".param-overlay").exists()).toBe(false);
    expect(wrapper.get(".staging-chip__count").text()).toBe("1");
    expect(wrapper.get(".staging-card code").text()).toContain("my-container");
  });

  it("opens param overlay with Enter when command requires args and executes after submit", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    const requiredInput = wrapper.get("#param-input-container");
    await requiredInput.setValue("exec-container");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();
    await waitForUi();

    expect(wrapper.find(".param-overlay").exists()).toBe(false);
    expect(wrapper.get(".staging-chip__count").text()).toBe("0");
  });

  it("keeps param overlay open when required arg is empty", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);
  });

  it("switches to staging by Ctrl+Tab and removes selected item with Delete", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    expect(wrapper.get(".staging-chip__count").text()).toBe("1");

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.findAll(".staging-card--active").length).toBe(1);

    dispatchWindowKeydown("Delete");
    await waitForUi();
    expect(wrapper.get(".staging-chip__count").text()).toBe("0");
  });

  it("does not remove staging item on Delete when typing in staging input", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    await wrapper.get("#param-input-container").setValue("typing-guard");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();
    expect(wrapper.get(".staging-chip__count").text()).toBe("1");

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();

    const stagingInput = wrapper.get(".staging-card__arg input").element as HTMLElement;
    stagingInput.focus();
    dispatchElementKeydown(stagingInput, "Delete");
    await waitForUi();

    expect(wrapper.get(".staging-chip__count").text()).toBe("1");
  });

  it("clears staging queue with Ctrl+Backspace", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    expect(wrapper.get(".staging-chip__count").text()).toBe("1");

    dispatchWindowKeydown("Backspace", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.get(".staging-chip__count").text()).toBe("0");
  });

  it("executes queue with Ctrl+Enter and keeps staged commands when execution is blocked", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    expect(wrapper.get(".staging-chip__count").text()).toBe("2");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();
    expect(wrapper.get(".staging-chip__count").text()).toBe("2");
  });

  it("reorders staging items with Alt+ArrowDown", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("ArrowRight");
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
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("ArrowRight");
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
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("ArrowRight");
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

  it("clears query before closing staging on Escape when both are active", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    expect(wrapper.findAll(".result-item").length).toBeGreaterThan(0);

    const panel = wrapper.get(".staging-panel");
    expect(panel.classes().join(" ")).toMatch(/staging-panel--(opening|open)/);

    dispatchWindowKeydown("Escape");
    await waitForUi();

    const input = wrapper.get("#zapcmd-search-input").element as HTMLInputElement;
    expect(input.value).toBe("");
    expect(panel.classes().join(" ")).toMatch(/staging-panel--(opening|open)/);

    dispatchWindowKeydown("Escape");
    await waitForUi();

    expect(panel.classes().join(" ")).toMatch(/staging-panel--(closing|closed)/);
  });

  it("closes param overlay on Escape", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(false);
  });

  it("closes param overlay when clicking overlay background", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    await wrapper.get(".param-overlay").trigger("click");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(false);
  });

  it("closes staging panel on Escape when query is empty", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    const panel = wrapper.get(".staging-panel");
    expect(panel.classes().join(" ")).toMatch(/staging-panel--(opening|open)/);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    expect(panel.classes().join(" ")).toMatch(/staging-panel--(closing|closed)/);
  });

  it("closes safety confirmation dialog on Escape", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    await wrapper.get("#param-input-port").setValue("443");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
  });

  it("closes safety confirmation dialog when clicking overlay background", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    await wrapper.get("#param-input-port").setValue("443");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);

    await wrapper.get(".safety-overlay").trigger("click");
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
  });

  it("keeps staged queue and arg value after canceling safety dialog with Escape", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    await wrapper.get("#param-input-port").setValue("443");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();
    expect(wrapper.get(".staging-chip__count").text()).toBe("1");
    expect(wrapper.get(".staging-card code").text()).toContain("443");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
    expect(wrapper.get(".staging-chip__count").text()).toBe("1");
    expect(wrapper.get(".staging-card code").text()).toContain("443");
    expect(
      (wrapper.get(".staging-card__arg input").element as HTMLInputElement).value,
    ).toBe("443");
  });

  it("keeps staged queue and arg value after canceling safety dialog by overlay click", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    await wrapper.get("#param-input-port").setValue("443");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();
    expect(wrapper.get(".staging-chip__count").text()).toBe("1");
    expect(wrapper.get(".staging-card code").text()).toContain("443");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);

    await wrapper.get(".safety-overlay").trigger("click");
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
    expect(wrapper.get(".staging-chip__count").text()).toBe("1");
    expect(wrapper.get(".staging-card code").text()).toContain("443");
    expect(
      (wrapper.get(".staging-card__arg input").element as HTMLInputElement).value,
    ).toBe("443");
  });
});
