import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useAppWindowKeydown } from "../../app/useAppWindowKeydown";
import type { HotkeyFieldId } from "../../../stores/settingsStore";
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

  const settingsWindow = {
    recordingHotkeyField: ref<HotkeyFieldId | null>(null),
    applyRecordedHotkey: vi.fn(),
    cancelHotkeyRecording: vi.fn()
  };

  const stagingQueue = {
    focusZone: ref<"search" | "staging">("search"),
    stagingExpanded: ref(false),
    openStagingDrawer: vi.fn(),
    switchFocusZone: vi.fn(),
    toggleStaging: vi.fn(),
    moveStagedCommand: vi.fn(),
    stagingActiveIndex: ref(0)
  };

  const commandExecution = {
    executeStaged: vi.fn(async () => {}),
    clearStaging: vi.fn(),
    executeResult: vi.fn(),
    stageResult: vi.fn(),
    removeStagedCommand: vi.fn(),
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
    normalizedStageSelectedHotkey: ref("ArrowRight"),
    normalizedReorderUpHotkey: ref("Alt+ArrowUp"),
    normalizedReorderDownHotkey: ref("Alt+ArrowDown"),
    normalizedRemoveQueueItemHotkey: ref("Delete"),
    normalizedEscapeHotkey: ref("Escape")
  };

  const handler = useAppWindowKeydown({
    isSettingsWindow,
    settingsWindow,
    closeSettingsWindow,
    stagingQueue,
    commandExecution,
    searchInputRef,
    drawerRef,
    drawerOpen: ref(true),
    filteredResults: ref([{ id: "result-1" }, { id: "result-2" }]),
    activeIndex: ref(0),
    ensureActiveResultVisible: vi.fn(),
    stagedCommands: ref([{ id: "queue-1" }]),
    ensureActiveStagingVisible: vi.fn(),
    handleMainEscape,
    hotkeyBindings,
    isTypingElement: vi.fn(() => false)
  });

  return {
    handler,
    isSettingsWindow,
    settingsWindow,
    stagingQueue,
    commandExecution,
    closeSettingsWindow,
    handleMainEscape
  };
}

describe("useAppWindowKeydown", () => {
  it("does not require legacy terminal dropdown state on settings harness", () => {
    const harness = createHarness();

    expect("terminalDropdownOpen" in harness.settingsWindow).toBe(false);
    expect("terminalFocusIndex" in harness.settingsWindow).toBe(false);
    expect("selectTerminalOption" in harness.settingsWindow).toBe(false);
    expect("closeTerminalDropdown" in harness.settingsWindow).toBe(false);
  });

  it("routes Escape to settings hotkey recording cancel", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = true;
    harness.settingsWindow.recordingHotkeyField.value = "launcher";

    harness.handler(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(harness.settingsWindow.cancelHotkeyRecording).toHaveBeenCalledTimes(1);
    expect(harness.closeSettingsWindow).not.toHaveBeenCalled();
  });

  it("routes Ctrl+Tab to staging focus switch in main window", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = false;

    harness.handler(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true }));

    expect(harness.stagingQueue.openStagingDrawer).toHaveBeenCalledTimes(1);
    expect(harness.stagingQueue.switchFocusZone).toHaveBeenCalledTimes(1);
  });

  it("pendingCommand 打开时不触发搜索区 Enter 执行；Escape 仍走 main escape", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = false;
    harness.commandExecution.pendingCommand.value = { id: "pending" };

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
