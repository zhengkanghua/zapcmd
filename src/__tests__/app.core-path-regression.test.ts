import { createPinia } from "pinia";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LAUNCHER_SESSION_STORAGE_KEY } from "../composables/launcher/useLauncherSessionState";
import App from "../App.vue";

const hoisted = vi.hoisted(() => ({
  runMock:
    vi.fn<
      (request: { terminalId: string; command: string }) => Promise<void>
    >(),
  currentWindowLabel: "main",
  closeSpy: vi.fn(),
  hideSpy: vi.fn(),
  setSizeSpy: vi.fn(),
  onFocusChangedSpy: vi.fn(async () => () => {}),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => false),
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
  getCurrentWindow: vi.fn(() => ({
    label: hoisted.currentWindowLabel,
    close: hoisted.closeSpy,
    hide: hoisted.hideSpy,
    setSize: hoisted.setSizeSpy,
    onFocusChanged: hoisted.onFocusChangedSpy,
  })),
}));

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: vi.fn(async () => null),
}));

vi.mock("../services/commandExecutor", () => ({
  createCommandExecutor: () => ({
    run: hoisted.runMock,
  }),
}));

const wrappers: VueWrapper[] = [];
let warnSpy: ReturnType<typeof vi.spyOn> | null = null;
let errorSpy: ReturnType<typeof vi.spyOn> | null = null;

async function waitForUi(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function removeWrapper(wrapper: VueWrapper): void {
  const index = wrappers.indexOf(wrapper);
  if (index >= 0) {
    wrappers.splice(index, 1);
  }
}

async function mountApp(): Promise<VueWrapper> {
  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()],
    },
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
      ...init,
    }),
  );
}

async function focusSearchAndType(
  wrapper: VueWrapper,
  value: string,
): Promise<void> {
  const input = wrapper.get("#zapcmd-search-input");
  await input.setValue(value);
  (input.element as HTMLInputElement).focus();
  await waitForUi();
}

beforeEach(() => {
  localStorage.clear();
  hoisted.runMock.mockReset();
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

describe("App 核心路径回归（Phase 3）", () => {
  it("覆盖成功链路：搜索 → 填参 → 入队 → 重挂载恢复 → Ctrl+Enter 执行 → 队列清空", async () => {
    hoisted.runMock.mockResolvedValue(undefined);

    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    await wrapper.get("#param-input-container").setValue("my-container");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();

    expect(wrapper.get(".staging-chip__count").text()).toBe("1");
    expect(wrapper.get(".staging-card code").text()).toContain("my-container");

    await waitForUi();
    expect(localStorage.getItem(LAUNCHER_SESSION_STORAGE_KEY)).toBeTruthy();

    wrapper.unmount();
    removeWrapper(wrapper);

    const restored = await mountApp();
    expect(restored.get(".staging-chip__count").text()).toBe("1");
    expect(restored.get(".staging-card code").text()).toContain("my-container");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalled();
    const request = hoisted.runMock.mock.calls[0]?.[0];
    expect(request?.command ?? "").toContain("my-container");

    const terminalId = request?.terminalId ?? "";
    if (process.platform === "win32") {
      expect(terminalId).toBe("powershell");
    } else {
      expect(terminalId).toBeTruthy();
    }

    await waitForUi();
    expect(restored.get(".staging-chip__count").text()).toBe("0");
  });

  it("覆盖失败分支：终端执行失败 → 错误可见且队列不丢失", async () => {
    hoisted.runMock.mockRejectedValueOnce(new Error("terminal-unavailable"));

    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    await wrapper.get("#param-input-container").setValue("my-container");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();

    expect(wrapper.get(".staging-chip__count").text()).toBe("1");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalled();
    expect(wrapper.get(".execution-feedback--error").text()).toContain(
      "terminal-unavailable",
    );
    expect(wrapper.get(".staging-chip__count").text()).toBe("1");
  });
});
