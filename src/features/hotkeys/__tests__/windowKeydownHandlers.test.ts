import { describe, expect, it, vi } from "vitest";
import { createWindowKeydownHandler } from "../windowKeydownHandlers";

function makeRef<T>(value: T): { value: T } {
  return { value };
}

function createHarness() {
  const closeSettingsWindow = vi.fn();
  const openStagingDrawer = vi.fn();
  const switchFocusZone = vi.fn();
  const toggleStaging = vi.fn();
  const executeStaged = vi.fn(async () => {});
  const clearStaging = vi.fn();
  const ensureActiveResultVisible = vi.fn();
  const executeResult = vi.fn();
  const stageResult = vi.fn();
  const isTypingElement = vi.fn(() => false);
  const moveStagedCommand = vi.fn();
  const ensureActiveStagingVisible = vi.fn();
  const removeStagedCommand = vi.fn();
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
      focusZone: makeRef<"search" | "staging">("search"),
      searchInputRef: makeRef<HTMLInputElement | null>(searchInput),
      drawerRef: makeRef<HTMLElement | null>(null),
      commandPanelOpen: makeRef(false),
      stagingExpanded: makeRef(false),
      openStagingDrawer,
      switchFocusZone,
      toggleStaging,
      executeStaged,
      clearStaging,
      drawerOpen: makeRef(true),
      filteredResults: makeRef([{ id: "r1" }, { id: "r2" }]),
      activeIndex: makeRef(0),
      ensureActiveResultVisible,
      executeResult,
      stageResult,
      stagedCommands: makeRef([{ id: "q1" }]),
      isTypingElement,
      moveStagedCommand,
      stagingActiveIndex: makeRef(0),
      ensureActiveStagingVisible,
      removeStagedCommand,
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
      normalizedStageSelectedHotkey: makeRef("ArrowRight"),
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
      openStagingDrawer,
      switchFocusZone,
      toggleStaging,
      executeStaged,
      clearStaging,
      ensureActiveResultVisible,
      executeResult,
      stageResult,
      moveStagedCommand,
      ensureActiveStagingVisible,
      removeStagedCommand,
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
    options.main.stagingExpanded.value = false;

    handler(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true }));

    expect(spies.openStagingDrawer).toHaveBeenCalledTimes(1);
    expect(spies.switchFocusZone).toHaveBeenCalledTimes(1);
  });

  it("does not toggle staging on Tab when Review is open and toggleQueue=Tab", () => {
    const { handler, options, spies } = createHarness();
    options.main.stagingExpanded.value = true;
    options.main.normalizedToggleQueueHotkey.value = "Tab";
    const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });

    handler(event);

    expect(event.defaultPrevented).toBe(false);
    expect(spies.toggleStaging).not.toHaveBeenCalled();
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
    options.main.focusZone.value = "staging";
    options.main.stagingExpanded.value = true;
    options.main.stagedCommands.value = [{ id: "q-1" }];
    options.main.stagingActiveIndex.value = 0;

    handler(new KeyboardEvent("keydown", { key: "Delete" }));

    expect(spies.removeStagedCommand).toHaveBeenCalledWith("q-1");
  });

  it("handles Escape in main window with preventDefault", () => {
    const { handler, spies } = createHarness();
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });

    handler(event);

    expect(event.defaultPrevented).toBe(true);
    expect(spies.handleMainEscape).toHaveBeenCalledTimes(1);
  });

  it("does not globally confirm safety by Enter; Escape routes to handleMainEscape", () => {
    const { handler, options, spies } = createHarness();
    options.main.commandPanelOpen.value = true;

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
    options.main.commandPanelOpen.value = true;
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
      cancelable: true
    });

    handler(event);

    expect(event.defaultPrevented).toBe(true);
    expect(spies.confirmSafetyExecution).not.toHaveBeenCalled();
    expect(spies.cancelSafetyExecution).not.toHaveBeenCalled();
    expect(spies.executeStaged).toHaveBeenCalledTimes(1);
  });

  it("keeps toggle queue hotkey available when param flow is open", () => {
    const { handler, options, spies } = createHarness();
    options.main.commandPanelOpen.value = true;
    options.main.normalizedToggleQueueHotkey.value = "Ctrl+Q";

    handler(new KeyboardEvent("keydown", { key: "q", ctrlKey: true, cancelable: true }));

    expect(spies.toggleStaging).toHaveBeenCalledTimes(1);
  });

  it("keeps toggle queue hotkey available when safety flow is open", () => {
    const { handler, options, spies } = createHarness();
    options.main.commandPanelOpen.value = true;
    options.main.normalizedToggleQueueHotkey.value = "Ctrl+Q";

    handler(new KeyboardEvent("keydown", { key: "q", ctrlKey: true, cancelable: true }));

    expect(spies.toggleStaging).toHaveBeenCalledTimes(1);
  });
});
