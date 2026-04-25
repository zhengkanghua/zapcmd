import { normalizeAppLocale, type AppLocale } from "../../../i18n";
import { resolveEffectiveTerminal } from "../../../features/terminals/resolveEffectiveTerminal";
import { clearSettingsErrorState, type SettingsWindowState, type UseSettingsWindowOptions } from "./model";

export interface TerminalActions {
  ensureDefaultTerminal: () => boolean;
  selectTerminalOption: (id: string) => void;
  selectLanguageOption: (locale: AppLocale) => void;
  onGlobalPointerDown: (event: PointerEvent) => void;
  loadAvailableTerminals: () => Promise<void>;
  refreshAvailableTerminals: () => Promise<void>;
}

export function createTerminalActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  persistSetting: () => Promise<void>;
}): TerminalActions {
  const { options, state, persistSetting } = deps;

  function ensureDefaultTerminal(): boolean {
    const resolution = resolveEffectiveTerminal(
      options.defaultTerminal.value,
      state.availableTerminals.value,
      options.fallbackTerminalOptions()
    );
    if (!resolution.effectiveId || !resolution.corrected) {
      return false;
    }

    options.settingsStore.setDefaultTerminal(resolution.effectiveId);
    return true;
  }

  function selectTerminalOption(id: string): void {
    options.settingsStore.setDefaultTerminal(id);
    clearSettingsErrorState(state);
    void persistSetting();
  }

  function selectLanguageOption(locale: AppLocale): void {
    options.settingsStore.setLanguage(normalizeAppLocale(locale));
    clearSettingsErrorState(state);
    void persistSetting();
  }

  function onGlobalPointerDown(event: PointerEvent): void {
    void event;
  }

  async function loadAvailableTerminals(): Promise<void> {
    state.terminalLoading.value = true;
    try {
      if (!options.isTauriRuntime()) {
        state.availableTerminals.value = options.fallbackTerminalOptions();
      } else {
        const terminals = await options.readAvailableTerminals();
        state.availableTerminals.value =
          Array.isArray(terminals) && terminals.length > 0
            ? terminals
            : options.fallbackTerminalOptions();
      }
      if (ensureDefaultTerminal()) {
        await persistSetting();
      }
    } catch (error) {
      console.warn("loadAvailableTerminals failed; using fallback", error);
      state.availableTerminals.value = options.fallbackTerminalOptions();
      if (ensureDefaultTerminal()) {
        await persistSetting();
      }
    } finally {
      state.terminalLoading.value = false;
    }
  }

  async function refreshAvailableTerminals(): Promise<void> {
    state.terminalLoading.value = true;
    try {
      if (!options.isTauriRuntime()) {
        state.availableTerminals.value = options.fallbackTerminalOptions();
      } else {
        const terminals = await options.refreshAvailableTerminals();
        state.availableTerminals.value =
          Array.isArray(terminals) && terminals.length > 0
            ? terminals
            : options.fallbackTerminalOptions();
      }

      if (ensureDefaultTerminal()) {
        await persistSetting();
      }
    } catch (error) {
      console.warn("refreshAvailableTerminals failed", error);
      state.availableTerminals.value = options.fallbackTerminalOptions();
      if (ensureDefaultTerminal()) {
        await persistSetting();
      }
    } finally {
      state.terminalLoading.value = false;
    }
  }

  return {
    ensureDefaultTerminal,
    selectTerminalOption,
    selectLanguageOption,
    onGlobalPointerDown,
    loadAvailableTerminals,
    refreshAvailableTerminals
  };
}
