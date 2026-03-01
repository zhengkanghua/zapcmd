import { normalizeAppLocale, type AppLocale } from "../../../i18n";
import type { SettingsWindowState, UseSettingsWindowOptions } from "./model";

export interface TerminalActions {
  ensureDefaultTerminal: () => void;
  closeTerminalDropdown: () => void;
  toggleTerminalDropdown: () => void;
  selectTerminalOption: (id: string) => void;
  selectLanguageOption: (locale: AppLocale) => void;
  onGlobalPointerDown: (event: PointerEvent) => void;
  loadAvailableTerminals: () => Promise<void>;
}

export function createTerminalActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  cancelHotkeyRecording: () => void;
}): TerminalActions {
  const { options, state, cancelHotkeyRecording } = deps;

  function ensureDefaultTerminal(): void {
    if (state.availableTerminals.value.length === 0) {
      return;
    }
    const exists = state.availableTerminals.value.some((item) => item.id === options.defaultTerminal.value);
    if (!exists) {
      options.defaultTerminal.value = state.availableTerminals.value[0].id;
    }
  }

  function closeTerminalDropdown(): void {
    state.terminalDropdownOpen.value = false;
    state.terminalFocusIndex.value = -1;
  }

  function toggleTerminalDropdown(): void {
    if (state.terminalLoading.value || state.availableTerminals.value.length === 0) {
      return;
    }
    if (state.terminalDropdownOpen.value) {
      closeTerminalDropdown();
      return;
    }

    state.terminalDropdownOpen.value = true;
    const selectedIndex = state.availableTerminals.value.findIndex(
      (item) => item.id === options.defaultTerminal.value
    );
    state.terminalFocusIndex.value = selectedIndex >= 0 ? selectedIndex : 0;
  }

  function selectTerminalOption(id: string): void {
    options.defaultTerminal.value = id;
    const selectedIndex = state.availableTerminals.value.findIndex((item) => item.id === id);
    state.terminalFocusIndex.value = selectedIndex >= 0 ? selectedIndex : -1;
    state.terminalDropdownOpen.value = false;
    state.settingsSaved.value = false;
  }

  function selectLanguageOption(locale: AppLocale): void {
    options.language.value = normalizeAppLocale(locale);
    state.settingsSaved.value = false;
  }

  function onGlobalPointerDown(event: PointerEvent): void {
    if (state.recordingHotkeyField.value) {
      if (!(event.target instanceof Element) || !event.target.closest(".hotkey-recorder")) {
        cancelHotkeyRecording();
      }
    }

    if (!state.terminalDropdownOpen.value) {
      return;
    }
    if (!(event.target instanceof Element)) {
      closeTerminalDropdown();
      return;
    }
    if (!event.target.closest(".settings-select-wrap")) {
      closeTerminalDropdown();
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
    closeTerminalDropdown,
    toggleTerminalDropdown,
    selectTerminalOption,
    selectLanguageOption,
    onGlobalPointerDown,
    loadAvailableTerminals
  };
}
