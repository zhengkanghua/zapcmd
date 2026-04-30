import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type { PersistedLauncherSessionCommand } from "../../../features/launcher/stagedCommands";
import type { StagedCommand } from "../../../features/launcher/types";
import {
  resolveLauncherSearchFocusBlocked,
  restoreLauncherSessionCommands
} from "../../app/useAppCompositionRoot/launcherRuntimeSupport";

function createTemplate(id: string): CommandTemplate {
  return {
    id,
    title: id,
    description: id,
    preview: `echo ${id}`,
    execution: {
      kind: "exec",
      program: "echo",
      args: [id]
    },
    folder: "@_test",
    category: "test",
    needsArgs: false
  };
}

describe("launcherRuntimeSupport", () => {
  it("restores launcher session commands against current templates", () => {
    const commands: PersistedLauncherSessionCommand[] = [
      {
        id: "known-123456",
        sourceCommandId: "known",
        title: "Known",
        rawPreview: "echo old",
        argValues: {}
      },
      {
        id: "missing-123456",
        sourceCommandId: "missing",
        title: "Missing",
        rawPreview: "echo old",
        argValues: {}
      }
    ];

    const restored = restoreLauncherSessionCommands(commands, [createTemplate("known")]);

    expect(restored[0]?.blockingIssue).toBeUndefined();
    expect(restored[0]?.renderedPreview).toBe("echo known");
    expect(restored[1]?.blockingIssue?.code).toBe("stale-command-snapshot");
  });

  it("blocks launcher search focus while queue or execution overlays own interaction", () => {
    const queueOpen = ref(false);
    const executing = ref(false);
    const commandPageOpen = ref(false);
    const safetyDialog = ref<StagedCommand | null>(null);

    expect(resolveLauncherSearchFocusBlocked({
      queueOpen,
      executing,
      commandPageOpen,
      safetyDialog
    })).toBe(false);

    executing.value = true;

    expect(resolveLauncherSearchFocusBlocked({
      queueOpen,
      executing,
      commandPageOpen: computed(() => commandPageOpen.value),
      safetyDialog
    })).toBe(true);
  });
});
