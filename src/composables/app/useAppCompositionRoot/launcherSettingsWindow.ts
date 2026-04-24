import type { Ref } from "vue";
import {
  fallbackTerminalOptions,
  type TerminalOption
} from "../../../features/terminals/fallbackTerminals";
import { resolveEffectiveTerminal } from "../../../features/terminals/resolveEffectiveTerminal";

interface LauncherSettingsStore {
  persist: () => void;
  hydrateFromStorage: () => void;
  setDefaultTerminal: (value: string) => void;
}

interface LauncherSettingsWindowPorts {
  isTauriRuntime: () => boolean;
  readAvailableTerminals: () => Promise<TerminalOption[]>;
}

export interface CreateLauncherSettingsWindowOptions {
  ports: LauncherSettingsWindowPorts;
  settingsStore: LauncherSettingsStore;
  defaultTerminal: Ref<string>;
  availableTerminals: Ref<TerminalOption[]>;
  terminalLoading: Ref<boolean>;
  settingsSyncChannel: Ref<BroadcastChannel | null>;
}

/**
 * 把设置持久化与跨窗口广播绑成一个原子动作，避免主窗口与设置窗口分叉更新。
 */
export function createSettingsSyncBroadcaster(
  settingsStore: LauncherSettingsStore,
  settingsSyncChannel: Ref<BroadcastChannel | null>
) {
  return () => {
    settingsStore.persist();
    settingsSyncChannel.value?.postMessage({ type: "settings-updated" });
  };
}

/**
 * 统一按当前可用终端纠正默认终端；只有真的发生纠正时才返回 true。
 */
export function ensureDefaultTerminal(params: Pick<
  CreateLauncherSettingsWindowOptions,
  "defaultTerminal" | "availableTerminals" | "settingsStore"
>): boolean {
  const resolution = resolveEffectiveTerminal(
    params.defaultTerminal.value,
    params.availableTerminals.value,
    fallbackTerminalOptions()
  );
  if (!resolution.effectiveId || !resolution.corrected) {
    return false;
  }
  params.settingsStore.setDefaultTerminal(resolution.effectiveId);
  return true;
}

/**
 * Launcher 主窗口只暴露最小设置窗口桥接能力，不装配完整 settings scene。
 */
export function createLauncherSettingsWindow(options: CreateLauncherSettingsWindowOptions) {
  const broadcastPersistedSettings = createSettingsSyncBroadcaster(
    options.settingsStore,
    options.settingsSyncChannel
  );

  async function loadAvailableTerminals(): Promise<void> {
    options.terminalLoading.value = true;
    try {
      if (!options.ports.isTauriRuntime()) {
        options.availableTerminals.value = fallbackTerminalOptions();
      } else {
        const terminals = await options.ports.readAvailableTerminals();
        options.availableTerminals.value =
          Array.isArray(terminals) && terminals.length > 0
            ? terminals
            : fallbackTerminalOptions();
      }
      if (ensureDefaultTerminal(options)) {
        broadcastPersistedSettings();
      }
    } catch (error) {
      console.warn("launcher terminal bootstrap failed; using fallback", error);
      options.availableTerminals.value = fallbackTerminalOptions();
      if (ensureDefaultTerminal(options)) {
        broadcastPersistedSettings();
      }
    } finally {
      options.terminalLoading.value = false;
    }
  }

  return {
    availableTerminals: options.availableTerminals,
    terminalLoading: options.terminalLoading,
    loadSettings(): void {
      if (
        options.availableTerminals.value.length > 0 &&
        ensureDefaultTerminal(options)
      ) {
        broadcastPersistedSettings();
      }
    },
    loadAvailableTerminals,
    applySettingsRouteFromHash(): void {},
    onSettingsHashChange(): void {},
    onGlobalPointerDown(_event: PointerEvent): void {}
  };
}

export type LauncherSettingsWindow = ReturnType<typeof createLauncherSettingsWindow>;
