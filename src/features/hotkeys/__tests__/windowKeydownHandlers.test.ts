import { describe, expect, it, vi } from "vitest";
import { createWindowKeydownHandler } from "../windowKeydownHandlers";

function makeRef<T>(value: T): { value: T } {
  return { value };
}

function createHarness() {
  const closeSettingsWindow = vi.fn();
  const openQueuePanel = vi.fn();
  const switchFocusZone = vi.fn();
  const toggleQueue = vi.fn();
  const executeQueue = vi.fn(async () => {});
  const clearQueue = vi.fn();
  const ensureActiveResultVisible = vi.fn();
  const executeResult = vi.fn();
  const enqueueResult = vi.fn();
  const openActionPanel = vi.fn();
  const copySelected = vi.fn();
  const isTypingElement = vi.fn<(target: EventTarget | null) => boolean>(() => false);
  const moveQueuedCommand = vi.fn();
  const ensureActiveQueueVisible = vi.fn();
  const removeQueuedCommand = vi.fn();
  const confirmSafetyExecution = vi.fn(async () => {});
  const cancelSafetyExecution = vi.fn();
  const handleMainEscape = vi.fn();
  const queuePostUpdate = vi.fn((callback: () => void) => callback());

  const searchInput = document.createElement("input");
  document.body.appendChild(searchInput);
  searchInput.focus();

  const options = {
    isSettingsWindow: makeRef(false),
    settings: {
      closeSettingsWindow
    },
    main: {
      focusZone: makeRef<"search" | "queue">("search"),
      searchInputRef: makeRef<HTMLInputElement | null>(searchInput),
      drawerRef: makeRef<HTMLElement | null>(null),
      commandPageOpen: makeRef(false),
      queueOpen: makeRef(false),
      openQueuePanel,
      switchFocusZone,
      toggleQueue,
      executeQueue,
      clearQueue,
      drawerOpen: makeRef(true),
      filteredResults: makeRef([{ id: "r1" }, { id: "r2" }]),
      activeIndex: makeRef(0),
      ensureActiveResultVisible,
      executeResult,
      enqueueResult,
      openActionPanel,
      copySelected,
      queuedCommands: makeRef([{ id: "q1" }]),
      isTypingElement,
      moveQueuedCommand,
      queueActiveIndex: makeRef(0),
      ensureActiveQueueVisible,
      removeQueuedCommand,
      confirmSafetyExecution,
      cancelSafetyExecution,
      handleMainEscape,
      queuePostUpdate,
      normalizedSwitchFocusHotkey: makeRef("Ctrl+Tab"),
      normalizedToggleQueueHotkey: makeRef("Tab"),
      normalizedExecuteQueueHotkey: makeRef("Ctrl+Enter"),
      normalizedClearQueueHotkey: makeRef("Ctrl+Backspace"),
      normalizedNavigateDownHotkey: makeRef("ArrowDown"),
      normalizedNavigateUpHotkey: makeRef("ArrowUp"),
      normalizedExecuteSelectedHotkey: makeRef("Enter"),
      normalizedEnqueueSelectedHotkey: makeRef("ArrowRight"),
      normalizedOpenActionPanelHotkey: makeRef("Shift+Enter"),
      normalizedCopySelectedHotkey: makeRef("Ctrl+Shift+C"),
      normalizedReorderUpHotkey: makeRef("Alt+ArrowUp"),
      normalizedReorderDownHotkey: makeRef("Alt+ArrowDown"),
      normalizedRemoveQueueItemHotkey: makeRef("Delete"),
      normalizedEscapeHotkey: makeRef("Escape")
    }
  };

  return {
    options,
    handler: createWindowKeydownHandler(options),
    spies: {
      closeSettingsWindow,
      openQueuePanel,
      switchFocusZone,
      toggleQueue,
      executeQueue,
      clearQueue,
      ensureActiveResultVisible,
      executeResult,
      enqueueResult,
      openActionPanel,
      copySelected,
      moveQueuedCommand,
      ensureActiveQueueVisible,
      removeQueuedCommand,
      confirmSafetyExecution,
      cancelSafetyExecution,
      handleMainEscape,
      queuePostUpdate
    }
  };
}

