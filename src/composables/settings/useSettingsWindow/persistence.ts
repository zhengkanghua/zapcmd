import type { HotkeyFieldId } from "../../../stores/settingsStore";
import { t } from "../../../i18n";
import { normalizeHotkey } from "../../../shared/hotkeys";
import {
  applySettingsValidationIssue,
  clearSettingsErrorState,
  getDuplicateHotkeyIssue,
  getHotkeyEntries,
  type HotkeyEntry,
  type SettingsValidationIssue,
  type UseSettingsWindowOptions,
  type SettingsWindowState
} from "./model";

function resolveSettingsError(error: unknown, fallbackKey: string): string {
  return error instanceof Error && error.message ? error.message : t(fallbackKey);
}

function getHotkeyEntriesWithOverride(params: {
  options: UseSettingsWindowOptions;
  fieldId: HotkeyFieldId;
  value: string;
}): HotkeyEntry[] {
  const entries = getHotkeyEntries(params.options);
  return entries.map((entry) =>
    entry.id === params.fieldId ? { ...entry, value: normalizeHotkey(params.value) } : entry
  );
}

function validateSingleHotkeyChange(params: {
  entries: HotkeyEntry[];
  fieldId: HotkeyFieldId;
}): SettingsValidationIssue | null {
  const updated = params.entries.find((entry) => entry.id === params.fieldId) ?? null;
  if (!updated) {
    return null;
  }

  if (!updated.value && !updated.optional) {
    return {
      message: t("settings.error.emptyHotkey", { label: updated.label }),
      route: "hotkeys",
      hotkeyFieldIds: [updated.id],
      primaryHotkeyField: updated.id
    };
  }

  return getDuplicateHotkeyIssue(params.entries, params.fieldId);
}

export interface InstantPersistenceActions {
  persistSetting: () => Promise<void>;
  loadSettings: () => void;
  applyHotkeyChange: (fieldId: HotkeyFieldId, value: string) => Promise<void>;
  applyAutoStartChange: (enabled: boolean) => Promise<void>;
}

export function createPersistenceActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  ensureDefaultTerminal?: () => void;
  loadAutoStartEnabled?: () => Promise<void>;
}): InstantPersistenceActions {
  const { options, state } = deps;

  async function persistSetting(): Promise<void> {
    clearSettingsErrorState(state);

    try {
      options.settingsStore.persist();
    } catch (error) {
      applySettingsValidationIssue(state, {
        message: resolveSettingsError(error, "settings.error.persistSettingsFailed"),
        route: null
      });
      return;
    }

    try {
      options.broadcastSettingsUpdated();
    } catch (error) {
      applySettingsValidationIssue(state, {
        message: resolveSettingsError(error, "settings.error.broadcastSettingsFailed"),
        route: null
      });
    }
  }

  function loadSettings(): void {
    options.settingsStore.hydrateFromStorage();
    deps.ensureDefaultTerminal?.();
    void deps.loadAutoStartEnabled?.();
    clearSettingsErrorState(state);
  }

  async function applyHotkeyChange(fieldId: HotkeyFieldId, value: string): Promise<void> {
    clearSettingsErrorState(state);

    const oldValue = options.getHotkeyValue(fieldId);
    options.setHotkeyValue(fieldId, value);

    const entries = getHotkeyEntriesWithOverride({ options, fieldId, value });
    const issue = validateSingleHotkeyChange({ entries, fieldId });
    if (issue) {
      applySettingsValidationIssue(state, issue);
      return;
    }

    options.settingsStore.setHotkey(fieldId, value);

    if (options.isTauriRuntime() && fieldId === "launcher") {
      try {
        await options.writeLauncherHotkey(value);
      } catch (error) {
        options.setHotkeyValue(fieldId, oldValue);
        options.settingsStore.setHotkey(fieldId, oldValue);
        applySettingsValidationIssue(state, {
          message: resolveSettingsError(error, "settings.error.updateLauncherHotkeyFailed"),
          route: "hotkeys"
        });
        return;
      }
    }

    await persistSetting();
  }

  async function applyAutoStartChange(enabled: boolean): Promise<void> {
    clearSettingsErrorState(state);

    const oldValue = options.launchAtLogin.value;
    options.launchAtLogin.value = enabled;
    options.settingsStore.setLaunchAtLogin(enabled);

    if (options.isTauriRuntime()) {
      try {
        await options.writeAutoStartEnabled(enabled);
      } catch (error) {
        options.launchAtLogin.value = oldValue;
        options.settingsStore.setLaunchAtLogin(oldValue);
        applySettingsValidationIssue(state, {
          message: resolveSettingsError(error, "settings.error.updateLaunchAtLoginFailed"),
          route: "general"
        });
        return;
      }
    }

    await persistSetting();
  }

  return {
    persistSetting,
    loadSettings,
    applyHotkeyChange,
    applyAutoStartChange
  };
}
