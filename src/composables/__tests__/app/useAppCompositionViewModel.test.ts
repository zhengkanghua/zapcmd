import { ref, unref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createAppCompositionViewModel } from "../../app/useAppCompositionRoot/viewModel";

function createDeepStub(): unknown {
  const fn = vi.fn();
  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === "value") {
        return undefined;
      }
      if (prop === "then") {
        return undefined;
      }
      return createDeepStub();
    },
    apply() {
      return undefined;
    }
  });
}

describe("createAppCompositionViewModel", () => {
  it("submitParamInput 透传业务提交结果，且不再直接 popPage", () => {
    const submitParamInput = vi.fn();
    const popPage = vi.fn();

    const context = {
      isSettingsWindow: ref(false),
      search: {
        query: ref(""),
        filteredResults: ref([]),
        activeIndex: ref(0),
        onQueryInput: vi.fn()
      },
      domBridge: {
        setSearchShellRef: vi.fn(),
        setSearchInputRef: vi.fn(),
        setDrawerRef: vi.fn(),
        setStagingPanelRef: vi.fn(),
        setStagingListRef: vi.fn(),
        setResultButtonRef: vi.fn(),
        setParamInputRef: vi.fn()
      },
      stagedFeedback: {
        stagedFeedbackCommandId: ref(null)
      },
      stagedCommands: ref([]),
      stagingGripReorderActive: ref(false),
      hotkeyBindings: createDeepStub(),
      settingsWindow: createDeepStub(),
      commandManagement: createDeepStub(),
      themeManager: createDeepStub(),
      defaultTerminal: ref("powershell"),
      terminalReusePolicy: ref("never"),
      language: ref("zh-CN"),
      autoCheckUpdate: ref(true),
      launchAtLogin: ref(false),
      alwaysElevatedTerminal: ref(false),
      appVersion: ref("1.0.1"),
      runtimePlatform: ref("windows"),
      updateStatus: ref(null),
      setWindowOpacity: vi.fn(),
      setTheme: vi.fn(),
      setBlurEnabled: vi.fn(),
      windowOpacity: ref(0.96),
      theme: ref("obsidian"),
      blurEnabled: ref(true),
      checkUpdate: vi.fn(),
      downloadUpdate: vi.fn(),
      openHomepage: vi.fn()
    };

    const runtime = {
      commandExecution: {
        submitParamInput: vi.fn(() => {
          submitParamInput();
          runtime.commandExecution.pendingCommand.value = null;
          return true;
        }),
        pendingCommand: ref<unknown>({ id: "pending" }),
        executionFeedbackMessage: ref(""),
        executionFeedbackTone: ref("neutral"),
        pendingArgValues: ref({}),
        pendingSubmitMode: ref("stage"),
        safetyDialog: ref(null),
        stageResult: vi.fn(),
        executeResult: vi.fn(),
        removeStagedCommand: vi.fn(),
        updateStagedArg: vi.fn(),
        clearStaging: vi.fn(),
        executeStaged: vi.fn(),
        updatePendingArgValue: vi.fn(),
        confirmSafetyExecution: vi.fn(),
        cancelSafetyExecution: vi.fn(),
        setExecutionFeedback: vi.fn()
      },
      navStack: {
        canGoBack: ref(true),
        popPage,
        currentPage: ref({ type: "command-action" }),
        pushPage: vi.fn(),
        resetToSearch: vi.fn(),
        stack: ref([{ type: "search" }, { type: "command-action" }])
      },
      layoutMetrics: {
        searchShellStyle: ref({}),
        drawerOpen: ref(false),
        drawerViewportHeight: ref(0),
        drawerFloorViewportHeight: ref(0),
        drawerFillerHeight: ref(0),
        stagingListShouldScroll: ref(false),
        stagingListMaxHeight: ref("0px")
      },
      stagingQueue: {
        stagingExpanded: ref(false),
        stagingDrawerState: ref("closed"),
        focusZone: ref("search"),
        stagingActiveIndex: ref(0),
        toggleStaging: vi.fn(),
        onStagingDragStart: vi.fn(),
        onStagingDragOver: vi.fn(),
        onStagingDragEnd: vi.fn(),
        onFocusStagingIndex: vi.fn()
      },
      pendingArgs: ref([]),
      pendingSubmitHint: ref(""),
      requestCommandPanelExit: vi.fn(),
      notifyCommandPageSettled: vi.fn(),
      notifyFlowPanelHeightChange: vi.fn(),
      notifyFlowPanelSettled: vi.fn(),
      notifySearchPageSettled: vi.fn(),
      closeSettingsWindow: vi.fn(),
      forceCloseSettingsWindow: vi.fn(),
      hideMainWindow: vi.fn()
    };

    const viewModel = createAppCompositionViewModel(
      context as never,
      runtime as never
    );

    expect(viewModel.notifyFlowPanelSettled).toBeTypeOf("function");
    expect(viewModel.notifyFlowPanelHeightChange).toBeTypeOf("function");
    expect("drawerFloorViewportHeight" in viewModel).toBe(false);
    expect("stagingListMaxHeight" in viewModel).toBe(false);

    const submitted = viewModel.submitParamInput();

    expect(submitted).toBe(true);
    expect(submitParamInput).toHaveBeenCalledTimes(1);
    expect(popPage).not.toHaveBeenCalled();
  });

  it("showAlwaysElevatedTerminal 会响应 runtimePlatform 的异步更新", () => {
    const runtimePlatform = ref("");
    const context = {
      isSettingsWindow: ref(false),
      search: {
        query: ref(""),
        filteredResults: ref([]),
        activeIndex: ref(0),
        onQueryInput: vi.fn()
      },
      domBridge: {
        setSearchShellRef: vi.fn(),
        setSearchInputRef: vi.fn(),
        setDrawerRef: vi.fn(),
        setStagingPanelRef: vi.fn(),
        setStagingListRef: vi.fn(),
        setResultButtonRef: vi.fn(),
        setParamInputRef: vi.fn()
      },
      stagedFeedback: {
        stagedFeedbackCommandId: ref(null)
      },
      stagedCommands: ref([]),
      stagingGripReorderActive: ref(false),
      hotkeyBindings: createDeepStub(),
      settingsWindow: createDeepStub(),
      commandManagement: createDeepStub(),
      themeManager: createDeepStub(),
      defaultTerminal: ref("powershell"),
      terminalReusePolicy: ref("never"),
      language: ref("zh-CN"),
      autoCheckUpdate: ref(true),
      launchAtLogin: ref(false),
      alwaysElevatedTerminal: ref(false),
      appVersion: ref("1.0.1"),
      runtimePlatform,
      updateStatus: ref(null),
      setWindowOpacity: vi.fn(),
      setTheme: vi.fn(),
      setBlurEnabled: vi.fn(),
      windowOpacity: ref(0.96),
      theme: ref("obsidian"),
      blurEnabled: ref(true),
      checkUpdate: vi.fn(),
      downloadUpdate: vi.fn(),
      openHomepage: vi.fn()
    };

    const runtime = {
      commandExecution: {
        submitParamInput: vi.fn(() => false),
        pendingCommand: ref<unknown>(null),
        executionFeedbackMessage: ref(""),
        executionFeedbackTone: ref("neutral"),
        pendingArgValues: ref({}),
        pendingSubmitMode: ref("stage"),
        safetyDialog: ref(null),
        stageResult: vi.fn(),
        executeResult: vi.fn(),
        removeStagedCommand: vi.fn(),
        updateStagedArg: vi.fn(),
        clearStaging: vi.fn(),
        executeStaged: vi.fn(),
        updatePendingArgValue: vi.fn(),
        confirmSafetyExecution: vi.fn(),
        cancelSafetyExecution: vi.fn(),
        setExecutionFeedback: vi.fn(),
        executing: ref(false)
      },
      navStack: {
        canGoBack: ref(false),
        popPage: vi.fn(),
        currentPage: ref({ type: "search" }),
        pushPage: vi.fn(),
        resetToSearch: vi.fn(),
        stack: ref([{ type: "search" }])
      },
      layoutMetrics: {
        searchShellStyle: ref({}),
        drawerOpen: ref(false),
        drawerViewportHeight: ref(0)
      },
      stagingQueue: {
        stagingExpanded: ref(false),
        stagingDrawerState: ref("closed"),
        focusZone: ref("search"),
        stagingActiveIndex: ref(0),
        toggleStaging: vi.fn(),
        onStagingDragStart: vi.fn(),
        onStagingDragOver: vi.fn(),
        onStagingDragEnd: vi.fn(),
        onFocusStagingIndex: vi.fn()
      },
      pendingArgs: ref([]),
      pendingSubmitHint: ref(""),
      requestCommandPanelExit: vi.fn(),
      notifyCommandPageSettled: vi.fn(),
      notifyFlowPanelHeightChange: vi.fn(),
      notifyFlowPanelSettled: vi.fn(),
      notifySearchPageSettled: vi.fn(),
      closeSettingsWindow: vi.fn(),
      forceCloseSettingsWindow: vi.fn(),
      hideMainWindow: vi.fn()
    };

    const viewModel = createAppCompositionViewModel(
      context as never,
      runtime as never
    );

    expect(unref(viewModel.showAlwaysElevatedTerminal)).toBe(false);
    runtimePlatform.value = "win";
    expect(unref(viewModel.showAlwaysElevatedTerminal)).toBe(true);
  });
});
