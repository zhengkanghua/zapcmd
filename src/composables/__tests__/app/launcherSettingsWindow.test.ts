import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLauncherSettingsWindow } from "../../app/useAppCompositionRoot/launcherSettingsWindow";

const mockState = vi.hoisted(() => ({
  fallbackTerminals: [
    { id: "fallback", label: "Fallback Terminal", path: "/bin/fallback" }
  ],
  resolveEffectiveTerminal: vi.fn()
}));

vi.mock("../../../features/terminals/fallbackTerminals", () => ({
  fallbackTerminalOptions: vi.fn(() => mockState.fallbackTerminals)
}));

vi.mock("../../../features/terminals/resolveEffectiveTerminal", () => ({
  resolveEffectiveTerminal: mockState.resolveEffectiveTerminal
}));

function createStore() {
  return {
    hydrateFromStorage: vi.fn(),
    persist: vi.fn(),
    setDefaultTerminal: vi.fn()
  };
}

describe("createLauncherSettingsWindow", () => {
  beforeEach(() => {
    mockState.resolveEffectiveTerminal.mockReset();
  });

  it("uses fallback terminals in non-tauri mode without persisting corrected default terminal", async () => {
    const settingsStore = createStore();
    const settingsSyncChannel = ref<BroadcastChannel | null>({
      postMessage: vi.fn()
    } as unknown as BroadcastChannel);
    const availableTerminals = ref<Array<{ id: string; label: string; path: string }>>([]);
    const availableTerminalsTrusted = ref(false);
    const terminalLoading = ref(false);
    const defaultTerminal = ref("missing-terminal");
    mockState.resolveEffectiveTerminal.mockReturnValue({
      effectiveId: "fallback",
      corrected: true
    });

    const settingsWindow = createLauncherSettingsWindow({
      ports: {
        isTauriRuntime: () => false,
        readAvailableTerminals: vi.fn(async () => [])
      },
      settingsStore,
      defaultTerminal,
      availableTerminals,
      availableTerminalsTrusted,
      terminalLoading,
      settingsSyncChannel
    });

    await settingsWindow.loadAvailableTerminals();

    expect(availableTerminals.value).toEqual(mockState.fallbackTerminals);
    expect(availableTerminalsTrusted.value).toBe(false);
    expect(settingsStore.setDefaultTerminal).not.toHaveBeenCalled();
    expect(settingsStore.persist).not.toHaveBeenCalled();
    expect(settingsSyncChannel.value?.postMessage).not.toHaveBeenCalled();
  });

  it("does not persist corrected terminal when tauri terminal bootstrap falls back after a read failure", async () => {
    const settingsStore = createStore();
    const settingsSyncChannel = ref<BroadcastChannel | null>({
      postMessage: vi.fn()
    } as unknown as BroadcastChannel);
    const availableTerminals = ref<Array<{ id: string; label: string; path: string }>>([]);
    const availableTerminalsTrusted = ref(false);
    const terminalLoading = ref(false);
    const defaultTerminal = ref("missing-terminal");
    mockState.resolveEffectiveTerminal.mockReturnValue({
      effectiveId: "fallback",
      corrected: true
    });

    const settingsWindow = createLauncherSettingsWindow({
      ports: {
        isTauriRuntime: () => true,
        readAvailableTerminals: vi.fn(async () => {
          throw new Error("boom");
        })
      },
      settingsStore,
      defaultTerminal,
      availableTerminals,
      availableTerminalsTrusted,
      terminalLoading,
      settingsSyncChannel
    });

    await settingsWindow.loadAvailableTerminals();

    expect(availableTerminals.value).toEqual(mockState.fallbackTerminals);
    expect(settingsStore.setDefaultTerminal).not.toHaveBeenCalled();
    expect(settingsStore.persist).not.toHaveBeenCalled();
    expect(settingsSyncChannel.value?.postMessage).not.toHaveBeenCalled();
  });

  it("does not crash when corrected terminal persistence throws during bootstrap", async () => {
    const settingsStore = createStore();
    settingsStore.persist.mockImplementation(() => {
      throw new Error("persist blocked");
    });
    const postMessage = vi.fn();
    const settingsSyncChannel = ref<BroadcastChannel | null>({
      postMessage
    } as unknown as BroadcastChannel);
    const availableTerminals = ref<Array<{ id: string; label: string; path: string }>>([]);
    const availableTerminalsTrusted = ref(false);
    const terminalLoading = ref(false);
    const defaultTerminal = ref("missing-terminal");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockState.resolveEffectiveTerminal.mockReturnValue({
      effectiveId: "powershell",
      corrected: true
    });

    const settingsWindow = createLauncherSettingsWindow({
      ports: {
        isTauriRuntime: () => true,
        readAvailableTerminals: vi.fn(async () => [
          { id: "powershell", label: "PowerShell", path: "powershell.exe" }
        ])
      },
      settingsStore,
      defaultTerminal,
      availableTerminals,
      availableTerminalsTrusted,
      terminalLoading,
      settingsSyncChannel
    });

    await expect(settingsWindow.loadAvailableTerminals()).resolves.toBeUndefined();
    expect(settingsStore.setDefaultTerminal).toHaveBeenCalledWith("powershell");
    expect(postMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "launcher settings sync broadcast failed",
      expect.any(Error)
    );
    warnSpy.mockRestore();
  });
});