describe("windowKeydownHandlers", () => {
  it("closes settings window on Escape", () => {
    const { handler, options, spies } = createHarness();
    options.isSettingsWindow.value = true;

    handler(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(spies.closeSettingsWindow).toHaveBeenCalledTimes(1);
  });

  it("closes settings window on Escape even when recorder state exists", () => {
    const { handler, options, spies } = createHarness();
    options.isSettingsWindow.value = true;

    handler(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(spies.closeSettingsWindow).toHaveBeenCalledTimes(1);
  });

  it("does not require legacy terminal dropdown state in settings handlers", () => {
    const { options, spies } = createHarness();
    options.isSettingsWindow.value = true;

    expect("terminalDropdownOpen" in options.settings).toBe(false);
    expect("terminalFocusIndex" in options.settings).toBe(false);
    expect("recordingHotkeyField" in options.settings).toBe(false);
    expect("applyRecordedHotkey" in options.settings).toBe(false);
    expect("cancelHotkeyRecording" in options.settings).toBe(false);
    expect(spies.closeSettingsWindow).not.toHaveBeenCalled();
  });

  it("switches focus with Ctrl+Tab in main window", () => {
    const { handler, options, spies } = createHarness();
    options.main.queueOpen.value = false;

    handler(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true }));

    expect(spies.openQueuePanel).toHaveBeenCalledTimes(1);
    expect(spies.switchFocusZone).toHaveBeenCalledTimes(1);
  });

  it("does not toggle staging on Tab when Review is open and toggleQueue=Tab", () => {
    const { handler, options, spies } = createHarness();
    options.main.queueOpen.value = true;
    options.main.normalizedToggleQueueHotkey.value = "Tab";
    const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });

    handler(event);

    expect(event.defaultPrevented).toBe(false);
    expect(spies.toggleQueue).not.toHaveBeenCalled();
  });

  it("moves active search result with ArrowDown", () => {
    const { handler, options, spies } = createHarness();
    options.main.focusZone.value = "search";

    handler(new KeyboardEvent("keydown", { key: "ArrowDown" }));

    expect(options.main.activeIndex.value).toBe(1);
    expect(spies.queuePostUpdate).toHaveBeenCalled();
    expect(spies.ensureActiveResultVisible).toHaveBeenCalled();
  });

  it("removes staging item with remove hotkey", () => {
    const { handler, options, spies } = createHarness();
    options.main.focusZone.value = "queue";
    options.main.queueOpen.value = true;
    options.main.queuedCommands.value = [{ id: "q-1" }];
    options.main.queueActiveIndex.value = 0;

    handler(new KeyboardEvent("keydown", { key: "Delete" }));

    expect(spies.removeQueuedCommand).toHaveBeenCalledWith("q-1");
  });

  it("handles Escape in main window with preventDefault", () => {
    const { handler, spies } = createHarness();
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });

    handler(event);

    expect(event.defaultPrevented).toBe(true);
    expect(spies.handleMainEscape).toHaveBeenCalledTimes(1);
  });

  it("does not globally handle Escape for inline typing targets outside the launcher search input", () => {
    const { handler, options, spies } = createHarness();
    const inlineInput = document.createElement("input");
    document.body.appendChild(inlineInput);
    options.main.isTypingElement.mockImplementation((target: EventTarget | null) => target === inlineInput);

    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    Object.defineProperty(event, "target", {
      configurable: true,
      value: inlineInput
    });

    handler(event);

    expect(event.defaultPrevented).toBe(false);
    expect(spies.handleMainEscape).not.toHaveBeenCalled();
  });

  it("does not globally handle Escape for local popup scopes", () => {
    const { handler, spies } = createHarness();
    const localScope = document.createElement("div");
    localScope.dataset.localEscapeScope = "true";
    const trigger = document.createElement("button");
    localScope.appendChild(trigger);
    document.body.appendChild(localScope);

    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    Object.defineProperty(event, "target", {
      configurable: true,
      value: trigger
    });

    handler(event);

    expect(event.defaultPrevented).toBe(false);
    expect(spies.handleMainEscape).not.toHaveBeenCalled();
  });

  it("does not globally confirm safety by Enter; Escape routes to handleMainEscape", () => {
    const { handler, options, spies } = createHarness();
    options.main.commandPageOpen.value = true;

    const enterEvent = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    handler(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(false);
    expect(spies.confirmSafetyExecution).not.toHaveBeenCalled();

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    handler(escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(spies.handleMainEscape).toHaveBeenCalledTimes(1);
  });

  it("does not confirm safety dialog on Ctrl+Enter", () => {
    const { handler, options, spies } = createHarness();
    options.main.commandPageOpen.value = true;
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
      cancelable: true
    });

    handler(event);

    expect(event.defaultPrevented).toBe(true);
    expect(spies.confirmSafetyExecution).not.toHaveBeenCalled();
    expect(spies.cancelSafetyExecution).not.toHaveBeenCalled();
    expect(spies.executeQueue).toHaveBeenCalledTimes(1);
  });

  it("keeps toggle queue hotkey available when param flow is open", () => {
    const { handler, options, spies } = createHarness();
    options.main.commandPageOpen.value = true;
    options.main.normalizedToggleQueueHotkey.value = "Ctrl+Q";

    handler(new KeyboardEvent("keydown", { key: "q", ctrlKey: true, cancelable: true }));

    expect(spies.toggleQueue).toHaveBeenCalledTimes(1);
  });

  it("keeps toggle queue hotkey available when safety flow is open", () => {
    const { handler, options, spies } = createHarness();
    options.main.commandPageOpen.value = true;
    options.main.normalizedToggleQueueHotkey.value = "Ctrl+Q";

    handler(new KeyboardEvent("keydown", { key: "q", ctrlKey: true, cancelable: true }));

    expect(spies.toggleQueue).toHaveBeenCalledTimes(1);
  });

  it("支持 Shift+Enter 打开动作面板，以及 Ctrl+Shift+C 复制当前选中项", () => {
    const { handler, spies } = createHarness();

    handler(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
    handler(new KeyboardEvent("keydown", { key: "c", ctrlKey: true, shiftKey: true }));

    expect(spies.openActionPanel).toHaveBeenCalledTimes(1);
    expect(spies.copySelected).toHaveBeenCalledTimes(1);
  });
});
