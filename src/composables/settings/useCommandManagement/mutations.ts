import { type Ref } from "vue";
import type { CommandManagementRow, CommandManagementViewState } from "../../../features/settings/types";
import { createDefaultCommandViewState } from "../../../stores/settings/defaults";
import { normalizeCommandViewState } from "../../../stores/settings/normalization";

interface CreateToggleCommandEnabledOptions {
  setCommandEnabled: (commandId: string, enabled: boolean) => void;
}

interface CreateSetFilteredCommandsEnabledOptions {
  commandRows: Readonly<Ref<CommandManagementRow[]>>;
  disabledCommandIds: Readonly<Ref<string[]>>;
  setDisabledCommandIds: (ids: string[]) => void;
}

interface CreateUpdateCommandViewOptions {
  commandView: Ref<CommandManagementViewState>;
}

interface CreateResetCommandFiltersOptions {
  commandView: Ref<CommandManagementViewState>;
}

export function createToggleCommandEnabled(options: CreateToggleCommandEnabledOptions) {
  return (commandId: string, enabled: boolean): void => {
    options.setCommandEnabled(commandId, enabled);
  };
}

export function createSetFilteredCommandsEnabled(options: CreateSetFilteredCommandsEnabledOptions) {
  return (enabled: boolean): void => {
    const targetIds = options.commandRows.value.map((item) => item.id);
    if (targetIds.length === 0) {
      return;
    }

    const disabledSet = new Set(options.disabledCommandIds.value);
    if (enabled) {
      for (const id of targetIds) {
        disabledSet.delete(id);
      }
    } else {
      for (const id of targetIds) {
        disabledSet.add(id);
      }
    }

    options.setDisabledCommandIds(Array.from(disabledSet));
  };
}

export function createUpdateCommandView(options: CreateUpdateCommandViewOptions) {
  return (patch: Partial<CommandManagementViewState>): void => {
    options.commandView.value = normalizeCommandViewState({
      ...options.commandView.value,
      ...patch
    });
  };
}

export function createResetCommandFilters(options: CreateResetCommandFiltersOptions) {
  return (): void => {
    options.commandView.value = createDefaultCommandViewState();
  };
}
