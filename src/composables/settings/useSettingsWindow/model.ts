import { ref, type Ref } from "vue";
import { t, type AppLocale } from "../../../i18n";
import { normalizeHotkey } from "../../../shared/hotkeys";
import type { HotkeyFieldDefinition, SettingsRoute } from "../../../features/settings/types";
import type { TerminalOption } from "../../../features/terminals/fallbackTerminals";
import type { HotkeyFieldId } from "../../../stores/settingsStore";

export interface HotkeyEntry extends HotkeyFieldDefinition {
  value: string;
}

interface SettingsStoreLike {
  persist: () => void;
  hydrateFromStorage: () => void;
}

export interface UseSettingsWindowOptions {
  settingsHashPrefix: string;
  hotkeyDefinitions: HotkeyFieldDefinition[];
  isSettingsWindow: Ref<boolean>;
  defaultTerminal: Ref<string>;
  language: Ref<AppLocale>;
  autoCheckUpdate: Ref<boolean>;
  launchAtLogin: Ref<boolean>;
  settingsStore: SettingsStoreLike;
  getHotkeyValue: (field: HotkeyFieldId) => string;
  setHotkeyValue: (field: HotkeyFieldId, value: string) => void;
  isTauriRuntime: () => boolean;
  readAvailableTerminals: () => Promise<TerminalOption[]>;
  readAutoStartEnabled: () => Promise<boolean>;
  writeAutoStartEnabled: (enabled: boolean) => Promise<void>;
  writeLauncherHotkey: (value: string) => Promise<void>;
  fallbackTerminalOptions: () => TerminalOption[];
  broadcastSettingsUpdated: () => void;
}

export interface SettingsWindowState {
  availableTerminals: Ref<TerminalOption[]>;
  terminalLoading: Ref<boolean>;
  terminalDropdownOpen: Ref<boolean>;
  terminalFocusIndex: Ref<number>;
  launchAtLoginLoading: Ref<boolean>;
  launchAtLoginBaseline: Ref<boolean | null>;
  settingsRoute: Ref<SettingsRoute>;
  recordingHotkeyField: Ref<HotkeyFieldId | null>;
  settingsError: Ref<string>;
  settingsSaved: Ref<boolean>;
}

export function createSettingsState(): SettingsWindowState {
  return {
    availableTerminals: ref([]),
    terminalLoading: ref(false),
    terminalDropdownOpen: ref(false),
    terminalFocusIndex: ref(-1),
    launchAtLoginLoading: ref(false),
    launchAtLoginBaseline: ref(null),
    settingsRoute: ref("hotkeys"),
    recordingHotkeyField: ref(null),
    settingsError: ref(""),
    settingsSaved: ref(false)
  };
}

export function getHotkeyEntries(options: UseSettingsWindowOptions): HotkeyEntry[] {
  return options.hotkeyDefinitions.map((field) => ({
    id: field.id,
    label: t(`settings.hotkeys.fields.${field.id}`),
    scope: field.scope,
    value: normalizeHotkey(options.getHotkeyValue(field.id))
  }));
}

export function getDuplicateHotkeyConflict(entries: HotkeyEntry[]): string | null {
  const map = new Map<string, HotkeyEntry[]>();
  for (const entry of entries) {
    if (!entry.value) {
      continue;
    }
    const key = entry.value.toLowerCase();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(entry);
  }

  for (const [hotkey, list] of map.entries()) {
    if (list.length < 2) {
      continue;
    }
    const labels = list.map((item) => item.label).join(", ");
    return t("settings.error.duplicateHotkey", { hotkey, labels });
  }

  return null;
}

export function tryResolveRouteFromHash(
  settingsHashPrefix: string,
  hash: string
): SettingsRoute | null {
  const prefix = settingsHashPrefix.toLowerCase();
  const normalizedHash = hash.toLowerCase();
  if (!normalizedHash.startsWith(prefix)) {
    return null;
  }
  const route = normalizedHash.slice(prefix.length);
  if (
    route === "hotkeys" ||
    route === "general" ||
    route === "commands" ||
    route === "appearance" ||
    route === "about"
  ) {
    return route;
  }
  return null;
}
