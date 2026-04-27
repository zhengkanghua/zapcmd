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
  persistSetting: (options?: { clearErrors?: boolean }) => Promise<void>;
  loadSettings: () => void;
  applyHotkeyChange: (fieldId: HotkeyFieldId, value: string) => Promise<void>;
  applyAutoStartChange: (enabled: boolean) => Promise<void>;
}

export function createPersistenceActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  ensureDefaultTerminal?: (options?: { allowPersist?: boolean }) => boolean;
  loadAutoStartEnabled?: () => Promise<void>;
}): InstantPersistenceActions {
  const { options, state } = deps;

  /**
   * 统一持久化 settings，并允许初始化同步场景保留现有校验错误态。
   * 这样挂载期的补偿写回不会把用户刚触发的冲突提示抹掉。
   */
  async function persistSetting(persistOptions: { clearErrors?: boolean } = {}): Promise<void> {
    if (persistOptions.clearErrors ?? true) {
      clearSettingsErrorState(state);
    }

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
    const corrected =
      deps.ensureDefaultTerminal?.({
        allowPersist: state.availableTerminalsTrusted.value
      }) ?? false;
    clearSettingsErrorState(state);
    if (corrected) {
      void persistSetting({ clearErrors: false });
    }
    void deps.loadAutoStartEnabled?.();
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
          route: "hotkeys",
          hotkeyFieldIds: [fieldId],
          primaryHotkeyField: fieldId
        });
        return;
      }
    }

    await persistSetting();
  }

  async function applyAutoStartChange(enabled: boolean): Promise<void> {
    clearSettingsErrorState(state);

    const oldValue = options.launchAtLogin.value;
    options.settingsStore.setLaunchAtLogin(enabled);

    if (options.isTauriRuntime()) {
      try {
        await options.writeAutoStartEnabled(enabled);
      } catch (error) {
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
