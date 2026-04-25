import type {
  PointerActionFieldId,
  SearchResultPointerAction
} from "../../../stores/settingsStore";
import { t } from "../../../i18n";
import {
  applySettingsValidationIssue,
  clearSettingsErrorState,
  type SettingsWindowState,
  type UseSettingsWindowOptions
} from "./model";

function resolveSettingsError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : t("settings.error.persistSettingsFailed");
}

export interface PointerActions {
  applyPointerActionChange: (
    field: PointerActionFieldId,
    action: SearchResultPointerAction
  ) => Promise<void>;
}

export function createPointerActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  persistSetting: () => Promise<void>;
}): PointerActions {
  const { options, state, persistSetting } = deps;

  async function applyPointerActionChange(
    field: PointerActionFieldId,
    action: SearchResultPointerAction
  ): Promise<void> {
    clearSettingsErrorState(state);

    options.settingsStore.setPointerAction(field, action);

    try {
      await persistSetting();
    } catch (error) {
      applySettingsValidationIssue(state, {
        message: resolveSettingsError(error),
        route: "hotkeys"
      });
    }
  }

  return {
    applyPointerActionChange
  };
}
