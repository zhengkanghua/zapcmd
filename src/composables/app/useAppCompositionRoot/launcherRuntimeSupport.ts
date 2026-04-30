import type { ComputedRef, Ref } from "vue";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import {
  restorePersistedLauncherSessionCommandSnapshot,
  type PersistedLauncherSessionCommand,
  resolveStagedCommandSourceId
} from "../../../features/launcher/stagedCommands";
import type { StagedCommand } from "../../../features/launcher/types";

type BoolLikeRef = Ref<boolean> | ComputedRef<boolean> | Readonly<Ref<boolean>>;

export function restoreLauncherSessionCommands(
  commands: PersistedLauncherSessionCommand[],
  templates: CommandTemplate[]
): StagedCommand[] {
  const templatesById = new Map(templates.map((item) => [item.id, item]));

  return commands.map((item) =>
    restorePersistedLauncherSessionCommandSnapshot(
      item,
      templatesById.get(resolveStagedCommandSourceId(item))
    )
  );
}

export function resolveLauncherSearchFocusBlocked(options: {
  queueOpen: BoolLikeRef;
  executing: BoolLikeRef;
  commandPageOpen: BoolLikeRef;
  safetyDialog: Readonly<Ref<unknown | null>>;
}): boolean {
  return (
    options.queueOpen.value ||
    options.executing.value ||
    options.commandPageOpen.value ||
    options.safetyDialog.value !== null
  );
}
