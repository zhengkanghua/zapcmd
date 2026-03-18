import { normalizeAppLocale, type AppLocale } from "../../../i18n";
import { clearSettingsErrorState, type SettingsWindowState, type UseSettingsWindowOptions } from "./model";

export interface TerminalActions {
  ensureDefaultTerminal: () => void;
  selectTerminalOption: (id: string) => void;
  selectLanguageOption: (locale: AppLocale) => void;
  onGlobalPointerDown: (event: PointerEvent) => void;
  loadAvailableTerminals: () => Promise<void>;
}

export function createTerminalActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  cancelHotkeyRecording: () => void;
  persistSetting: () => Promise<void>;
}): TerminalActions {
  const { options, state, cancelHotkeyRecording, persistSetting } = deps;

  function ensureDefaultTerminal(): void {
    if (state.availableTerminals.value.length === 0) {
      return;
    }
    const exists = state.availableTerminals.value.some((item) => item.id === options.defaultTerminal.value);
    if (!exists) {
      options.defaultTerminal.value = state.availableTerminals.value[0].id;
    }
  }

  function selectTerminalOption(id: string): void {
    options.defaultTerminal.value = id;
    clearSettingsErrorState(state);
    void persistSetting();
  }

  function selectLanguageOption(locale: AppLocale): void {
    options.language.value = normalizeAppLocale(locale);
    clearSettingsErrorState(state);
    void persistSetting();
  }

  function onGlobalPointerDown(event: PointerEvent): void {
    if (state.recordingHotkeyField.value) {
      if (!(event.target instanceof Element) || !event.target.closest(".hotkey-recorder")) {
        cancelHotkeyRecording();
      }
    }
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
      ensureDefaultTerminal();
    } catch (error) {
      console.warn("loadAvailableTerminals failed; using fallback", error);
      state.availableTerminals.value = options.fallbackTerminalOptions();
      ensureDefaultTerminal();
    } finally {
      state.terminalLoading.value = false;
    }
  }

  return {
    ensureDefaultTerminal,
    selectTerminalOption,
    selectLanguageOption,
    onGlobalPointerDown,
    loadAvailableTerminals
  };
}
