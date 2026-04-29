import { effectScope, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const state = {
    fallbackTerminals: [
      { id: "fallback", label: "Fallback Terminal", path: "/bin/fallback" }
    ],
    commandTemplateItems: [{ id: "catalog-command" }],
    store: null as ReturnType<typeof createStore> | null,
    runtime: { runtimeId: "launcher-runtime" },
    currentWindow: { label: "main" },
    capturedContext: null as Record<string, unknown> | null,
    setAppLocale: vi.fn(),
    useTheme: vi.fn(),
    useMotionPreset: vi.fn(),
    resolveEffectiveTerminal: vi.fn(),
    readAvailableTerminals: vi.fn(async () => []),
    createPorts: vi.fn(),
    scheduleSearchInputFocus: vi.fn(),
    createAppShellVm: vi.fn(() => ({ shell: "app-shell" })),
    createLauncherVm: vi.fn((context: unknown) => {
      state.capturedContext = context as Record<string, unknown>;
      return { context };
    }),
    createRuntime: vi.fn(() => state.runtime)
  };

  return state;
});

vi.mock("pinia", () => ({
  storeToRefs: (store: { refs: unknown }) => store.refs
}));

vi.mock("../../../i18n", () => ({
  currentLocale: ref("zh-CN"),
  setAppLocale: mockState.setAppLocale
}));

vi.mock("../../../features/terminals/fallbackTerminals", () => ({
  fallbackTerminalOptions: vi.fn(() => mockState.fallbackTerminals)
}));

vi.mock("../../../features/terminals/resolveEffectiveTerminal", () => ({
  resolveEffectiveTerminal: mockState.resolveEffectiveTerminal
}));

vi.mock("../../../services/commandExecutor", () => ({
  createCommandExecutor: vi.fn(() => ({ execute: vi.fn() }))
}));

vi.mock("../../launcher/useLauncherDomBridge", () => ({
  useLauncherDomBridge: vi.fn(() => ({
    searchInputRef: ref(null),
    setSearchShellRef: vi.fn(),
    setSearchInputRef: vi.fn(),
    setDrawerRef: vi.fn(),
    setStagingPanelRef: vi.fn(),
    setStagingListRef: vi.fn(),
    setResultButtonRef: vi.fn(),
    setParamInputRef: vi.fn()
  }))
}));

vi.mock("../../launcher/useLauncherSearch", () => ({
  useLauncherSearch: vi.fn((options?: { commandSource?: { value: unknown } }) => ({
    query: ref(""),
    filteredResults: ref([]),
    activeIndex: ref(0),
    onQueryInput: vi.fn(),
    commandSource: options?.commandSource
  }))
}));

vi.mock("../../launcher/useSearchFocus", () => ({
  useSearchFocus: vi.fn(() => ({
    scheduleSearchInputFocus: mockState.scheduleSearchInputFocus
  }))
}));

vi.mock("../../launcher/useStagedFeedback", () => ({
  useStagedFeedback: vi.fn(() => ({
    stagedFeedbackCommandId: ref(null)
  }))
}));

vi.mock("../../launcher/useTerminalExecution", () => ({
  useTerminalExecution: vi.fn(() => ({
    runCommandInTerminal: vi.fn(),
    runCommandsInTerminal: vi.fn()
  }))
}));

vi.mock("../../launcher/useCommandCatalog", () => ({
  useCommandCatalog: vi.fn(() => ({
    commandTemplates: ref(mockState.commandTemplateItems),
    allCommandTemplates: ref([]),
    catalogReady: ref(true),
    catalogStatus: ref("ready")
  }))
}));

vi.mock("../../settings/useHotkeyBindings", () => ({
  useHotkeyBindings: vi.fn(() => ({
    keyboardHints: ref([]),
    searchHintLines: ref([]),
    stagingHints: ref([]),
    launcherHotkey: ref("Ctrl+K")
  }))
}));

vi.mock("../useMotionPreset", () => ({
  useMotionPreset: mockState.useMotionPreset
}));

vi.mock("../useTheme", () => ({
  useTheme: mockState.useTheme
}));

vi.mock("../useAppWindowResolver", () => ({
  createAppWindowResolver: vi.fn(() => () => mockState.currentWindow)
}));

vi.mock("../../../stores/settingsStore", () => ({
  useSettingsStore: vi.fn(() => {
    if (!mockState.store) {
      throw new Error("settings store not initialized");
    }
    return mockState.store;
  })
}));

