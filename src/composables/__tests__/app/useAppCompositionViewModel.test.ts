import { readFileSync } from "node:fs";
import { effectScope, isRef, ref, unref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createAppCompositionViewModel } from "../../app/useAppCompositionRoot/viewModel";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
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

function createDeepStub(): unknown {
  const fn = vi.fn();
  return new Proxy(fn, {
    get(target, prop) {
      if (prop === "value") {
        return undefined;
      }
      if (prop === "then") {
        return undefined;
      }
      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop);
      }
      return createDeepStub();
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value);
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

function createCommandActionPage(command: CommandTemplate) {
  return {
    type: "command-action" as const,
    props: {
      command,
      panel: "actions" as const
    }
  };
}

function createNoArgCommand(): CommandTemplate {
  return {
    id: "docker-ps",
    title: "查看运行中容器",
    description: "测试命令",
    preview: "docker ps",
    execution: {
      kind: "exec",
      program: "docker",
      args: ["ps"]
    },
    folder: "@_docker",
    category: "docker",
    needsArgs: false
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
    expect("query" in viewModel.launcherVm).toBe(false);
    expect(isRef(viewModel.launcherVm.search.query)).toBe(false);
    expect(viewModel.launcherVm.search.query).toBe("");
    expect(viewModel.launcherVm.queue.items).toEqual([]);
    expect(viewModel.launcherVm.actions.toggleQueue).toBeTypeOf("function");
    expect(isRef(viewModel.settingsVm.defaultTerminal)).toBe(false);
    expect(viewModel.settingsVm.defaultTerminal).toBe("powershell");
    expect("pointerActionFields" in viewModel.settingsVm).toBe(true);
    expect("applyPointerActionChange" in viewModel.settingsVm).toBe(true);
    expect(appSource).toMatch(
      /const\s*\{\s*launcherVm,\s*settingsVm,\s*appShellVm\s*\}\s*=\s*useAppCompositionRoot\(\);/s
    );
    expect(appSource).not.toContain("import SettingsWindow");
    expect(appSource).toContain("<LauncherWindow :launcher-vm=\"launcherVm\"");
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

    expect(viewModel.launcherVm.actions.notifyFlowPanelSettled).toBeTypeOf("function");
    expect(viewModel.launcherVm.actions.notifyFlowPanelHeightChange).toBeTypeOf("function");
    expect("drawerFloorViewportHeight" in viewModel).toBe(false);
    expect("stagingListMaxHeight" in viewModel).toBe(false);
    expect("settingsErrorRoute" in viewModel).toBe(false);
    expect("settingsCloseConfirmOpen" in viewModel).toBe(false);
    expect("cancelSettingsCloseConfirm" in viewModel).toBe(false);
    expect("discardUnsavedSettingsChanges" in viewModel).toBe(false);
    expect("isHotkeyRecording" in viewModel).toBe(false);
    expect("getHotkeyDisplay" in viewModel).toBe(false);

    const submitted = viewModel.launcherVm.actions.submitParamInput();

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

  it("销毁作用域后不会再执行 settingsSavedTimer 回写", async () => {
    vi.useFakeTimers();
    try {
      const context = createContextStub();
      const persistSetting = vi.fn().mockResolvedValue(undefined);
      const settingsWindow = context.settingsScene.settingsWindow as {
        persistSetting?: () => Promise<void>;
        settingsError?: { value: string };
      };
      settingsWindow.persistSetting = persistSetting;
      settingsWindow.settingsError = ref("");
      const scope = effectScope();
      const viewModel = scope.run(() =>
        createAppCompositionViewModel(context as never, createDeepStub() as never)
      );

      await viewModel!.appShellVm.saveSettings();

      expect(viewModel!.appShellVm.settingsSaved).toBe(true);
      scope.stop();

      vi.runAllTimers();

      expect(persistSetting).toHaveBeenCalledTimes(1);
      expect(viewModel!.appShellVm.settingsSaved).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("销毁作用域后不会响应迟到的 saveSettings 成功回调", async () => {
    vi.useFakeTimers();
    try {
      const context = createContextStub();
      const persistDeferred = createDeferred<void>();
      const persistSetting = vi.fn(() => persistDeferred.promise);
      const settingsWindow = context.settingsScene.settingsWindow as {
        persistSetting?: () => Promise<void>;
        settingsError?: { value: string };
      };
      settingsWindow.persistSetting = persistSetting;
      settingsWindow.settingsError = ref("");
      const scope = effectScope();
      const viewModel = scope.run(() =>
        createAppCompositionViewModel(context as never, createDeepStub() as never)
      );

      const savePromise = viewModel!.appShellVm.saveSettings();
      scope.stop();
      persistDeferred.resolve();
      await savePromise;

      expect(persistSetting).toHaveBeenCalledTimes(1);
      expect(viewModel!.appShellVm.settingsSaved).toBe(false);

      vi.runAllTimers();
      expect(viewModel!.appShellVm.settingsSaved).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("销毁作用域后不会响应迟到的 applyHotkeyChange 成功回调", async () => {
    vi.useFakeTimers();
    try {
      const context = createContextStub();
      const applyHotkeyDeferred = createDeferred<void>();
      const applyHotkeyChange = vi.fn(() => applyHotkeyDeferred.promise);
      const settingsWindow = context.settingsScene.settingsWindow as {
        applyHotkeyChange?: (fieldId: string, value: string) => Promise<void>;
        settingsError?: { value: string };
      };
      settingsWindow.applyHotkeyChange = applyHotkeyChange;
      settingsWindow.settingsError = ref("");
      const scope = effectScope();
      const viewModel = scope.run(() =>
        createAppCompositionViewModel(context as never, createDeepStub() as never)
      );

      viewModel!.settingsVm.applyHotkeyChange("launcher", "Alt+Space");
      scope.stop();
      applyHotkeyDeferred.resolve();
      await Promise.resolve();

      expect(applyHotkeyChange).toHaveBeenCalledTimes(1);
      expect(viewModel!.appShellVm.settingsSaved).toBe(false);

      vi.runAllTimers();
      expect(viewModel!.appShellVm.settingsSaved).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(["execute", "stage", "copy"] as const)(
    "动作面板选择无参 %s 后会请求收口回搜索页",
    async (intent) => {
      const command = createNoArgCommand();
      const context = createContextStub();
      const dispatchCommandIntent = vi.fn(async () => {});
      const requestCommandPanelExit = vi.fn();

      const runtime = {
        commandExecution: {
          submitParamInput: vi.fn(() => false),
          dispatchCommandIntent,
          pendingCommand: ref<unknown>(null),
          executionFeedbackMessage: ref(""),
          executionFeedbackTone: ref("neutral"),
          pendingArgValues: ref({}),
          pendingSubmitIntent: ref("stage"),
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
          canGoBack: ref(true),
          popPage: vi.fn(),
          currentPage: ref(createCommandActionPage(command)),
          pushPage: vi.fn(),
          replaceTopPage: vi.fn(),
          resetToSearch: vi.fn(),
          stack: ref([{ type: "search" }, createCommandActionPage(command)])
        },
        layoutMetrics: {
          searchShellStyle: ref({}),
          drawerOpen: ref(false),
          drawerViewportHeight: ref(0)
        },
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
        pendingArgs: ref([]),
        pendingSubmitHint: ref(""),
        openActionPanel: vi.fn(),
        requestCommandPanelExit,
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

      viewModel.launcherVm.actions.selectActionPanelIntent(intent);
      await Promise.resolve();

      expect(dispatchCommandIntent).toHaveBeenCalledWith(command, intent);
      expect(requestCommandPanelExit).toHaveBeenCalledTimes(1);
    }
  );
});
