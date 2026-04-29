import { ref, type Ref } from "vue";
import { t, type AppLocale } from "../../../i18n";
import { normalizeHotkey } from "../../../shared/hotkeys";
import type { HotkeyFieldDefinition, SettingsRoute } from "../../../features/settings/types";
import type { TerminalOption } from "../../../features/terminals/fallbackTerminals";
import type {
  HotkeyFieldId,
  PointerActionFieldId,
  PointerActionSettings,
  PersistedSettingsSnapshot,
  SearchResultPointerAction,
  TerminalReusePolicy
} from "../../../stores/settingsStore";

export interface HotkeyEntry extends HotkeyFieldDefinition {
  value: string;
}

interface SettingsStoreLike {
  persist: () => void;
  hydrateFromStorage: () => void;
  toSnapshot: () => PersistedSettingsSnapshot;
  applySnapshot: (snapshot: PersistedSettingsSnapshot) => void;
  setHotkey: (field: HotkeyFieldId, value: string) => void;
  setPointerAction: (field: PointerActionFieldId, action: SearchResultPointerAction) => void;
  setDefaultTerminal: (value: string) => void;
  setLanguage: (value: AppLocale) => void;
  setAutoCheckUpdate: (value: boolean) => void;
  setLaunchAtLogin: (value: boolean) => void;
  setAlwaysElevatedTerminal: (value: boolean) => void;
  setTerminalReusePolicy: (value: TerminalReusePolicy) => void;
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
  terminalReusePolicy: Ref<TerminalReusePolicy>;
  language: Ref<AppLocale>;
  autoCheckUpdate: Ref<boolean>;
  launchAtLogin: Ref<boolean>;
  alwaysElevatedTerminal: Ref<boolean>;
  pointerActions: Ref<PointerActionSettings>;
  settingsStore: SettingsStoreLike;
  getHotkeyValue: (field: HotkeyFieldId) => string;
  setHotkeyValue: (field: HotkeyFieldId, value: string) => void;
  isTauriRuntime: () => boolean;
  readAvailableTerminals: () => Promise<TerminalOption[]>;
  refreshAvailableTerminals: () => Promise<TerminalOption[]>;
  readAutoStartEnabled: () => Promise<boolean>;
  writeAutoStartEnabled: (enabled: boolean) => Promise<void>;
  writeLauncherHotkey: (value: string) => Promise<void>;
  fallbackTerminalOptions: () => TerminalOption[];
  broadcastSettingsUpdated: () => void;
}

export interface SettingsWindowState {
  availableTerminals: Ref<TerminalOption[]>;
  availableTerminalsTrusted: Ref<boolean>;
  terminalLoading: Ref<boolean>;
  launchAtLoginLoading: Ref<boolean>;
  launchAtLoginBaseline: Ref<boolean | null>;
  settingsRoute: Ref<SettingsRoute>;
  settingsError: Ref<string>;
  settingsErrorRoute: Ref<SettingsRoute | null>;
  settingsErrorHotkeyFieldIds: Ref<HotkeyFieldId[]>;
  settingsErrorPrimaryHotkeyField: Ref<HotkeyFieldId | null>;
  generalErrorMessage: Ref<string>;
}

export function createSettingsState(): SettingsWindowState {
  return {
    availableTerminals: ref([]),
    availableTerminalsTrusted: ref(false),
    terminalLoading: ref(false),
    launchAtLoginLoading: ref(false),
    launchAtLoginBaseline: ref(null),
    settingsRoute: ref("hotkeys"),
    settingsError: ref(""),
    settingsErrorRoute: ref(null),
    settingsErrorHotkeyFieldIds: ref([]),
    settingsErrorPrimaryHotkeyField: ref(null),
    generalErrorMessage: ref("")
  };
}
 
export function clearSettingsErrorState(state: SettingsWindowState): void {
  state.settingsError.value = "";
  state.settingsErrorRoute.value = null;
  state.settingsErrorHotkeyFieldIds.value = [];
  state.settingsErrorPrimaryHotkeyField.value = null;
  state.generalErrorMessage.value = "";
}

export function applySettingsValidationIssue(
  state: SettingsWindowState,
  issue: SettingsValidationIssue
): void {
  state.settingsError.value = issue.message;
  state.settingsErrorRoute.value = issue.route;
  state.settingsErrorHotkeyFieldIds.value = issue.hotkeyFieldIds ?? [];
  state.settingsErrorPrimaryHotkeyField.value = issue.primaryHotkeyField ?? null;
  state.generalErrorMessage.value = issue.route === "general" ? issue.message : "";
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