vi.mock("../../app/useAppCompositionRoot/appShellVm", () => ({
  createAppShellVm: mockState.createAppShellVm
}));

vi.mock("../../app/useAppCompositionRoot/launcherVm", () => ({
  createLauncherVm: mockState.createLauncherVm
}));

vi.mock("../../app/useAppCompositionRoot/runtime", () => ({
  createAppCompositionRuntime: mockState.createRuntime
}));

vi.mock("../../app/useAppCompositionRoot/ports", () => ({
  createAppCompositionRootPorts: (overrides: Record<string, unknown> = {}) => {
    const basePorts = {
      isTauriRuntime: () => false,
      readAvailableTerminals: mockState.readAvailableTerminals,
      scanUserCommandFiles: vi.fn(async () => ({ files: [], issues: [] })),
      readUserCommandFile: vi.fn(),
      readRuntimePlatform: vi.fn(async () => "windows"),
      getCurrentWindow: vi.fn(() => mockState.currentWindow)
    };
    const merged = { ...basePorts, ...overrides };
    mockState.createPorts(merged);
    return merged;
  }
}));

import { useLauncherEntry } from "../../app/useAppCompositionRoot/launcherEntry";
import { useLauncherSearch } from "../../launcher/useLauncherSearch";

function createStore() {
  const refs = {
    hotkeys: ref({ launcher: "Ctrl+K" }),
    pointerActions: ref({ leftClick: "execute", rightClick: "stage" }),
    defaultTerminal: ref("missing-terminal"),
    language: ref("zh-CN"),
    autoCheckUpdate: ref(true),
    launchAtLogin: ref(false),
    alwaysElevatedTerminal: ref(false),
    windowOpacity: ref(0.96),
    theme: ref("obsidian"),
    blurEnabled: ref(true),
    motionPreset: ref("expressive"),
    disabledCommandIds: ref<string[]>([])
  };

  const hydrateFromStorage = vi.fn(() => {
    refs.language.value = "en";
    refs.windowOpacity.value = 0.72;
    refs.defaultTerminal.value = "hydrated-terminal";
  });

  return {
    refs,
    hydrateFromStorage,
    persist: vi.fn(),
    setDefaultTerminal: vi.fn((value: string) => {
      refs.defaultTerminal.value = value;
    }),
    setHotkey: vi.fn()
  };
}

function runLauncherEntry(ports: Record<string, unknown> = {}) {
  const scope = effectScope();
  const entry = scope.run(() => useLauncherEntry({ ports }));
  if (!entry) {
    throw new Error("expected launcher entry to be created");
  }
  return {
    scope,
    entry,
    context: mockState.capturedContext as {
      settingsWindow: {
        loadAvailableTerminals: () => Promise<void>;
        initializeSettings: () => void;
        reloadSettings: () => void;
      };
      settingsSyncChannel: { value: BroadcastChannel | null };
    }
  };
}

function getStore() {
  if (!mockState.store) {
    throw new Error("settings store not initialized");
  }
  return mockState.store;
}

