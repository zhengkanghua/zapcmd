import { ref, type Ref } from "vue";
import { t, type AppLocale } from "../../../i18n";
import { normalizeHotkey } from "../../../shared/hotkeys";
import type { HotkeyFieldDefinition, SettingsRoute } from "../../../features/settings/types";
import type { TerminalOption } from "../../../features/terminals/fallbackTerminals";
import type { HotkeyFieldId, PersistedSettingsSnapshot } from "../../../stores/settingsStore";

export interface HotkeyEntry extends HotkeyFieldDefinition {
  value: string;
}

interface SettingsStoreLike {
  persist: () => void;
  hydrateFromStorage: () => void;
  toSnapshot: () => PersistedSettingsSnapshot;
  applySnapshot: (snapshot: PersistedSettingsSnapshot) => void;
}

export interface SettingsValidationIssue {
  message: string;
  route: SettingsRoute | null;
  hotkeyFieldIds?: HotkeyFieldId[];
  primaryHotkeyField?: HotkeyFieldId | null;
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
  closeConfirmOpen: Ref<boolean>;
  settingsRoute: Ref<SettingsRoute>;
  recordingHotkeyField: Ref<HotkeyFieldId | null>;
  settingsError: Ref<string>;
  settingsErrorRoute: Ref<SettingsRoute | null>;
  settingsErrorHotkeyFields: Ref<HotkeyFieldId[]>;
  settingsErrorPrimaryHotkeyField: Ref<HotkeyFieldId | null>;
  settingsSaved: Ref<boolean>;
  settingsDirty: Ref<boolean>;
  lastEditedHotkeyField: Ref<HotkeyFieldId | null>;
  settingsBaselineSnapshot: Ref<PersistedSettingsSnapshot | null>;
}

export function createSettingsState(): SettingsWindowState {
  return {
    availableTerminals: ref([]),
    terminalLoading: ref(false),
    terminalDropdownOpen: ref(false),
    terminalFocusIndex: ref(-1),
    launchAtLoginLoading: ref(false),
    launchAtLoginBaseline: ref(null),
    closeConfirmOpen: ref(false),
    settingsRoute: ref("hotkeys"),
    recordingHotkeyField: ref(null),
    settingsError: ref(""),
    settingsErrorRoute: ref(null),
    settingsErrorHotkeyFields: ref([]),
    settingsErrorPrimaryHotkeyField: ref(null),
    settingsSaved: ref(false),
    settingsDirty: ref(false),
    lastEditedHotkeyField: ref(null),
    settingsBaselineSnapshot: ref(null)
  };
}

export function markSettingsDirty(state: SettingsWindowState): void {
  state.settingsDirty.value = true;
  state.settingsSaved.value = false;
}

export function resetSettingsDirty(state: SettingsWindowState): void {
  state.settingsDirty.value = false;
}

export function clearSettingsErrorState(state: SettingsWindowState): void {
  state.settingsError.value = "";
  state.settingsErrorRoute.value = null;
  state.settingsErrorHotkeyFields.value = [];
  state.settingsErrorPrimaryHotkeyField.value = null;
}

export function applySettingsValidationIssue(
  state: SettingsWindowState,
  issue: SettingsValidationIssue
): void {
  state.settingsError.value = issue.message;
  state.settingsErrorRoute.value = issue.route;
  state.settingsErrorHotkeyFields.value = issue.hotkeyFieldIds ?? [];
  state.settingsErrorPrimaryHotkeyField.value = issue.primaryHotkeyField ?? null;
}

export function syncSettingsBaseline(
  state: SettingsWindowState,
  options: UseSettingsWindowOptions
): void {
  state.settingsBaselineSnapshot.value = options.settingsStore.toSnapshot();
  resetSettingsDirty(state);
}

export function restoreSettingsBaseline(
  state: SettingsWindowState,
  options: UseSettingsWindowOptions
): void {
  if (!state.settingsBaselineSnapshot.value) {
    return;
  }
  options.settingsStore.applySnapshot(state.settingsBaselineSnapshot.value);
  resetSettingsDirty(state);
}

export function hasUnsavedSettingsChanges(
  state: SettingsWindowState,
  _options: UseSettingsWindowOptions
): boolean {
  return state.settingsDirty.value;
}

export function getHotkeyEntries(options: UseSettingsWindowOptions): HotkeyEntry[] {
  return options.hotkeyDefinitions.map((field) => ({
    id: field.id,
    label: t(`settings.hotkeys.fields.${field.id}`),
    scope: field.scope,
    optional: field.optional,
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

export function getDuplicateHotkeyIssue(
  entries: HotkeyEntry[],
  preferredField: HotkeyFieldId | null
): SettingsValidationIssue | null {
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
    const hotkeyFieldIds = list.map((item) => item.id);
    const primaryHotkeyField =
      preferredField && hotkeyFieldIds.includes(preferredField)
        ? preferredField
        : hotkeyFieldIds[hotkeyFieldIds.length - 1] ?? null;

    return {
      message: t("settings.error.duplicateHotkey", { hotkey, labels }),
      route: "hotkeys",
      hotkeyFieldIds,
      primaryHotkeyField
    };
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
