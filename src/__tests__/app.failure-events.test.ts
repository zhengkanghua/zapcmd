import { createPinia } from "pinia";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { check as updaterCheck } from "@tauri-apps/plugin-updater";

import {
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  type PersistedSettingsSnapshot,
  useSettingsStore,
} from "../stores/settingsStore";
import { LAUNCHER_SESSION_STORAGE_KEY } from "../composables/launcher/useLauncherSessionState";
import App from "../App.vue";

const hoisted = vi.hoisted(() => ({
  runMock:
    vi.fn<
      (request: { terminalId: string; command: string }) => Promise<void>
    >(),
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

vi.mock("../services/commandExecutor", () => ({
  createCommandExecutor: () => ({
    run: hoisted.runMock,
  }),
}));

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
      language: "zh-CN",
      autoCheckUpdate: true,
      launchAtLogin: false,
    },
    appearance: {
      windowOpacity: 0.92,
    },
    commands: {
      disabledCommandIds: [],
      view: {
        query: "",
        sourceFilter: "all",
        statusFilter: "all",
        overrideFilter: "all",
        issueFilter: "all",
        fileFilter: "all",
        sortBy: "default",
        displayMode: "list",
      },
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

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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
  const match = pill.text().match(/(\d+)/);
  return match ? Number(match[1]) : Number.NaN;
}

function expectQueueCount(wrapper: VueWrapper, count: number): void {
  expect(readQueueCount(wrapper)).toBe(count);
}

async function openReviewByPill(wrapper: VueWrapper): Promise<void> {
  await wrapper.get(".queue-summary-pill").trigger("click");
  await waitForUi();
}

async function openGeneralSettings(wrapper: VueWrapper): Promise<void> {
  const generalNav = wrapper
    .findAll("button.settings-nav__item")
    .find((item) => item.text() === "通用");
  expect(generalNav).toBeTruthy();
  await generalNav!.trigger("click");
  await waitForUi();
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  hoisted.runMock.mockReset();
  hoisted.runMock.mockResolvedValue(undefined);
  hoisted.invokeMock.mockReset();
  hoisted.invokeMock.mockResolvedValue(undefined);
  hoisted.isTauriMock.mockReset();
  hoisted.isTauriMock.mockReturnValue(false);
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
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    expectQueueCount(wrapper, 2);

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

    const wrapper = await mountApp();
    await waitForUi();
    await wrapper.get("button.btn-primary").trigger("click");
    await waitForUi();

    expect(wrapper.get(".settings-error").text()).toContain(
      "mock launcher update failed",
    );
    expect(wrapper.get(".settings-error").classes()).toContain("execution-toast");
  });

  it("does not invoke open_settings_window when running in non-tauri settings window", async () => {
    hoisted.currentWindowLabel = "settings";
    hoisted.isTauriMock.mockReturnValue(false);
    hoisted.invokeMock.mockResolvedValue(undefined);

    await mountApp();
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

    const wrapper = await mountApp();
    const aboutNav = wrapper
      .findAll("button.settings-nav__item")
      .find((item) => item.text() === "关于");
    expect(aboutNav).toBeTruthy();
    await aboutNav!.trigger("click");
    await waitForUi();

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
  });

  it("reloads settings on storage event for tracked keys and ignores unrelated keys", async () => {
    hoisted.currentWindowLabel = "settings";
    const wrapper = await mountApp();
    const recorder = wrapper.findAll("button.hotkey-recorder")[0];
    expect(recorder.text()).toBe("Alt+V");

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(buildSnapshot("Ctrl+Shift+Y")),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated.key" }));
    await waitForUi();
    expect(recorder.text()).toBe("Alt+V");

    window.dispatchEvent(
      new StorageEvent("storage", { key: SETTINGS_STORAGE_KEY }),
    );
    await waitForUi();
    expect(recorder.text()).toBe("Ctrl+Shift+Y");
  });

  it("reloads settings on broadcast sync message and ignores unknown payload", async () => {
    hoisted.currentWindowLabel = "settings";
    const wrapper = await mountApp();
    const recorder = wrapper.findAll("button.hotkey-recorder")[0];
    expect(recorder.text()).toBe("Alt+V");

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(buildSnapshot("Alt+L")),
    );
    const channel = MockBroadcastChannel.instances[0];
    expect(channel).toBeTruthy();

    channel.emit({ type: "other-event" });
    await waitForUi();
    expect(recorder.text()).toBe("Alt+V");

    channel.emit({ type: "settings-updated" });
    await waitForUi();
    expect(recorder.text()).toBe("Alt+L");
  });

  it("applies synced default terminal to command execution after storage update", async () => {
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
        terminalId: "wt",
        command: expect.stringContaining("[zapcmd] executing:"),
      }),
    );
    const lastRequest = hoisted.runMock.mock.calls.at(-1)?.[0];
    expect(lastRequest?.command ?? "").toContain("&&");
  });

  it("supports drag reorder and resets drag state on dragend", async () => {
    const wrapper = await mountApp();

    await focusSearchAndType(wrapper, "docker");
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    await focusSearchAndType(wrapper, "git");
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

    expectQueueCount(wrapper, 2);
    expect(wrapper.find(".review-overlay").exists()).toBe(false);
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

    await rows[0].trigger("dragstart", { dataTransfer });
    await rows[1].trigger("dragover", {
      dataTransfer,
      preventDefault: vi.fn(),
    });
    await rows[1].trigger("dragend");
    await waitForUi();

    const afterTitles = wrapper
      .findAll(".staging-card h3")
      .map((item) => item.text());
    expect(afterTitles).toEqual([beforeTitles[1], beforeTitles[0]]);
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

  it("falls back to webview setSize when set_main_window_size invoke fails", async () => {
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
      if (command === "set_main_window_size") {
        throw new Error("resize command failed");
      }
      return undefined;
    });

    await mountApp();
    await waitForUi();

    expect(getInvokeCommandCallCount("set_main_window_size")).toBeGreaterThan(
      0,
    );
    expect(hoisted.setSizeSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
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
    const before = getInvokeCommandCallCount("set_main_window_size");
    expect(before).toBeGreaterThan(0);

    window.dispatchEvent(new Event("focus"));
    await waitForUi();
    await waitForUi();
    const after = getInvokeCommandCallCount("set_main_window_size");
    expect(after).toBe(before);
  });

  it("schedules debounced sync when resize event fires", async () => {
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
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");

    await mountApp();
    timeoutSpy.mockClear();

    window.dispatchEvent(new Event("resize"));
    expect(timeoutSpy).toHaveBeenCalled();
    const hasDebounceDelay = timeoutSpy.mock.calls.some(
      (call) => call[1] === 72,
    );
    expect(hasDebounceDelay).toBe(true);
  });

  it("shows empty-hotkey validation error when persisted state contains blank hotkey", async () => {
    hoisted.currentWindowLabel = "settings";
    const wrapper = await mountApp();
    const settingsStore = getSettingsStoreFromWrapper(wrapper);
    settingsStore.hotkeys.launcher = "";
    await waitForUi();

    await wrapper.get("button.btn-primary").trigger("click");
    await waitForUi();

    expect(wrapper.get(".settings-error").text()).toContain("不能为空");
    expect(wrapper.get(".settings-error").classes()).toContain("execution-toast");
  });

  it("shows terminal validation error when selected terminal is unavailable", async () => {
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
    const wrapper = await mountApp();
    const settingsStore = getSettingsStoreFromWrapper(wrapper);
    settingsStore.defaultTerminal = "unknown-terminal-id";
    await waitForUi();

    await wrapper.get("button.btn-primary").trigger("click");
    await waitForUi();

    expect(wrapper.get(".settings-error").text()).toContain("默认终端不可用");
    expect(wrapper.get(".settings-error").classes()).toContain("execution-toast");
    expect(wrapper.get(".settings-error__action").text()).toContain("通用");
    expect(wrapper.find('.settings-nav__item--error[data-route="general"]').exists()).toBe(true);

    await wrapper.get(".settings-error__action").trigger("click");
    await waitForUi();
    expect(wrapper.find('.settings-nav__item--active[data-route="general"]').exists()).toBe(true);
  });

  it("clears save success flag after timeout", async () => {
    hoisted.currentWindowLabel = "settings";
    const wrapper = await mountApp();

    await wrapper.findAll("button.btn-muted")[1].trigger("click");
    await waitForUi();
    expect(wrapper.find(".settings-ok").exists()).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 2300));
    await waitForUi();
    expect(wrapper.find(".settings-ok").exists()).toBe(false);
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

    const wrapper = await mountApp();
    await openGeneralSettings(wrapper);
    const selectButton = wrapper.get("#default-terminal-select");
    await selectButton.trigger("click");
    await waitForUi();

    expect(
      wrapper.findAll(".settings-select-list__item").length,
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

    const wrapper = await mountApp();
    await openGeneralSettings(wrapper);
    const selectButton = wrapper.get("#default-terminal-select");
    await selectButton.trigger("click");
    await waitForUi();

    expect(
      wrapper.findAll(".settings-select-list__item").length,
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

    const wrapper = await mountApp();
    await openGeneralSettings(wrapper);
    const setupState = getSetupState(wrapper);
    const selectButton = wrapper.get("#default-terminal-select");

    setupState.terminalLoading = true;
    await waitForUi();
    expect(wrapper.find(".settings-status--loading").exists()).toBe(true);
    await selectButton.trigger("click");
    await waitForUi();
    expect(wrapper.find(".settings-select-list").exists()).toBe(false);

    setupState.terminalLoading = false;
    setupState.availableTerminals = [];
    await waitForUi();
    await selectButton.trigger("click");
    await waitForUi();
    expect(wrapper.find(".settings-select-list").exists()).toBe(false);

    setupState.availableTerminals = [
      { id: "powershell", label: "PowerShell", path: "powershell.exe" },
    ];
    await waitForUi();
    expect((selectButton.element as HTMLButtonElement).disabled).toBe(false);

    await selectButton.trigger("click");
    await waitForUi();
    expect(wrapper.find(".settings-select-list").exists()).toBe(true);

    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true }),
    );
    await waitForUi();
    expect(wrapper.find(".settings-select-list").exists()).toBe(false);
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
    dispatchWindowKeydown("ArrowRight");
    await waitForUi();

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

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    await wrapper.get("#param-input-container").setValue("container-a");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();

    expectQueueCount(wrapper, 1);
    expect(wrapper.find(".review-overlay").exists()).toBe(false);
    await openReviewByPill(wrapper);

    expect(wrapper.get(".review-card__command").attributes("title")).toContain("container-a");
    await wrapper.get(".staging-card__arg input").setValue("container-b");
    await waitForUi();
    expect(wrapper.get(".review-card__command").attributes("title")).toContain("container-b");
  });

  it("restores staged queue from launcher session snapshot", async () => {
    localStorage.setItem(
      LAUNCHER_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        stagingExpanded: true,
        stagedCommands: [
          {
            id: "restored-1",
            title: "restored command",
            rawPreview: "echo restored",
            renderedCommand: "echo restored",
            args: [],
            argValues: {},
          },
        ],
      }),
    );

    const wrapper = await mountApp();
    await waitForUi();

    expectQueueCount(wrapper, 1);
    expect(wrapper.find(".review-overlay").exists()).toBe(false);

    await openReviewByPill(wrapper);
    expect(wrapper.findAll(".staging-card").length).toBe(1);
    expect(wrapper.get(".staging-card h3").text()).toBe("restored command");
  });

  it("requires confirmation before executing dangerous command", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    await wrapper.get("#param-input-port").setValue("443");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();

    expect(wrapper.find(".safety-overlay").exists()).toBe(true);
    expect(hoisted.runMock).not.toHaveBeenCalled();

    const confirmButton = wrapper.findAll(".safety-dialog footer button")[1];
    await confirmButton.trigger("click");
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalledTimes(1);
  });

  it("does not bypass queue safety dialog when Ctrl+Enter is pressed repeatedly", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "解除端口占用");

    dispatchWindowKeydown("ArrowRight");
    await waitForUi();
    await wrapper.get("#param-input-port").setValue("443");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();
    expectQueueCount(wrapper, 1);
    expect(hoisted.runMock).not.toHaveBeenCalled();

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);
    expect(hoisted.runMock).not.toHaveBeenCalled();

    dispatchWindowKeydown("Enter", { ctrlKey: true });
    await waitForUi();
    expect(wrapper.find(".safety-overlay").exists()).toBe(true);
    expect(hoisted.runMock).not.toHaveBeenCalled();

    const confirmButton = wrapper.findAll(".safety-dialog footer button")[1];
    await confirmButton.trigger("click");
    await waitForUi();
    await waitForUi();

    expect(hoisted.runMock).toHaveBeenCalledTimes(1);
  });

  it("shows blocked feedback in zh-CN and does not execute injected argument", async () => {
    const wrapper = await mountApp();
    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    await wrapper.get("#param-input-container").setValue("demo; whoami");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();

    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
    expect(hoisted.runMock).not.toHaveBeenCalled();
    expectFeedbackContract(wrapper, {
      tone: "error",
      reasonSnippet: "执行已拦截",
      guidanceSnippet: "包含潜在注入",
    });
  });

  it("shows blocked feedback in en-US and does not execute injected argument", async () => {
    const wrapper = await mountApp();
    const settingsStore = getSettingsStoreFromWrapper(wrapper);
    settingsStore.setLanguage("en-US");
    await waitForUi();
    await waitForUi();

    await focusSearchAndType(wrapper, "查看容器日志");

    dispatchWindowKeydown("Enter");
    await waitForUi();
    expect(wrapper.find(".param-overlay").exists()).toBe(true);

    await wrapper.get("#param-input-container").setValue("demo; whoami");
    await wrapper.get(".param-dialog").trigger("submit");
    await waitForUi();

    expect(wrapper.find(".safety-overlay").exists()).toBe(false);
    expect(hoisted.runMock).not.toHaveBeenCalled();
    expectFeedbackContract(wrapper, {
      tone: "error",
      reasonSnippet: "Execution blocked",
      guidanceSnippet: "contains potential injection",
    });
    expect(wrapper.get(".execution-feedback--error").text()).toContain(
      "Next step",
    );
  });
});
