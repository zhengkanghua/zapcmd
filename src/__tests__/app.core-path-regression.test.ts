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
import type { CommandExecutionRequest } from "../services/commandExecutor";

const hoisted = vi.hoisted(() => ({
  runMock: vi.fn<(request: CommandExecutionRequest) => Promise<void>>(),
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

interface ProbeInvokePayload {
  prerequisites?: Array<{ id: string; required: boolean }>;
}

async function waitForUi(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

async function waitForResultItems(
  wrapper: VueWrapper,
  minCount = 1,
  attempts = 20,
): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    await waitForUi();
    if (wrapper.findAll(".result-item").length >= minCount) {
      return;
    }
  }
  throw new Error("搜索结果未在预期时间内加载完成");
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

function dispatchSearchInputKeydown(
  wrapper: VueWrapper,
  key: string,
  init: KeyboardEventInit = {},
): void {
  const input = wrapper.get("#zapcmd-search-input").element as HTMLInputElement;
  input.dispatchEvent(
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

function expectFirstExecutionStepContains(
  request: CommandExecutionRequest | undefined,
  snippet: string,
): void {
  expect(request).toBeTruthy();
  if (!request) {
    throw new Error("terminal request should exist");
  }

  expect(request.steps).toHaveLength(1);
  const step = request.steps[0];
  expect(step?.summary).toContain(snippet);
  if (step?.execution.kind === "exec") {
    expect(step.execution.args.join(" ")).toContain(snippet);
    return;
  }
  expect(step?.execution.command).toContain(snippet);
}

function expectCondition(value: boolean, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function resolveProbeInvoke(command: string, payload?: unknown): unknown {
  if (command !== "probe_command_prerequisites") {
    return undefined;
  }

  const prerequisites = Array.isArray(
    (payload as ProbeInvokePayload | undefined)?.prerequisites,
  )
    ? (payload as ProbeInvokePayload).prerequisites!
    : [];

  return prerequisites.map((prerequisite) => ({
    id: prerequisite.id,
    ok: true,
    code: "ok",
    message: "",
    required: prerequisite.required === true,
  }));
}

beforeEach(() => {
  localStorage.clear();
  hoisted.runMock.mockReset();
  hoisted.invokeMock.mockReset();
  hoisted.invokeMock.mockImplementation(async (command: string, payload?: unknown) =>
    resolveProbeInvoke(command, payload),
  );
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
  it("覆盖成功链路：搜索 → 填参 → 入队 → 重挂载恢复后补参 → 执行队列 → 保留队列等待终端真实结果", async () => {
    hoisted.runMock.mockResolvedValue(undefined);

    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");
    await waitForResultItems(wrapper);

    await wrapper.get(".result-item").trigger("click");
    await waitForUi();
    expectCondition(
      wrapper.find(".launcher-action-panel").exists(),
      "点击搜索结果后应先进入动作面板",
    );

    const actionButtons = wrapper.findAll(".launcher-action-panel__action");
    expectCondition(
      actionButtons.length >= 2,
      "动作面板至少应提供执行和入队操作",
    );
    await actionButtons[1]!.trigger("click");
    await waitForUi();
    expectCondition(
      wrapper.find(".command-panel").exists(),
      "选择加入队列后应打开参数面板",
    );

    await wrapper.get(".command-panel__input").setValue("my-container");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    expectQueueCount(wrapper, 1);
    expectCondition(
      !wrapper.find(".flow-panel-overlay").exists(),
      "入队后未主动打开复核面板时不应显示 flow panel",
    );

    await openReviewByPill(wrapper);
    expect(wrapper.get(".flow-card__command").text()).toContain("my-container");

    await waitForUi();
    const persistedSession = localStorage.getItem(LAUNCHER_SESSION_STORAGE_KEY);
    expect(persistedSession).toBeTruthy();
    expect(persistedSession).not.toContain("my-container");

    wrapper.unmount();
    removeWrapper(wrapper);

    const restored = await mountApp();
    expectQueueCount(restored, 1);
    expectCondition(
      !restored.find(".flow-panel-overlay").exists(),
      "重挂载恢复后不应自动展开 flow panel",
    );

    await openReviewByPill(restored);
    const restoredCommandText = restored.get(".flow-card__command").text();
    expect(restoredCommandText).not.toContain("my-container");

    const restoredParamButtons = restored.findAll(".flow-card__param-value");
    expect(restoredParamButtons.length).toBeGreaterThanOrEqual(2);
    expect(restoredParamButtons[0]?.text()).not.toBe("my-container");
    await restoredParamButtons[0]?.trigger("click");
    await waitForUi();

    const restoredContainerInput = restored.get(".flow-card__param-input");
    await restoredContainerInput.setValue("my-container");
    await restoredContainerInput.trigger("keydown.enter");
    await waitForUi();

    const refreshedParamButtons = restored.findAll(".flow-card__param-value");
    expect(refreshedParamButtons.length).toBeGreaterThanOrEqual(2);
    const restoredTailButton = refreshedParamButtons[1]!;
    await restoredTailButton.trigger("click");
    await waitForUi();
    if (!restored.find(".flow-card__param-input").exists()) {
      await restoredTailButton.trigger("keydown.enter");
    }
    await waitForUi();
    expectCondition(
      restored.find(".flow-card__param-input").exists(),
      "编辑第二个参数后应进入输入态",
    );

    const restoredTailInput = restored.get(".flow-card__param-input");
    await restoredTailInput.setValue("100");
    await restoredTailInput.trigger("keydown.enter");
    await waitForUi();

    expect(restored.get(".flow-card__command").text()).toContain("my-container");
    expect(restored.get(".flow-card__command").text()).toContain("100");
    expect(restored.find(".flow-card__param-input").exists()).toBe(false);

    const executeButton = restored.get(".flow-panel__execute-btn");
    await executeButton.trigger("click");
    await waitForUi();
    await waitForUi();

    expectCondition(
      hoisted.runMock.mock.calls.length > 0,
      [
        "执行未触发",
        `feedback=${
          restored.find(".execution-feedback").exists()
            ? restored.find(".execution-feedback").text()
            : "<empty>"
        }`,
        `buttonDisabled=${String((executeButton.element as HTMLButtonElement).disabled)}`,
        `buttonAriaDisabled=${executeButton.attributes("aria-disabled") ?? "<unset>"}`,
        `queueCommand=${
          restored.find(".flow-card__command").exists()
            ? restored.find(".flow-card__command").text()
            : "<empty>"
        }`
      ].join(" | "),
    );
    const request = hoisted.runMock.mock.calls[0]?.[0];
    expectFirstExecutionStepContains(request, "my-container");

    expect(request?.terminalId).toBe(resolveExpectedTerminalId("powershell"));

    await waitForUi();
    expect(restored.get(".execution-feedback").text()).toContain("已发送到终端");
    expectQueueCount(restored, 1);
  });

  it("覆盖失败分支：终端执行失败 → 错误可见且队列不丢失", async () => {
    hoisted.runMock.mockRejectedValueOnce(new Error("terminal-unavailable"));

    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchSearchInputKeydown(wrapper, "Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    await wrapper.get(".command-panel__input").setValue("my-container");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    expectQueueCount(wrapper, 1);

    await openReviewByPill(wrapper);

    dispatchSearchInputKeydown(wrapper, "Enter", { ctrlKey: true });
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

    dispatchSearchInputKeydown(wrapper, "Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    await wrapper.get(".command-panel__input").setValue("my-container");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    await openReviewByPill(wrapper);
    dispatchSearchInputKeydown(wrapper, "Enter", { ctrlKey: true });
    await waitForUi();
    await waitForUi();

    const request = hoisted.runMock.mock.calls.at(-1)?.[0];
    expect(request?.terminalId).toBe(resolveExpectedTerminalId("wt"));
    expectFirstExecutionStepContains(request, "my-container");
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
