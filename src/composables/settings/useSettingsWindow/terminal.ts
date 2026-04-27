import { normalizeAppLocale, type AppLocale } from "../../../i18n";
import { resolveEffectiveTerminal } from "../../../features/terminals/resolveEffectiveTerminal";
import { clearSettingsErrorState, type SettingsWindowState, type UseSettingsWindowOptions } from "./model";

export interface TerminalActions {
  ensureDefaultTerminal: (options?: { allowPersist?: boolean }) => boolean;
  selectTerminalOption: (id: string) => void;
  selectLanguageOption: (locale: AppLocale) => void;
  onGlobalPointerDown: (event: PointerEvent) => void;
  loadAvailableTerminals: () => Promise<void>;
  refreshAvailableTerminals: () => Promise<void>;
}

export function createTerminalActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  persistSetting: (options?: { clearErrors?: boolean }) => Promise<void>;
}): TerminalActions {
  const { options, state, persistSetting } = deps;

  function ensureDefaultTerminal(
    ensureOptions: { allowPersist?: boolean } = {}
  ): boolean {
    if (ensureOptions.allowPersist === false) {
      return false;
    }
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
        state.availableTerminalsTrusted.value = true;
      } else {
        const terminals = await options.readAvailableTerminals();
        const trusted = Array.isArray(terminals) && terminals.length > 0;
        state.availableTerminals.value = trusted
          ? terminals
          : options.fallbackTerminalOptions();
        state.availableTerminalsTrusted.value = trusted;
      }
      if (ensureDefaultTerminal({ allowPersist: state.availableTerminalsTrusted.value })) {
        await persistSetting({ clearErrors: false });
      }
    } catch (error) {
      console.warn("loadAvailableTerminals failed; using fallback", error);
      state.availableTerminals.value = options.fallbackTerminalOptions();
      state.availableTerminalsTrusted.value = false;
      if (ensureDefaultTerminal({ allowPersist: false })) {
        await persistSetting({ clearErrors: false });
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
        state.availableTerminalsTrusted.value = true;
      } else {
        const terminals = await options.refreshAvailableTerminals();
        const trusted = Array.isArray(terminals) && terminals.length > 0;
        state.availableTerminals.value = trusted
          ? terminals
          : options.fallbackTerminalOptions();
        state.availableTerminalsTrusted.value = trusted;
      }

      if (ensureDefaultTerminal({ allowPersist: state.availableTerminalsTrusted.value })) {
        await persistSetting({ clearErrors: false });
      }
    } catch (error) {
      console.warn("refreshAvailableTerminals failed", error);
      state.availableTerminals.value = options.fallbackTerminalOptions();
      state.availableTerminalsTrusted.value = false;
      if (ensureDefaultTerminal({ allowPersist: false })) {
        await persistSetting({ clearErrors: false });
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
