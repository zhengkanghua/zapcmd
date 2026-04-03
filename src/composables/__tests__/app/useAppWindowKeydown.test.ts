import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useAppWindowKeydown } from "../../app/useAppWindowKeydown";
import { createAppCompositionRootPorts } from "../../app/useAppCompositionRoot/ports";

function createHarness() {
  const isSettingsWindow = ref(false);
  const closeSettingsWindow = vi.fn();
  const handleMainEscape = vi.fn();
  const searchInput = document.createElement("input");
  const searchInputRef = ref<HTMLInputElement | null>(searchInput);
  const drawerRef = ref<HTMLElement | null>(null);
  document.body.appendChild(searchInput);
  searchInput.focus();
  const isTypingElement = vi.fn((target: EventTarget | null) => target === searchInput);

  const settingsWindow = {};

  const queue = {
    focusZone: ref<"search" | "queue">("search"),
    queueOpen: ref(false),
    openQueuePanel: vi.fn(),
    switchFocusZone: vi.fn(),
    toggleQueue: vi.fn(),
    moveQueuedCommand: vi.fn(),
    queueActiveIndex: ref(0)
  };
  const commandPageOpen = ref(false);

  const commandExecution = {
    executeQueue: vi.fn(async () => {}),
    clearQueue: vi.fn(),
    executeResult: vi.fn(),
    enqueueResult: vi.fn(),
    openActionPanel: vi.fn(),
    copySelected: vi.fn(),
    removeQueuedCommand: vi.fn(),
    pendingCommand: ref<unknown>(null),
    safetyDialog: ref<unknown>(null),
    confirmSafetyExecution: vi.fn(async () => {}),
    cancelSafetyExecution: vi.fn()
  };

  const hotkeyBindings = {
    normalizedSwitchFocusHotkey: ref("Ctrl+Tab"),
    normalizedToggleQueueHotkey: ref("Tab"),
    normalizedExecuteQueueHotkey: ref("Ctrl+Enter"),
    normalizedClearQueueHotkey: ref("Ctrl+Backspace"),
    normalizedNavigateDownHotkey: ref("ArrowDown"),
    normalizedNavigateUpHotkey: ref("ArrowUp"),
    normalizedExecuteSelectedHotkey: ref("Enter"),
    normalizedEnqueueSelectedHotkey: ref("ArrowRight"),
    normalizedOpenActionPanelHotkey: ref("Shift+Enter"),
    normalizedCopySelectedHotkey: ref("Ctrl+Shift+C"),
    normalizedReorderUpHotkey: ref("Alt+ArrowUp"),
    normalizedReorderDownHotkey: ref("Alt+ArrowDown"),
    normalizedRemoveQueueItemHotkey: ref("Delete"),
    normalizedEscapeHotkey: ref("Escape")
  };

  const handler = useAppWindowKeydown({
    isSettingsWindow,
    settingsWindow,
    closeSettingsWindow,
    queue,
    commandExecution,
    commandPageOpen,
    searchInputRef,
    drawerRef,
    drawerOpen: ref(true),
    filteredResults: ref([{ id: "result-1" }, { id: "result-2" }]),
    activeIndex: ref(0),
    ensureActiveResultVisible: vi.fn(),
    queuedCommands: ref([{ id: "queue-1" }]),
    ensureActiveQueueVisible: vi.fn(),
    handleMainEscape,
    hotkeyBindings,
    isTypingElement
  });

  return {
    handler,
    isSettingsWindow,
    settingsWindow,
    queue,
    commandExecution,
    commandPageOpen,
    closeSettingsWindow,
    handleMainEscape,
    isTypingElement
  };
}

