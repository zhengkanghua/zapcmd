import { createPinia } from "pinia";
import { mount, type DOMWrapper, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { check as updaterCheck } from "@tauri-apps/plugin-updater";

import {
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  type PersistedSettingsSnapshot,
  useSettingsStore,
} from "../stores/settingsStore";
import { fallbackTerminalOptions } from "../features/terminals/fallbackTerminals";
import { LAUNCHER_SESSION_STORAGE_KEY } from "../composables/launcher/useLauncherSessionState";
import {
  SEARCH_CAPSULE_HEIGHT_PX,
  WINDOW_SIZING_CONSTANTS
} from "../composables/launcher/useLauncherLayoutMetrics";
import { measureFlowPanelMinHeight } from "../composables/launcher/useWindowSizing/panelMeasurement";
import { UI_TOP_ALIGN_OFFSET_PX_FALLBACK } from "../composables/launcher/useWindowSizing/model";
import App from "../App.vue";
import AppSettings from "../AppSettings.vue";
import type {
  CommandArg,
  CommandExecutionTemplate,
  ResolvedCommandExecution
} from "../features/commands/types";
import type { CommandExecutionRequest } from "../services/commandExecutor";

const LAUNCHER_SESSION_SCHEMA_VERSION = 2;

const hoisted = vi.hoisted(() => ({
  runMock: vi.fn<(request: CommandExecutionRequest) => Promise<void>>(),
  invokeMock: vi.fn<(command: string, payload?: unknown) => Promise<unknown>>(),
  isTauriMock: vi.fn<() => boolean>(() => false),
  currentWindowLabel: "main",
  closeSpy: vi.fn(),
  hideSpy: vi.fn(),
  setSizeSpy: vi.fn(),
  onFocusChangedSpy: vi.fn(async () => () => {}),
}));

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  readonly name: string;
  private listeners = new Set<(event: MessageEvent) => void>();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void {
    if (type === "message") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void {
    if (type === "message") {
      this.listeners.delete(listener);
    }
  }

  postMessage(): void {}

  close(): void {
    this.listeners.clear();
  }

  emit(data: unknown): void {
    const event = { data } as MessageEvent;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

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

interface AppSetupState {
  availableTerminals: Array<{ id: string; label: string; path: string }>;
  terminalLoading: boolean;
  submitParamInput: () => void;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

interface SnapshotOverrides {
  defaultTerminal?: string;
}

interface FeedbackContract {
  tone: "neutral" | "success" | "error";
  reasonSnippet: string;
  guidanceSnippet?: string;
}

interface ProbeInvokePayload {
  prerequisites?: Array<{ id: string; required: boolean }>;
}

function expectTerminalCommandContract(
  request: CommandExecutionRequest | undefined,
) {
  expect(request).toBeTruthy();
  if (!request) {
    throw new Error("terminal request should exist");
  }

  expect(request.steps.length).toBeGreaterThan(0);
  const firstStep = request.steps[0];
  expect(firstStep?.summary.trim().length).toBeGreaterThan(0);
  expect(firstStep?.execution.kind === "exec" || firstStep?.execution.kind === "script").toBe(true);

  if (firstStep?.execution.kind === "exec") {
    expect(firstStep.execution.program.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(firstStep.execution.args)).toBe(true);
    return;
  }

  expect(firstStep?.execution.command.trim().length).toBeGreaterThan(0);
}

function buildSnapshot(
  launcherHotkey: string,
  overrides: SnapshotOverrides = {},
): PersistedSettingsSnapshot {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    hotkeys: {
      launcher: launcherHotkey,
      toggleQueue: "Tab",
      switchFocus: "Ctrl+Tab",
      navigateUp: "ArrowUp",
      navigateDown: "ArrowDown",
      executeSelected: "Enter",
      stageSelected: "ArrowRight",
      escape: "Escape",
      executeQueue: "Ctrl+Enter",
      clearQueue: "Ctrl+Backspace",
      removeQueueItem: "Delete",
      reorderUp: "Alt+ArrowUp",
      reorderDown: "Alt+ArrowDown",
    },
    general: {
      defaultTerminal: overrides.defaultTerminal ?? "powershell",
      terminalReusePolicy: "never",
      language: "zh-CN",
      autoCheckUpdate: true,
      launchAtLogin: false,
      alwaysElevatedTerminal: false,
    },
    appearance: {
      windowOpacity: 0.96,
      theme: "obsidian",
      blurEnabled: true,
      motionPreset: "expressive",
    },
    commands: {
      disabledCommandIds: [],
    },
  };
}

async function waitForUi(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
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

async function mountSettingsApp(): Promise<VueWrapper> {
  const wrapper = mount(AppSettings, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()],
    },
  });
  wrappers.push(wrapper);
  await waitForUi();
  return wrapper;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createDomRect(partial: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
    ...partial,
  } as DOMRect;
}

function mockElementBoxHeight(
  element: HTMLElement,
  options: {
    height: number;
    scrollHeight?: number;
  },
): void {
  const { height, scrollHeight = height } = options;
  Object.defineProperty(element, "offsetHeight", {
    configurable: true,
    value: height,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: height,
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    createDomRect({ height, bottom: height }),
  );
}

function seedLauncherSessionSnapshot(
  stagedCommands: Array<{
    id: string;
    title: string;
    rawPreview: string;
    renderedPreview: string;
    executionTemplate: CommandExecutionTemplate;
    execution: ResolvedCommandExecution;
    args: CommandArg[];
    argValues: Record<string, string>;
  }>,
): void {
  localStorage.setItem(
    LAUNCHER_SESSION_STORAGE_KEY,
    JSON.stringify({
      version: LAUNCHER_SESSION_SCHEMA_VERSION,
      stagingExpanded: false,
      stagedCommands: stagedCommands.map((command) => ({
        id: command.id,
        title: command.title,
        rawPreview: command.rawPreview,
        renderedPreview: command.renderedPreview,
        executionTemplate: command.executionTemplate,
        execution: command.execution,
        args: command.args,
        argValues: command.argValues,
      })),
    }),
  );
}

function createExecSessionCommand(config: {
  id: string;
  title: string;
  rawPreview: string;
  renderedPreview: string;
  program: string;
  templateArgs: string[];
  resolvedArgs: string[];
  args: CommandArg[];
  argValues: Record<string, string>;
}) {
  return {
    id: config.id,
    title: config.title,
    rawPreview: config.rawPreview,
    renderedPreview: config.renderedPreview,
    executionTemplate: {
      kind: "exec" as const,
      program: config.program,
      args: config.templateArgs
    },
    execution: {
      kind: "exec" as const,
      program: config.program,
      args: config.resolvedArgs
    },
    args: config.args,
    argValues: config.argValues
  };
}

function getSetupState(wrapper: VueWrapper): AppSetupState {
  const vm = wrapper.vm as unknown as { $: { setupState: unknown } };
  return vm.$.setupState as AppSetupState;
}

function getSettingsStoreFromWrapper(wrapper: VueWrapper) {
  const vm = wrapper.vm as unknown as {
    $pinia: Parameters<typeof useSettingsStore>[0];
  };
  return useSettingsStore(vm.$pinia);
}

function getInvokeCommandCallCount(command: string): number {
  return hoisted.invokeMock.mock.calls.filter((call) => call[0] === command)
    .length;
}

function getInvokeCommandCalls(command: string): Array<[string, Record<string, unknown> | undefined]> {
  return hoisted.invokeMock.mock.calls.filter(
    (call): call is [string, Record<string, unknown> | undefined] => call[0] === command
  );
}

function expectFeedbackContract(
  wrapper: VueWrapper,
  contract: FeedbackContract,
): void {
  const feedback = wrapper.get(`.execution-feedback--${contract.tone}`);
  expect(feedback.classes()).toContain(`execution-feedback--${contract.tone}`);
  const text = feedback.text();
  expect(text).toContain(contract.reasonSnippet);
  if (contract.guidanceSnippet) {
    expect(text).toContain(contract.guidanceSnippet);
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

function dispatchWindowKeydown(
  key: string,
  init: KeyboardEventInit = {},
): void {
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

function findSettingsSegmentTab(wrapper: VueWrapper, label: string): DOMWrapper<Element> {
  const tab = wrapper
    .findAll("button.s-segment-nav__tab")
    .find((item) => item.text().includes(label));
  expect(tab).toBeTruthy();
  return tab!;
}

async function openSettingsRoute(wrapper: VueWrapper, label: string): Promise<void> {
  await findSettingsSegmentTab(wrapper, label).trigger("click");
  await waitForUi();
}

async function openGeneralSettings(wrapper: VueWrapper): Promise<void> {
  await openSettingsRoute(wrapper, "通用");
}

function findSettingsHotkeyRecorder(wrapper: VueWrapper, label: string): DOMWrapper<Element> {
  const field = wrapper
    .findAll(".s-hotkey-recorder-field")
    .find((item) => item.find(".s-hotkey-recorder-field__label").text() === label);
  expect(field).toBeTruthy();
  const recorder = field!.find("button.s-hotkey-recorder");
  expect(recorder.exists()).toBe(true);
  return recorder;
}

async function recordHotkey(
  recorder: DOMWrapper<Element>,
  init: KeyboardEventInit
): Promise<void> {
  await recorder.trigger("click");
  await waitForUi();
  await recorder.trigger("keydown", init);
  await waitForUi();
  await recorder.trigger("blur");
  await waitForUi();
}

function getDefaultTerminalSelectTrigger(wrapper: VueWrapper): DOMWrapper<Element> {
  const row = wrapper
    .findAll(".setting-item")
    .find((item) => item.find(".setting-item__label").text().includes("默认终端"));
  expect(row).toBeTruthy();
  const trigger = row!.find("button.s-dropdown__trigger");
  expect(trigger.exists()).toBe(true);
  return trigger;
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  hoisted.runMock.mockReset();
  hoisted.runMock.mockResolvedValue(undefined);
  hoisted.invokeMock.mockReset();
  hoisted.invokeMock.mockImplementation(async (command: string, payload?: unknown) =>
    resolveProbeInvoke(command, payload),
  );
  hoisted.isTauriMock.mockReset();
  hoisted.isTauriMock.mockReturnValue(true);
  hoisted.currentWindowLabel = "main";
  hoisted.closeSpy.mockReset();
  hoisted.hideSpy.mockReset();
  hoisted.setSizeSpy.mockReset();
  hoisted.onFocusChangedSpy.mockReset();
  hoisted.onFocusChangedSpy.mockResolvedValue(() => {});
  MockBroadcastChannel.instances = [];
  Object.defineProperty(window, "BroadcastChannel", {
    writable: true,
    value: MockBroadcastChannel,
  });
});

afterEach(() => {
  while (wrappers.length > 0) {
    wrappers.pop()?.unmount();
  }
  vi.restoreAllMocks();
});

describe("App failure and event regression", () => {
  it("mounts AppSettings without surfacing homepage configuration failure", async () => {
    const wrapper = await mountSettingsApp();

    expect(wrapper.findComponent({ name: "SettingsWindow" }).exists()).toBe(true);
    expect(wrapper.text()).not.toContain("homepage url is not configured");
  });

  it("shows no-result empty state with next-step hint", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "no-such-command-keyword");

    const emptyState = wrapper.get(".drawer-empty");
    expect(emptyState.text()).toContain("没有匹配到命令");
    expect(emptyState.text()).toContain("按 Esc 清空后重新搜索");
  });

  it("handles single command execution failure and resets executing state", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    hoisted.runMock.mockRejectedValueOnce(new Error("single-failed"));
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter");
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    expect(
      (wrapper.get("#zapcmd-search-input").element as HTMLInputElement).disabled,
    ).toBe(false);
    expectFeedbackContract(wrapper, {
      tone: "error",
      reasonSnippet: "single-failed",
      guidanceSnippet: "下一步",
    });
  });

  it("retains staged queue when batch execute fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    hoisted.runMock.mockRejectedValueOnce(new Error("queue-failed"));
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

    expect(errorSpy).toHaveBeenCalled();
    expect(hoisted.runMock).toHaveBeenCalledTimes(1);
    expectQueueCount(wrapper, 2);
    expectFeedbackContract(wrapper, {
      tone: "error",
      reasonSnippet: "queue-failed",
      guidanceSnippet: "下一步",
    });
  });

  it("shows save error when launcher hotkey update invoke fails", async () => {
    hoisted.currentWindowLabel = "settings";
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_launcher_hotkey") {
        return "Alt+V";
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      if (command === "update_launcher_hotkey") {
        throw new Error("mock launcher update failed");
      }
      return undefined;
    });

    const wrapper = await mountSettingsApp();
    const settingsStore = getSettingsStoreFromWrapper(wrapper);

    const launcherRecorder = findSettingsHotkeyRecorder(wrapper, "唤起窗口");
    expect(launcherRecorder.text()).toContain("Alt");

    await recordHotkey(launcherRecorder, { key: "k", ctrlKey: true });

    expect(getInvokeCommandCallCount("update_launcher_hotkey")).toBe(1);
    expect(settingsStore.hotkeys.launcher).toBe("Alt+V");
    expect(launcherRecorder.text()).toContain("Alt");

    const launcherField = wrapper
      .findAll(".s-hotkey-recorder-field")
      .find((item) => item.find(".s-hotkey-recorder-field__label").text() === "唤起窗口");
    expect(launcherField).toBeTruthy();
    expect(launcherRecorder.classes()).toContain("s-hotkey-recorder--conflict");
    expect(launcherField!.get(".s-hotkey-recorder-field__conflict-text").text()).toContain(
      "mock launcher update failed"
    );
  });

  it("does not invoke open_settings_window when running in non-tauri settings window", async () => {
    hoisted.currentWindowLabel = "settings";
    hoisted.isTauriMock.mockReturnValue(false);
    hoisted.invokeMock.mockResolvedValue(undefined);

    await mountSettingsApp();
    await waitForUi();

    expect(getInvokeCommandCallCount("open_settings_window")).toBe(0);
  });

  it("shows staged check-update failure guidance in About section", async () => {
    hoisted.currentWindowLabel = "settings";
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });
    vi.mocked(updaterCheck).mockRejectedValueOnce(new Error("update check failed"));

    const wrapper = await mountSettingsApp();
    await openSettingsRoute(wrapper, "关于");

    const checkButton = wrapper
      .findAll("button")
      .find((item) => item.text().includes("检查更新"));
    expect(checkButton).toBeTruthy();
    await checkButton!.trigger("click");
    await waitForUi();
    await waitForUi();

    const aboutError = wrapper.get(".about-status--error").text();
    expect(aboutError).toContain("检查更新失败");
    expect(aboutError).toContain("下一步");
    expect(aboutError).toContain("重试");
    expect(wrapper.get(".about-status--error .about-status__title").text()).toContain("检查更新失败");
  });

  it("reloads settings on storage event for tracked keys and ignores unrelated keys", async () => {
    hoisted.currentWindowLabel = "settings";
    const wrapper = await mountSettingsApp();
    const recorder = findSettingsHotkeyRecorder(wrapper, "唤起窗口");
    expect(recorder.text()).toContain("Alt");
    expect(recorder.text()).toContain("V");

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(buildSnapshot("Ctrl+Shift+Y")),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated.key" }));
    await waitForUi();
    expect(recorder.text()).toContain("Alt");

    window.dispatchEvent(
      new StorageEvent("storage", { key: SETTINGS_STORAGE_KEY }),
    );
    await waitForUi();
    expect(recorder.text()).toContain("Ctrl");
    expect(recorder.text()).toContain("Y");
  });

  it("reloads settings on broadcast sync message and ignores unknown payload", async () => {
    hoisted.currentWindowLabel = "settings";
    const wrapper = await mountSettingsApp();
    const recorder = findSettingsHotkeyRecorder(wrapper, "唤起窗口");
    expect(recorder.text()).toContain("Alt");
    expect(recorder.text()).toContain("V");

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(buildSnapshot("Alt+L")),
    );
    const channel = MockBroadcastChannel.instances[0];
    expect(channel).toBeTruthy();

    channel.emit({ type: "other-event" });
    await waitForUi();
    expect(recorder.text()).toContain("Alt");

    channel.emit({ type: "settings-updated" });
    await waitForUi();
    expect(recorder.text()).toContain("Alt");
    expect(recorder.text()).toContain("L");
  });

  it("applies synced default terminal to command execution after storage update", async () => {
    const expectedTerminalId = fallbackTerminalOptions()[0]?.id ?? "x-terminal-emulator";
    const wrapper = await mountApp();

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(buildSnapshot("Alt+V", { defaultTerminal: "wt" })),
    );
    window.dispatchEvent(
      new StorageEvent("storage", { key: SETTINGS_STORAGE_KEY }),
    );
    await waitForUi();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter");
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalledTimes(1);
    expect(hoisted.runMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        terminalId: expectedTerminalId,
      }),
    );
    const lastRequest = hoisted.runMock.mock.calls.at(-1)?.[0];
    expectTerminalCommandContract(lastRequest);
  });

  it("supports drag reorder and resets drag state on dragend", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    expectQueueCount(wrapper, 2);
    expect(wrapper.find(".flow-panel-overlay").exists()).toBe(false);
    await openReviewByPill(wrapper);

    const rows = wrapper.findAll(".staging-list > li");
    expect(rows.length).toBe(2);
    const beforeTitles = wrapper
      .findAll(".staging-card h3")
      .map((item) => item.text());

    await rows[1].trigger("dragover", {
      preventDefault: vi.fn(),
    });
    await waitForUi();
    expect(
      wrapper.findAll(".staging-card h3").map((item) => item.text()),
    ).toEqual(beforeTitles);

    const dataTransfer = {
      effectAllowed: "",
      setData: vi.fn(),
    };

    // 新 FlowPanel 中 draggable 在 article.staging-card 上，需先 mousedown 等待 150ms 门控
    const cards = wrapper.findAll(".staging-card");
    await cards[0].trigger("mousedown");
    // 等待 150ms 拖拽门控延迟
    await new Promise((resolve) => setTimeout(resolve, 200));
    await cards[0].trigger("dragstart", { dataTransfer });
    await rows[1].trigger("dragover", {
      dataTransfer,
      preventDefault: vi.fn(),
    });
    await cards[0].trigger("dragend");
    await waitForUi();

    const afterTitles = wrapper
      .findAll(".staging-card h3")
      .map((item) => item.text());
    expect(afterTitles).toEqual([beforeTitles[1], beforeTitles[0]]);
  });

  it("supports grip mousedown reorder fallback in FlowPanel", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    expectQueueCount(wrapper, 2);
    await openReviewByPill(wrapper);

    const beforeTitles = wrapper.findAll(".staging-card h3").map((item) => item.text());
    expect(beforeTitles.length).toBe(2);

    const grips = wrapper.findAll(".flow-card__grip");
    expect(grips.length).toBe(2);

    await grips[0].trigger("mousedown", { button: 0, buttons: 1 });
    expect(wrapper.findAll(".staging-card")[0].classes()).toContain("staging-card--dragging");

    const rows = wrapper.findAll(".staging-list > li");
    vi.spyOn(rows[1].element, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 200,
      left: 0,
      right: 200,
      width: 200,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => ({})
    } as DOMRect);

    if (typeof document.elementFromPoint !== "function") {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: vi.fn(),
      });
    }

    const elementFromPointSpy = vi
      .spyOn(document, "elementFromPoint")
      .mockReturnValue(rows[1]!.element as Element);

    // 上半区：不触发重排（避免边界抖动）
    window.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        buttons: 1,
        clientX: 80,
        clientY: 120,
      }),
    );
    await waitForUi();
    expect(wrapper.findAll(".staging-card h3").map((item) => item.text())).toEqual(beforeTitles);

    // 下半区：触发重排
    window.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        buttons: 1,
        clientX: 80,
        clientY: 180,
      }),
    );
    await waitForUi();
    expect(elementFromPointSpy).toHaveBeenCalledWith(80, 180);

    window.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    await waitForUi();

    const afterTitles = wrapper.findAll(".staging-card h3").map((item) => item.text());
    expect(afterTitles).toEqual([beforeTitles[1], beforeTitles[0]]);

    expect(wrapper.findAll(".staging-card").some((card) => card.classes().includes("staging-card--dragging"))).toBe(
      false,
    );
  });

  it("hides main window via invoke on Escape when running in tauri", async () => {
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      if (command === "hide_main_window") {
        return undefined;
      }
      return undefined;
    });
    await mountApp();

    dispatchWindowKeydown("Escape");
    await waitForUi();
    await waitForUi();

    expect(getInvokeCommandCallCount("hide_main_window")).toBe(1);
    expect(hoisted.hideSpy).not.toHaveBeenCalled();
  });

  it("falls back to appWindow.hide when hide_main_window invoke fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      if (command === "hide_main_window") {
        throw new Error("hide failed");
      }
      return undefined;
    });
    await mountApp();

    dispatchWindowKeydown("Escape");
    await waitForUi();
    await waitForUi();

    expect(getInvokeCommandCallCount("hide_main_window")).toBe(1);
    expect(hoisted.hideSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "hide_main_window invoke failed; falling back to webview api",
      expect.any(Error),
    );
  });

  it("falls back to webview setSize when animate_main_window_size invoke fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      if (command === "animate_main_window_size") {
        throw new Error("resize command failed");
      }
      return undefined;
    });

    await mountApp();
    await waitForUi();

    expect(getInvokeCommandCallCount("animate_main_window_size")).toBeGreaterThan(
      0,
    );
    expect(hoisted.setSizeSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("FlowPanel 关闭时会恢复到打开前的 Search 高度；若最小高度更高则补高", async () => {
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });

    const wrapper = await mountApp();
    await waitForUi();

    const searchShell = wrapper.get(".search-shell").element as HTMLElement;
    const searchWindowHeight =
      SEARCH_CAPSULE_HEIGHT_PX +
      UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
      16;
    const frameMaxHeight = Math.max(420, Math.floor(window.screen.availHeight * 0.82)) -
      (UI_TOP_ALIGN_OFFSET_PX_FALLBACK + 16);
    const flowPanelFrameMinHeight = Math.min(
      frameMaxHeight,
      WINDOW_SIZING_CONSTANTS.stagingChromeHeight +
        WINDOW_SIZING_CONSTANTS.stagingCardEstHeight * 2 +
        WINDOW_SIZING_CONSTANTS.stagingListGap,
    );
    const flowPanelMinHeight =
      flowPanelFrameMinHeight +
      UI_TOP_ALIGN_OFFSET_PX_FALLBACK +
      16;

    const baselineAnimateCount = getInvokeCommandCallCount("animate_main_window_size");

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();
    await new Promise((resolve) => setTimeout(resolve, 250));
    await waitForUi();

    const openCalls = getInvokeCommandCalls("animate_main_window_size").slice(
      baselineAnimateCount,
    );
    if (openCalls.length > 0) {
      expect(openCalls.at(-1)?.[1]).toMatchObject({ height: flowPanelMinHeight });
      expect(searchShell.style.getPropertyValue("--launcher-frame-height")).toBe(
        `${flowPanelFrameMinHeight}px`,
      );
    }
    expect(wrapper.get(".flow-panel-overlay").classes().join(" ")).toMatch(/state-open/);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    await new Promise((resolve) => setTimeout(resolve, 250));
    await waitForUi();

    const allCalls = getInvokeCommandCalls("animate_main_window_size");
    expect(allCalls.at(-1)?.[1]).toMatchObject({ height: searchWindowHeight });
  });

  it("FlowPanel 在 Command 上补高后，关闭时会恢复到打开前的 Command 高度", async () => {
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });

    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");
    dispatchWindowKeydown("Enter");
    await waitForUi();
    await waitForUi();

    const commandHeight = Number(
      getInvokeCommandCalls("animate_main_window_size").at(-1)?.[1]?.height,
    );
    expect(commandHeight).toBeGreaterThan(0);
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    dispatchWindowKeydown("Tab", { ctrlKey: true });
    await waitForUi();
    await new Promise((resolve) => setTimeout(resolve, 250));
    await waitForUi();

    const flowOpenHeight = Number(
      getInvokeCommandCalls("animate_main_window_size").at(-1)?.[1]?.height,
    );
    expect(flowOpenHeight).toBeGreaterThanOrEqual(commandHeight);
    expect(wrapper.get(".flow-panel-overlay").classes().join(" ")).toMatch(/state-open/);

    dispatchWindowKeydown("Escape");
    await waitForUi();
    await new Promise((resolve) => setTimeout(resolve, 250));
    await waitForUi();

    const restoredHeight = Number(
      getInvokeCommandCalls("animate_main_window_size").at(-1)?.[1]?.height,
    );
    expect(restoredHeight).toBe(commandHeight);
    expect(wrapper.find(".command-panel").exists()).toBe(true);
  });

  it("FlowPanel 打开后应按前两张真实异高卡片锁高，而不是回退静态卡片估高", async () => {
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });
    const originalAvailHeight = window.screen.availHeight;
    Object.defineProperty(window.screen, "availHeight", {
      configurable: true,
      value: 1200,
    });

    try {
      seedLauncherSessionSnapshot([
        createExecSessionCommand({
          id: "cmd-param-short",
          title: "查看容器日志",
          rawPreview: "docker logs {{container}} --tail {{tail}}",
          renderedPreview: "docker logs container-a --tail 20",
          program: "docker",
          templateArgs: ["logs", "{{container}}", "--tail", "{{tail}}"],
          resolvedArgs: ["logs", "container-a", "--tail", "20"],
          args: [
            { key: "container", label: "容器", token: "{{container}}", required: true, defaultValue: "container-a" },
            { key: "tail", label: "尾行数", token: "{{tail}}", required: true, defaultValue: "20" },
          ],
          argValues: {
            container: "container-a",
            tail: "20",
          },
        }),
        createExecSessionCommand({
          id: "cmd-param-tall",
          title: "批量同步日志并导出审计摘要",
          rawPreview: "sync-logs --target {{target}} --since {{since}} --format {{format}}",
          renderedPreview: "sync-logs --target prod-cluster --since 7d --format json",
          program: "sync-logs",
          templateArgs: ["--target", "{{target}}", "--since", "{{since}}", "--format", "{{format}}"],
          resolvedArgs: ["--target", "prod-cluster", "--since", "7d", "--format", "json"],
          args: [
            { key: "target", label: "目标集群", token: "{{target}}", required: true, defaultValue: "prod-cluster" },
            { key: "since", label: "时间范围", token: "{{since}}", required: true, defaultValue: "7d" },
            { key: "format", label: "导出格式", token: "{{format}}", required: true, defaultValue: "json" },
          ],
          argValues: {
            target: "prod-cluster",
            since: "7d",
            format: "json",
          },
        }),
      ]);

      const wrapper = await mountApp();
      await waitForUi();
      expectQueueCount(wrapper, 2);

      const baselineRevealCount = getInvokeCommandCallCount("resize_main_window_for_reveal");
      const preciseFlowFrameHeight = 52 + 24 + 168 + 220 + 8 + 60;
      const staticFallbackFrameHeight =
        WINDOW_SIZING_CONSTANTS.stagingChromeHeight +
        WINDOW_SIZING_CONSTANTS.stagingCardEstHeight * 2 +
        WINDOW_SIZING_CONSTANTS.stagingListGap;
      const frameMaxHeight =
        Math.max(420, Math.floor(window.screen.availHeight * 0.82)) -
        (UI_TOP_ALIGN_OFFSET_PX_FALLBACK + 16);
      const expectedFrameHeight = Math.min(frameMaxHeight, preciseFlowFrameHeight);

      await openReviewByPill(wrapper);

      const body = wrapper.get(".flow-panel__body").element as HTMLElement;
      body.style.paddingTop = "12px";
      body.style.paddingBottom = "12px";
      body.style.paddingLeft = "16px";
      body.style.paddingRight = "16px";

      const list = wrapper.get(".flow-panel__list").element as HTMLElement;
      list.style.display = "flex";
      list.style.flexDirection = "column";
      list.style.rowGap = "8px";

      mockElementBoxHeight(wrapper.get(".flow-panel__header").element as HTMLElement, {
        height: 52,
      });
      mockElementBoxHeight(wrapper.get(".flow-panel__footer").element as HTMLElement, {
        height: 60,
      });

      const cards = wrapper.findAll(".flow-panel__card");
      expect(cards).toHaveLength(2);
      mockElementBoxHeight(cards[0]!.element as HTMLElement, {
        height: 168,
        scrollHeight: 168,
      });
      mockElementBoxHeight(cards[1]!.element as HTMLElement, {
        height: 220,
        scrollHeight: 220,
      });

      expect(
        measureFlowPanelMinHeight(wrapper.get(".flow-panel").element as HTMLElement),
      ).toBe(532);

      await new Promise((resolve) => setTimeout(resolve, 250));
      await waitForUi();

      const openCalls = getInvokeCommandCalls("resize_main_window_for_reveal").slice(
        baselineRevealCount,
      );
      expect(openCalls.length).toBeGreaterThan(0);
      expect(openCalls.at(-1)?.[1]).toMatchObject({
        height: expectedFrameHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + 16,
      });
      expect(expectedFrameHeight).toBeGreaterThan(staticFallbackFrameHeight);
    } finally {
      Object.defineProperty(window.screen, "availHeight", {
        configurable: true,
        value: originalAvailHeight,
      });
    }
  });

  it("纯搜索胶囊打开 Flow 时不再先用静态 fallback 扩到接近 3 条再回缩", async () => {
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });

    seedLauncherSessionSnapshot([
      createExecSessionCommand({
        id: "cmd-flow-short",
        title: "查看容器日志",
        rawPreview: "docker logs {{container}} --tail 20",
        renderedPreview: "docker logs container-a --tail 20",
        program: "docker",
        templateArgs: ["logs", "{{container}}", "--tail", "20"],
        resolvedArgs: ["logs", "container-a", "--tail", "20"],
        args: [
          { key: "container", label: "容器", token: "{{container}}", required: true, defaultValue: "container-a" },
        ],
        argValues: {
          container: "container-a",
        },
      }),
      createExecSessionCommand({
        id: "cmd-flow-mid",
        title: "同步容器状态",
        rawPreview: "docker inspect {{container}} --format '{{json .State}}'",
        renderedPreview: "docker inspect container-a --format '{{json .State}}'",
        program: "docker",
        templateArgs: ["inspect", "{{container}}", "--format", "'{{json .State}}'"],
        resolvedArgs: ["inspect", "container-a", "--format", "{{json .State}}"],
        args: [
          { key: "container", label: "容器", token: "{{container}}", required: true, defaultValue: "container-a" },
        ],
        argValues: {
          container: "container-a",
        },
      }),
    ]);

    const wrapper = await mountApp();
    await waitForUi();
    expectQueueCount(wrapper, 2);

    const baselineRevealCount = getInvokeCommandCallCount("resize_main_window_for_reveal");
    const baselineAnimateCount = getInvokeCommandCallCount("animate_main_window_size");
    const expectedFrameHeight = 52 + 24 + 96 + 124 + 8 + 60;
    const expectedWindowHeight = expectedFrameHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK + 16;

    await openReviewByPill(wrapper);

    const body = wrapper.get(".flow-panel__body").element as HTMLElement;
    body.style.paddingTop = "12px";
    body.style.paddingBottom = "12px";
    body.style.paddingLeft = "16px";
    body.style.paddingRight = "16px";

    const list = wrapper.get(".flow-panel__list").element as HTMLElement;
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.rowGap = "8px";

    mockElementBoxHeight(wrapper.get(".flow-panel__header").element as HTMLElement, {
      height: 52,
    });
    mockElementBoxHeight(wrapper.get(".flow-panel__footer").element as HTMLElement, {
      height: 60,
    });

    const cards = wrapper.findAll(".flow-panel__card");
    expect(cards).toHaveLength(2);
    mockElementBoxHeight(cards[0]!.element as HTMLElement, {
      height: 96,
      scrollHeight: 96,
    });
    mockElementBoxHeight(cards[1]!.element as HTMLElement, {
      height: 124,
      scrollHeight: 124,
    });

    expect(
      measureFlowPanelMinHeight(wrapper.get(".flow-panel").element as HTMLElement),
    ).toBe(expectedFrameHeight);

    await waitForUi();
    await new Promise((resolve) => setTimeout(resolve, 250));
    await waitForUi();

    const revealCalls = getInvokeCommandCalls("resize_main_window_for_reveal").slice(
      baselineRevealCount,
    );
    expect(revealCalls).toHaveLength(1);
    expect(revealCalls[0]?.[1]).toMatchObject({ height: expectedWindowHeight });

    const animateCalls = getInvokeCommandCalls("animate_main_window_size").slice(
      baselineAnimateCount,
    );
    expect(
      animateCalls.some(([, payload]) => Number(payload?.height) > expectedWindowHeight),
    ).toBe(false);
  });

  it("skips duplicate window resize command when size has not changed", async () => {
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });

    await mountApp();
    await waitForUi();
    const animateBefore = getInvokeCommandCallCount("animate_main_window_size");
    const immediateBefore = getInvokeCommandCallCount("set_main_window_size");
    expect(animateBefore).toBeGreaterThan(0);

    window.dispatchEvent(new Event("focus"));
    await waitForUi();
    await waitForUi();
    const animateAfter = getInvokeCommandCallCount("animate_main_window_size");
    const immediateAfter = getInvokeCommandCallCount("set_main_window_size");
    expect(animateAfter).toBe(animateBefore);
    expect(immediateAfter).toBe(immediateBefore);
  });

  it("calls sync directly when resize event fires (no debounce)", async () => {
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });

    await mountApp();
    await waitForUi();
    const before = getInvokeCommandCallCount("animate_main_window_size");

    window.dispatchEvent(new Event("resize"));
    await waitForUi();
    await waitForUi();

    expect(
      getInvokeCommandCallCount("animate_main_window_size")
    ).toBeGreaterThanOrEqual(before);
  });

  it("uses fallback terminals when tauri terminal detection returns empty list", async () => {
    hoisted.currentWindowLabel = "settings";
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });

    const wrapper = await mountSettingsApp();
    await openGeneralSettings(wrapper);
    const selectButton = getDefaultTerminalSelectTrigger(wrapper);
    await selectButton.trigger("click");
    await waitForUi();

    expect(
      document.body.querySelectorAll("[role='option']").length,
    ).toBeGreaterThan(0);
  });

  it("uses fallback terminals when tauri terminal detection throws", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    hoisted.currentWindowLabel = "settings";
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        throw new Error("detect failed");
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });

    const wrapper = await mountSettingsApp();
    await openGeneralSettings(wrapper);
    const selectButton = getDefaultTerminalSelectTrigger(wrapper);
    await selectButton.trigger("click");
    await waitForUi();

    expect(
      document.body.querySelectorAll("[role='option']").length,
    ).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalledWith(
      "loadAvailableTerminals failed; using fallback",
      expect.any(Error),
    );
  });

  it("keeps terminal dropdown closed on loading/empty guards and closes on outside pointerdown", async () => {
    hoisted.currentWindowLabel = "settings";
    hoisted.isTauriMock.mockReturnValue(true);
    hoisted.invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_available_terminals") {
        return [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" },
        ];
      }
      if (command === "get_autostart_enabled") {
        return false;
      }
      return undefined;
    });

    const wrapper = await mountSettingsApp();
    await openGeneralSettings(wrapper);
    const setupState = getSetupState(wrapper);
    const selectButton = getDefaultTerminalSelectTrigger(wrapper);

    setupState.terminalLoading = true;
    await waitForUi();
    expect(wrapper.find(".settings-status--loading").exists()).toBe(true);
    await selectButton.trigger("click");
    await waitForUi();
    expect(document.body.querySelector("[role='listbox']")).toBeNull();

    setupState.terminalLoading = false;
    setupState.availableTerminals = [];
    await waitForUi();
    await getDefaultTerminalSelectTrigger(wrapper).trigger("click");
    await waitForUi();
    expect(document.body.querySelector("[role='listbox']")).toBeNull();

    setupState.availableTerminals = [
      { id: "powershell", label: "PowerShell", path: "powershell.exe" },
    ];
    await waitForUi();
    expect((getDefaultTerminalSelectTrigger(wrapper).element as HTMLButtonElement).disabled).toBe(false);

    await getDefaultTerminalSelectTrigger(wrapper).trigger("click");
    await waitForUi();
    expect(document.body.querySelector("[role='listbox']")).not.toBeNull();
    const optionTexts = Array.from(document.body.querySelectorAll("[role='option']")).map(
      (node) => node.textContent ?? "",
    );
    expect(optionTexts.some((text) => text.includes("PowerShell"))).toBe(true);
    expect(optionTexts.every((text) => !text.includes("powershell.exe"))).toBe(true);
    expect(wrapper.get("code.settings-card__mono").text()).toContain("powershell.exe");

    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true }),
    );
    await waitForUi();
    expect(document.body.querySelector("[role='listbox']")).toBeNull();
  });

  it("does not execute queue when queue is empty", async () => {
    await mountApp();

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    expect(hoisted.runMock).not.toHaveBeenCalled();
  });

  it("returns early when executeSingleCommand is invoked during executing state", async () => {
    const runDeferred = createDeferred<void>();
    hoisted.runMock.mockImplementationOnce(() => runDeferred.promise);
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter");
    dispatchWindowKeydown("Enter");
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalledTimes(1);
    runDeferred.resolve(undefined);
    await waitForUi();
  });

  it("returns early when executeStaged is triggered while already executing", async () => {
    const runDeferred = createDeferred<void>();
    hoisted.runMock.mockImplementationOnce(() => runDeferred.promise);
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    await openReviewByPill(wrapper);
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalledTimes(1);
    runDeferred.resolve(undefined);
    await waitForUi();
  });

  it("safely no-ops submitParamInput when there is no pending command", async () => {
    const wrapper = await mountApp();
    const setupState = getSetupState(wrapper);

    expect(() => setupState.submitParamInput()).not.toThrow();
    expectQueueCount(wrapper, 0);
  });

  it("updates staged command preview when staged arg input changes", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);
    const inputs = wrapper.findAll(".command-panel__form .command-panel__input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    await inputs[0].setValue("container-a");
    await inputs[1].setValue("50");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();

    expectQueueCount(wrapper, 1);
    expect(wrapper.find(".flow-panel-overlay").exists()).toBe(false);
    await openReviewByPill(wrapper);

    expect(wrapper.get(".flow-card__command").text()).toContain("container-a");

    // 新 FlowPanel 使用紧凑参数标签，点击 value 后进入编辑态
    const paramValue = wrapper.get(".flow-card__param-value");
    await paramValue.trigger("click");
    await waitForUi();
    await wrapper.get(".flow-card__param-input").setValue("container-b");
    // Enter 确认编辑
    await wrapper.get(".flow-card__param-input").trigger("keydown.enter");
    await waitForUi();
    expect(wrapper.get(".flow-card__command").text()).toContain("container-b");
  });

  it("restores staged queue from launcher session snapshot", async () => {
    localStorage.setItem(
      LAUNCHER_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: LAUNCHER_SESSION_SCHEMA_VERSION,
        stagingExpanded: true,
        stagedCommands: [
          {
            id: "restored-1",
            title: "restored command",
            rawPreview: "echo restored",
            renderedPreview: "echo restored",
            executionTemplate: {
              kind: "exec",
              program: "echo",
              args: ["restored"],
            },
            execution: {
              kind: "exec",
              program: "echo",
              args: ["restored"],
            },
            args: [],
            argValues: {},
          },
        ],
      }),
    );

    const wrapper = await mountApp();
    await waitForUi();

    expectQueueCount(wrapper, 1);
    expect(wrapper.find(".flow-panel-overlay").exists()).toBe(false);

    await openReviewByPill(wrapper);
    expect(wrapper.findAll(".staging-card").length).toBe(1);
    expect(wrapper.get(".staging-card h3").text()).toBe("restored command");
  });

  it("executes dangerous command via CommandPanel confirmation (no separate safety dialog)", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);
    expect(wrapper.find("[data-testid='danger-banner']").exists()).toBe(true);

    await wrapper.get(".command-panel__input").setValue("443");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalledTimes(1);
  });

  it("does not bypass queue safety dialog when Ctrl+Enter is pressed repeatedly", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);
    await wrapper.get(".command-panel__input").setValue("443");
    await wrapper.get("[data-testid='confirm-btn']").trigger("click");
    await waitForUi();
    expectQueueCount(wrapper, 1);
    expect(hoisted.runMock).not.toHaveBeenCalled();

    await openReviewByPill(wrapper);
    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);
    expect(hoisted.runMock).not.toHaveBeenCalled();

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);
    expect(hoisted.runMock).not.toHaveBeenCalled();

    const footerButtons = wrapper.findAll(".safety-dialog footer button");
    expect(footerButtons).toHaveLength(2);
    await footerButtons[1]!.trigger("click");
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalledTimes(1);
  });

  it("shows inline validation in zh-CN and does not execute injected argument", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    const inputs = wrapper.findAll(".command-panel__form .command-panel__input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    await inputs[0].setValue("demo; whoami");
    await inputs[1].setValue("50");
    await waitForUi();

    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
    expect(hoisted.runMock).not.toHaveBeenCalled();
    expect(wrapper.get("[data-testid='confirm-btn']").attributes("disabled")).toBeDefined();
    expect(inputs[0]?.attributes("aria-invalid")).toBe("true");
    expect(wrapper.get(".command-panel__field-error").text()).toContain("包含潜在注入");
  });

  it("shows inline validation in en-US and does not execute injected argument", async () => {
    const wrapper = await mountApp();
    const settingsStore = getSettingsStoreFromWrapper(wrapper);
    settingsStore.setLanguage("en-US");
    await waitForUi();
    await waitForUi();

    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".command-panel").exists()).toBe(true);

    const inputs = wrapper.findAll(".command-panel__form .command-panel__input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    await inputs[0].setValue("demo; whoami");
    await inputs[1].setValue("50");
    await waitForUi();

    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
    expect(hoisted.runMock).not.toHaveBeenCalled();
    expect(wrapper.get("[data-testid='confirm-btn']").attributes("disabled")).toBeDefined();
    expect(inputs[0]?.attributes("aria-invalid")).toBe("true");
    expect(wrapper.get(".command-panel__field-error").text()).toContain(
      "contains potential injection"
    );
  });
});
