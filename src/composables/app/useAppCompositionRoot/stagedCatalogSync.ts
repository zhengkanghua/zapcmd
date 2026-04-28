import { watch, type Ref } from "vue";
import type { CommandTemplate } from "../../../features/commands/types";
import {
  restoreStagedCommandSnapshot,
  resolveStagedCommandSourceId
} from "../../../features/launcher/stagedCommands";
import type { StagedCommand } from "../../../features/launcher/types";

interface BindStagedCatalogSyncOptions {
  stagedCommands: Ref<StagedCommand[]>;
  allCommandTemplates: Readonly<Ref<CommandTemplate[]>>;
}

function rebuildStagedCommands(
  stagedCommands: readonly StagedCommand[],
  templatesById: ReadonlyMap<string, CommandTemplate>
): StagedCommand[] {
  return stagedCommands.map((command) =>
    restoreStagedCommandSnapshot(
      command,
      templatesById.get(resolveStagedCommandSourceId(command))
    )
  );
}

export function bindStagedCatalogSync(options: BindStagedCatalogSyncOptions): void {
  watch(
    options.allCommandTemplates,
    (templates) => {
      if (options.stagedCommands.value.length === 0) {
        return;
      }

      // catalog 在线刷新后，队列项必须基于最新模板重建；否则会继续保留旧 execution。
      const templatesById = new Map(templates.map((item) => [item.id, item]));
      options.stagedCommands.value = rebuildStagedCommands(
        options.stagedCommands.value,
        templatesById
      );
    },
    { deep: false }
  );
}