describe("useLauncherEntry", () => {
  beforeEach(() => {
    mockState.store = createStore();
    mockState.currentWindow = { label: "main" };
    mockState.capturedContext = null;
    mockState.readAvailableTerminals.mockReset();
    mockState.readAvailableTerminals.mockResolvedValue([]);
    mockState.resolveEffectiveTerminal.mockReset();
    mockState.resolveEffectiveTerminal.mockReturnValue({
      effectiveId: "missing-terminal",
      corrected: false
    });
    mockState.setAppLocale.mockReset();
    mockState.useTheme.mockReset();
    mockState.useMotionPreset.mockReset();
    mockState.scheduleSearchInputFocus.mockReset();
    mockState.createPorts.mockReset();
    mockState.createAppShellVm.mockClear();
    mockState.createLauncherVm.mockClear();
    mockState.createRuntime.mockClear();
    document.documentElement.style.removeProperty("--ui-opacity");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("在非 tauri 环境下回退到内置终端，但不把 fallback 当可信结果持久化", async () => {
    const store = getStore();
    mockState.resolveEffectiveTerminal.mockReturnValue({
      effectiveId: "fallback",
      corrected: true
    });

    const { scope, entry, context } = runLauncherEntry();
    const channel = {
      postMessage: vi.fn()
    } as unknown as BroadcastChannel;
    context.settingsSyncChannel.value = channel;

    await context.settingsWindow.loadAvailableTerminals();

    expect(mockState.readAvailableTerminals).not.toHaveBeenCalled();
    expect(entry.launcherCompatVm.availableTerminals.value).toEqual(mockState.fallbackTerminals);
    expect(store.setDefaultTerminal).not.toHaveBeenCalled();
    expect(store.persist).not.toHaveBeenCalled();
    expect(channel.postMessage).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mockState.resolveEffectiveTerminal.mockReturnValue({
      effectiveId: "hydrated-terminal",
      corrected: false
    });
    context.settingsWindow.reloadSettings();
    await nextTick();

    expect(store.hydrateFromStorage).toHaveBeenCalledTimes(1);
    expect(store.persist).not.toHaveBeenCalled();
    expect(store.setDefaultTerminal).not.toHaveBeenCalled();
    expect(store.refs.language.value).toBe("en");
    expect(store.refs.defaultTerminal.value).toBe("hydrated-terminal");

    scope.stop();
  });

  it("终端读取失败时回退到内置终端，并保留未纠正的默认值", async () => {
    const store = getStore();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const readAvailableTerminals = vi.fn(async () => {
      throw new Error("boom");
    });

    const { scope, entry, context } = runLauncherEntry({
      isTauriRuntime: () => true,
      readAvailableTerminals
    });
    const channel = {
      postMessage: vi.fn()
    } as unknown as BroadcastChannel;
    context.settingsSyncChannel.value = channel;

    await context.settingsWindow.loadAvailableTerminals();

    expect(readAvailableTerminals).toHaveBeenCalledTimes(1);
    expect(entry.launcherCompatVm.availableTerminals.value).toEqual(mockState.fallbackTerminals);
    expect(store.setDefaultTerminal).not.toHaveBeenCalled();
    expect(store.persist).not.toHaveBeenCalled();
    expect(channel.postMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "launcher terminal bootstrap failed; using fallback",
      expect.any(Error)
    );

    scope.stop();
  });

  it("tauri 返回非空终端列表时直接采用扫描结果", async () => {
    const store = getStore();
    const detectedTerminals = [
      { id: "pwsh", label: "PowerShell 7", path: "pwsh.exe" }
    ];
    const readAvailableTerminals = vi.fn(async () => detectedTerminals);

    const { scope, entry, context } = runLauncherEntry({
      isTauriRuntime: () => true,
      readAvailableTerminals
    });
    context.settingsSyncChannel.value = {
      postMessage: vi.fn()
    } as unknown as BroadcastChannel;

    await context.settingsWindow.loadAvailableTerminals();

    expect(readAvailableTerminals).toHaveBeenCalledTimes(1);
    expect(entry.launcherCompatVm.availableTerminals.value).toEqual(detectedTerminals);
    expect(store.setDefaultTerminal).not.toHaveBeenCalled();
    expect(store.persist).not.toHaveBeenCalled();

    scope.stop();
  });

  it("tauri 返回空终端列表时回退到内置终端", async () => {
    const store = getStore();
    const readAvailableTerminals = vi.fn(async () => []);

    const { scope, entry, context } = runLauncherEntry({
      isTauriRuntime: () => true,
      readAvailableTerminals
    });
    context.settingsSyncChannel.value = {
      postMessage: vi.fn()
    } as unknown as BroadcastChannel;

    await context.settingsWindow.loadAvailableTerminals();

    expect(readAvailableTerminals).toHaveBeenCalledTimes(1);
    expect(entry.launcherCompatVm.availableTerminals.value).toEqual(mockState.fallbackTerminals);
    expect(store.setDefaultTerminal).not.toHaveBeenCalled();
    expect(store.persist).not.toHaveBeenCalled();

    scope.stop();
  });

  it("将 command catalog 作为 launcher search 的唯一命令来源注入", () => {
    const { scope } = runLauncherEntry();

    expect(useLauncherSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        commandSource: expect.objectContaining({
          value: mockState.commandTemplateItems
        })
      })
    );

    scope.stop();
  });

  it("入口装配只执行一次 settings hydrate", () => {
    const { scope } = runLauncherEntry();

    expect(getStore().hydrateFromStorage).toHaveBeenCalledTimes(1);

    scope.stop();
  });
});
