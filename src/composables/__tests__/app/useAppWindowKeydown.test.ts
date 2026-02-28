import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useAppWindowKeydown } from "../../app/useAppWindowKeydown";
import type { HotkeyFieldId } from "../../../stores/settingsStore";

function createHarness() {
  const isSettingsWindow = ref(false);
  const closeSettingsWindow = vi.fn();
  const handleMainEscape = vi.fn();
  const searchInput = document.createElement("input");
  const searchInputRef = ref<HTMLInputElement | null>(searchInput);
  document.body.appendChild(searchInput);
  searchInput.focus();

  const settingsWindow = {
    recordingHotkeyField: ref<HotkeyFieldId | null>(null),
    applyRecordedHotkey: vi.fn(),
    cancelHotkeyRecording: vi.fn(),
    terminalDropdownOpen: ref(false),
    availableTerminals: ref([{ id: "powershell" }, { id: "cmd" }]),
    terminalFocusIndex: ref(0),
    selectTerminalOption: vi.fn(),
    closeTerminalDropdown: vi.fn()
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

  it("routes Escape to main escape handler", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = false;
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });

    harness.handler(event);

    expect(event.defaultPrevented).toBe(true);
    expect(harness.handleMainEscape).toHaveBeenCalledTimes(1);
  });

  it("routes Enter/Escape to safety confirmation handlers when safety dialog is open", () => {
    const harness = createHarness();
    harness.isSettingsWindow.value = false;
    harness.commandExecution.safetyDialog.value = { title: "risk" };

    harness.handler(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
    expect(harness.commandExecution.confirmSafetyExecution).toHaveBeenCalledTimes(1);

    harness.handler(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    expect(harness.commandExecution.cancelSafetyExecution).toHaveBeenCalledTimes(1);
  });
});

