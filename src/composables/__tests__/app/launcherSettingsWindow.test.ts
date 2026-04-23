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

  it("uses fallback terminals and broadcasts persistence when default terminal is corrected", async () => {
    const settingsStore = createStore();
    const settingsSyncChannel = ref<BroadcastChannel | null>({
      postMessage: vi.fn()
    } as unknown as BroadcastChannel);
    const availableTerminals = ref<Array<{ id: string; label: string; path: string }>>([]);
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
      terminalLoading,
      settingsSyncChannel
    });

    await settingsWindow.loadAvailableTerminals();

    expect(availableTerminals.value).toEqual(mockState.fallbackTerminals);
    expect(settingsStore.setDefaultTerminal).toHaveBeenCalledWith("fallback");
    expect(settingsStore.persist).toHaveBeenCalledTimes(1);
    expect(settingsSyncChannel.value?.postMessage).toHaveBeenCalledWith({
      type: "settings-updated"
    });
  });
});
