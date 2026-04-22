import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { createLauncherVm } from "../../app/useAppCompositionRoot/launcherVm";

function createContextStub() {
  return {
    search: {
      query: ref(""),
      filteredResults: ref([]),
      activeIndex: ref(0),
      onQueryInput: vi.fn()
    },
    hotkeyBindings: {
      keyboardHints: ref([]),
      searchHintLines: ref([]),
      stagingHints: ref([])
    },
    pointerActions: ref({
      leftClick: "execute",
      rightClick: "stage"
    }),
    stagedFeedback: {
      stagedFeedbackCommandId: ref(null)
    },
    stagedCommands: ref([]),
    domBridge: {
      setSearchShellRef: vi.fn(),
      setSearchInputRef: vi.fn(),
      setDrawerRef: vi.fn(),
      setStagingPanelRef: vi.fn(),
      setStagingListRef: vi.fn(),
      setResultButtonRef: vi.fn(),
      setParamInputRef: vi.fn()
    },
    stagingGripReorderActive: ref(false)
  };
}

function createRuntimeStub() {
  return {
    layoutMetrics: {
      searchShellStyle: ref({}),
      drawerOpen: ref(false),
      drawerViewportHeight: ref(0)
    },
    commandExecution: {
      pendingCommand: ref(null),
      pendingArgValues: ref({}),
      pendingSubmitIntent: ref("stage"),
      pendingSubmitMode: ref("stage"),
      safetyDialog: ref(null),
      executing: ref(false),
      executionFeedbackMessage: ref(""),
      executionFeedbackTone: ref("neutral"),
      refreshingAllQueuedPreflight: ref(false),
      refreshingQueuedCommandIds: ref<string[]>([]),
      submitParamInput: vi.fn(() => false),
      dispatchCommandIntent: vi.fn(),
      stageResult: vi.fn(),
      executeResult: vi.fn(),
      removeStagedCommand: vi.fn(),
      updateStagedArg: vi.fn(),
      clearStaging: vi.fn(),
      executeStaged: vi.fn(),
      refreshQueuedCommandPreflight: vi.fn(),
      refreshAllQueuedPreflight: vi.fn(),
      updatePendingArgValue: vi.fn(),
      confirmSafetyExecution: vi.fn(),
      cancelSafetyExecution: vi.fn()
    },
    pendingArgs: ref([]),
    pendingSubmitHint: ref(""),
    stagingQueue: {
      queueOpen: ref(false),
      queuePanelState: ref("closed"),
      focusZone: ref("search"),
      queueActiveIndex: ref(0),
      toggleQueue: vi.fn(),
      onQueueDragStart: vi.fn(),
      onQueueDragOver: vi.fn(),
      onQueueDragEnd: vi.fn(),
      onFocusQueueIndex: vi.fn()
    },
    navStack: {
      currentPage: ref({
        type: "command-action",
        props: {
          panel: "actions"
        }
      }),
      canGoBack: ref(false),
      pushPage: vi.fn(),
      replaceTopPage: vi.fn(),
      popPage: vi.fn(),
      resetToSearch: vi.fn(),
      stack: ref([])
    },
    openActionPanel: vi.fn(),
    requestCommandPanelExit: vi.fn(),
    notifyCommandPageSettled: vi.fn(),
    notifyFlowPanelPrepared: vi.fn(),
    notifyFlowPanelHeightChange: vi.fn(),
    notifyFlowPanelSettled: vi.fn(),
    notifySearchPageSettled: vi.fn()
  };
}

describe("createLauncherVm", () => {
  it("在动作页缺少 command 时直接忽略 intent 选择", async () => {
    const context = createContextStub();
    const runtime = createRuntimeStub();
    const launcherVm = createLauncherVm(context as never, runtime as never);

    await launcherVm.actions.selectActionPanelIntent("execute");

    expect(runtime.commandExecution.dispatchCommandIntent).not.toHaveBeenCalled();
    expect(runtime.requestCommandPanelExit).not.toHaveBeenCalled();
  });
});
