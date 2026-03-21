import { createPinia } from "pinia";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LAUNCHER_SESSION_STORAGE_KEY } from "../composables/launcher/useLauncherSessionState";
import { fallbackTerminalOptions } from "../features/terminals/fallbackTerminals";
import { resolveEffectiveTerminal } from "../features/terminals/resolveEffectiveTerminal";
import {
  SETTINGS_STORAGE_KEY,
  createDefaultSettingsSnapshot,
} from "../stores/settingsStore";
import App from "../App.vue";

const hoisted = vi.hoisted(() => ({
  runMock:
    vi.fn<
      (request: {
        terminalId: string;
        command: string;
        requiresElevation?: boolean;
        alwaysElevated?: boolean;
      }) => Promise<void>
    >(),
  invokeMock: vi.fn<(command: string, payload?: unknown) => Promise<unknown>>(),
  isTauriMock: vi.fn<() => boolean>(() => true),
  currentWindowLabel: "main",
  closeSpy: vi.fn(),
  hideSpy: vi.fn(),
  setSizeSpy: vi.fn(),
  onFocusChangedSpy: vi.fn(async () => () => {}),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: hoisted.invokeMock,
  isTauri: hoisted.isTauriMock,
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

vi.mock("../services/commandExecutor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/commandExecutor")>();
  return {
    ...actual,
    createCommandExecutor: () => ({
      run: hoisted.runMock,
    }),
  };
});

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

function buildSettingsSnapshot(defaultTerminal: string, alwaysElevatedTerminal = false) {
  const snapshot = createDefaultSettingsSnapshot();
  return {
    ...snapshot,
    general: {
      ...snapshot.general,
      defaultTerminal,
      alwaysElevatedTerminal
    },
  };
}

function resolveExpectedTerminalId(requestedId: string): string {
  return resolveEffectiveTerminal(
    requestedId,
    [],
    fallbackTerminalOptions(navigator.platform),
  ).effectiveId;
}

beforeEach(() => {
  localStorage.clear();
  hoisted.runMock.mockReset();
  hoisted.invokeMock.mockReset();
  hoisted.invokeMock.mockResolvedValue(undefined);
  hoisted.isTauriMock.mockReset();
  hoisted.isTauriMock.mockReturnValue(true);
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

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    await wrapper.get(".command-panel__input").setValue("my-container");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    expectQueueCount(wrapper, 1);
    expect(wrapper.find(".flow-panel-overlay").exists()).toBe(false);

    await openReviewByPill(wrapper);
    expect(wrapper.get(".flow-card__command").text()).toContain("my-container");

    await waitForUi();
    expect(localStorage.getItem(LAUNCHER_SESSION_STORAGE_KEY)).toBeTruthy();

    wrapper.unmount();
    removeWrapper(wrapper);

    const restored = await mountApp();
    expectQueueCount(restored, 1);
    expect(restored.find(".flow-panel-overlay").exists()).toBe(false);

    await openReviewByPill(restored);
    expect(restored.get(".flow-card__command").text()).toContain("my-container");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalled();
    const request = hoisted.runMock.mock.calls[0]?.[0];
    expect(request?.command ?? "").toContain("my-container");

    expect(request?.terminalId).toBe(resolveExpectedTerminalId("powershell"));

    await waitForUi();
    expectQueueCount(restored, 0);
  });

  it("覆盖失败分支：终端执行失败 → 错误可见且队列不丢失", async () => {
    hoisted.runMock.mockRejectedValueOnce(new Error("terminal-unavailable"));

    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    await wrapper.get(".command-panel__input").setValue("my-container");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    expectQueueCount(wrapper, 1);

    await openReviewByPill(wrapper);

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalled();
    expect(wrapper.get(".execution-feedback--error").text()).toContain(
      "terminal-unavailable",
    );
    expectQueueCount(wrapper, 1);
  });

  it("覆盖恢复链路：Settings 中的默认终端会沿执行链透传到执行器", async () => {
    hoisted.runMock.mockResolvedValue(undefined);
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(buildSettingsSnapshot("wt")),
    );

    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    await wrapper.get(".command-panel__input").setValue("my-container");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    await openReviewByPill(wrapper);
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();

    const request = hoisted.runMock.mock.calls.at(-1)?.[0];
    expect(request?.terminalId).toBe(resolveExpectedTerminalId("wt"));
    expect(request?.command ?? "").toContain("my-container");
  });

  it("覆盖恢复链路：Settings 恢复的 alwaysElevatedTerminal 会传到执行器", async () => {
    hoisted.runMock.mockResolvedValue(undefined);
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(buildSettingsSnapshot("wt", true)),
    );

    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    await wrapper.get(".command-panel__input").setValue("my-container");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    await openReviewByPill(wrapper);
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();

    const request = hoisted.runMock.mock.calls.at(-1)?.[0];
    expect(request?.alwaysElevated).toBe(true);
  });

  it("覆盖恢复链路：失效默认终端会在执行前回退到可用终端", async () => {
    hoisted.runMock.mockResolvedValue(undefined);
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(buildSettingsSnapshot("ghost")),
    );

    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    await wrapper.get(".command-panel__input").setValue("my-container");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    await openReviewByPill(wrapper);
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();

    const request = hoisted.runMock.mock.calls.at(-1)?.[0];
    expect(request?.terminalId).toBe(fallbackTerminalOptions(navigator.platform)[0]?.id);
  });
});
