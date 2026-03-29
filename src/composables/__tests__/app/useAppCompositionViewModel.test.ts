import { readFileSync } from "node:fs";
import { isRef, ref, unref } from "vue";
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

function createContextStub(options: { runtimePlatform?: ReturnType<typeof ref> } = {}) {
  const hotkeyBindings = createDeepStub();
  const settingsWindow = createDeepStub();
  const commandManagement = createDeepStub();
  const themeManager = createDeepStub();
  const defaultTerminal = ref("powershell");
  const terminalReusePolicy = ref("never");
  const language = ref("zh-CN");
  const autoCheckUpdate = ref(true);
  const launchAtLogin = ref(false);
  const alwaysElevatedTerminal = ref(false);
  const appVersion = ref("1.0.1");
  const runtimePlatform = options.runtimePlatform ?? ref("windows");
  const updateStatus = ref(null);
  const windowOpacity = ref(0.96);
  const theme = ref("obsidian");
  const blurEnabled = ref(true);
  const checkUpdate = vi.fn();
  const downloadUpdate = vi.fn();
  const openHomepage = vi.fn();
  const settingsStore = {
    setWindowOpacity: vi.fn(),
    setTheme: vi.fn(),
    setBlurEnabled: vi.fn()
  };
  const settingsScene = {
    hotkeyBindings,
    settingsWindow,
    commandManagement,
    themeManager,
    defaultTerminal,
    terminalReusePolicy,
    language,
    autoCheckUpdate,
    launchAtLogin,
    alwaysElevatedTerminal,
    appVersion,
    updateManager: {
      runtimePlatform,
      updateStatus,
      checkUpdate,
      downloadUpdate
    },
    windowOpacity,
    theme,
    blurEnabled,
    openHomepage,
    settingsStore
  };

  return {
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
    hotkeyBindings,
    settingsWindow,
    commandManagement,
    themeManager,
    defaultTerminal,
    terminalReusePolicy,
    language,
    autoCheckUpdate,
    launchAtLogin,
    alwaysElevatedTerminal,
    appVersion,
    runtimePlatform,
    updateStatus,
    setWindowOpacity: settingsStore.setWindowOpacity,
    setTheme: settingsStore.setTheme,
    setBlurEnabled: settingsStore.setBlurEnabled,
    windowOpacity,
    theme,
    blurEnabled,
    checkUpdate,
    downloadUpdate,
    openHomepage,
    settingsScene
  };
}

describe("createAppCompositionViewModel", () => {
  it("returns segmented launcher/settings/app-shell view models and App consumes only those roots", () => {
    const context = createContextStub();

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
    const appSource = readFileSync("src/App.vue", "utf8");

    expect(viewModel.launcherVm).toBeDefined();
    expect(viewModel.settingsVm).toBeDefined();
    expect(viewModel.appShellVm).toBeDefined();
    expect("query" in viewModel).toBe(false);
    expect("settingsNavItems" in viewModel).toBe(false);
    expect(isRef(viewModel.launcherVm.query)).toBe(false);
    expect(viewModel.launcherVm.query).toBe("");
    expect(isRef(viewModel.settingsVm.defaultTerminal)).toBe(false);
    expect(viewModel.settingsVm.defaultTerminal).toBe("powershell");
    expect(appSource).toMatch(
      /const\s*\{\s*launcherVm,\s*settingsVm,\s*appShellVm\s*\}\s*=\s*useAppCompositionRoot\(\);/s
    );
    expect(appSource).not.toContain("import SettingsWindow");
  });

  it("submitParamInput 透传业务提交结果，且不再直接 popPage", () => {
    const submitParamInput = vi.fn();
    const popPage = vi.fn();

    const context = createContextStub();

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

    expect(viewModel.launcherVm.notifyFlowPanelSettled).toBeTypeOf("function");
    expect(viewModel.launcherVm.notifyFlowPanelHeightChange).toBeTypeOf("function");
    expect("drawerFloorViewportHeight" in viewModel).toBe(false);
    expect("stagingListMaxHeight" in viewModel).toBe(false);
    expect("settingsErrorRoute" in viewModel).toBe(false);
    expect("settingsCloseConfirmOpen" in viewModel).toBe(false);
    expect("cancelSettingsCloseConfirm" in viewModel).toBe(false);
    expect("discardUnsavedSettingsChanges" in viewModel).toBe(false);
    expect("isHotkeyRecording" in viewModel).toBe(false);
    expect("getHotkeyDisplay" in viewModel).toBe(false);

    const submitted = viewModel.launcherVm.submitParamInput();

    expect(submitted).toBe(true);
    expect(submitParamInput).toHaveBeenCalledTimes(1);
    expect(popPage).not.toHaveBeenCalled();
  });

  it("showAlwaysElevatedTerminal 会响应 runtimePlatform 的异步更新", () => {
    const runtimePlatform = ref("");
    const context = createContextStub({ runtimePlatform });

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

    expect(unref(viewModel.settingsVm.showAlwaysElevatedTerminal)).toBe(false);
    runtimePlatform.value = "win";
    expect(unref(viewModel.settingsVm.showAlwaysElevatedTerminal)).toBe(true);
  });
});