describe("useAppWindowKeydown", () => {
  it("does not require legacy terminal dropdown state on settings harness", () => {
    const harness = createHarness();

    expect("terminalDropdownOpen" in harness.settingsWindow).toBe(false);
    expect("terminalFocusIndex" in harness.settingsWindow).toBe(false);
    expect("selectTerminalOption" in harness.settingsWindow).toBe(false);
    expect("closeTerminalDropdown" in harness.settingsWindow).toBe(false);
    expect("recordingHotkeyField" in harness.settingsWindow).toBe(false);
    expect("applyRecordedHotkey" in harness.settingsWindow).toBe(false);
    expect("cancelHotkeyRecording" in harness.settingsWindow).toBe(false);
  });

  it("routes Escape to settings close without hotkey recording branch", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = true;

    harness.handler(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(harness.closeSettingsWindow).toHaveBeenCalledTimes(1);
  });

  it("routes Ctrl+Tab to queue focus switch in main window", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = false;

    harness.handler(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true }));

    expect(harness.queue.openQueuePanel).toHaveBeenCalledTimes(1);
    expect(harness.queue.switchFocusZone).toHaveBeenCalledTimes(1);
  });

  it("commandPage 打开时不触发搜索区 Enter 执行；Escape 仍走 main escape", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = false;
    harness.commandPageOpen.value = true;

    harness.handler(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
    expect(harness.commandExecution.executeResult).not.toHaveBeenCalled();

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    harness.handler(escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(harness.handleMainEscape).toHaveBeenCalledTimes(1);
  });

  it("routes Escape to main escape handler", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = false;
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });

    harness.handler(event);

    expect(event.defaultPrevented).toBe(true);
    expect(harness.handleMainEscape).toHaveBeenCalledTimes(1);
  });

  it("keeps launcher search input on the global Escape path", () => {
    const harness = createHarness();
    const searchInput = document.activeElement as HTMLInputElement;
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    Object.defineProperty(event, "target", {
      configurable: true,
      value: searchInput
    });
    harness.isTypingElement.mockImplementation((target: EventTarget | null) => target instanceof HTMLInputElement);

    harness.handler(event);

    expect(event.defaultPrevented).toBe(true);
    expect(harness.handleMainEscape).toHaveBeenCalledTimes(1);
  });

  it("does not route Escape to main escape when the target is a non-search typing field", () => {
    const harness = createHarness();
    const inlineInput = document.createElement("input");
    document.body.appendChild(inlineInput);
    harness.isTypingElement.mockImplementation((target: EventTarget | null) => target instanceof HTMLInputElement);
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    Object.defineProperty(event, "target", {
      configurable: true,
      value: inlineInput
    });

    harness.handler(event);

    expect(event.defaultPrevented).toBe(false);
    expect(harness.handleMainEscape).not.toHaveBeenCalled();
  });

  it("safety dialog 打开时不全局捕获 Enter；Escape 仍走 main escape 优先级", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = false;
    harness.commandExecution.safetyDialog.value = { title: "risk" };

    harness.handler(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
    expect(harness.commandExecution.confirmSafetyExecution).not.toHaveBeenCalled();

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    harness.handler(escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(harness.handleMainEscape).toHaveBeenCalledTimes(1);
    expect(harness.commandExecution.cancelSafetyExecution).not.toHaveBeenCalled();
  });

  it("commandPage 打开时屏蔽搜索区 Shift+Enter，避免热键串入动作面板", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = false;
    harness.commandPageOpen.value = true;

    harness.handler(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));

    expect(harness.commandExecution.openActionPanel).not.toHaveBeenCalled();
  });
});

describe("useAppCompositionRoot ports", () => {
  it("supports overriding external window side-effect entry", async () => {
    const openExternalUrl = vi.fn(async () => {});
    const ports = createAppCompositionRootPorts({
      openExternalUrl
    });

    await ports.openExternalUrl("https://example.com");

    expect(openExternalUrl).toHaveBeenCalledWith("https://example.com");
  });

  it("supports overriding startup update checker and storage port", async () => {
    const checkStartupUpdate = vi.fn(async () => ({
      checked: false,
      available: false
    }));
    const getLocalStorage = vi.fn(() => null);
    const ports = createAppCompositionRootPorts({
      checkStartupUpdate,
      getLocalStorage
    });

    expect(ports.getLocalStorage()).toBeNull();
    await ports.checkStartupUpdate({ enabled: true, storage: null });

    expect(getLocalStorage).toHaveBeenCalledTimes(1);
    expect(checkStartupUpdate).toHaveBeenCalledWith({
      enabled: true,
      storage: null
    });
  });
});
