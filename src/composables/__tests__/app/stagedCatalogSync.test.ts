import { effectScope, nextTick, ref } from "vue";
import { describe, expect, it } from "vitest";
import type { CommandTemplate } from "../../../features/commands/types";
import { buildStagedCommandSnapshot } from "../../../features/launcher/stagedCommands";
import { bindStagedCatalogSync } from "../../app/useAppCompositionRoot/stagedCatalogSync";

function createTemplate(overrides: Partial<CommandTemplate> = {}): CommandTemplate {
  return {
    id: "docker-logs",
    title: "Docker Logs",
    description: "查看容器日志",
    preview: "docker logs {{container}} --tail {{tail}}",
    execution: {
      kind: "exec",
      program: "docker",
      args: ["logs", "{{container}}", "--tail", "{{tail}}"]
    },
    folder: "@_test",
    category: "test",
    needsArgs: true,
    args: [
      {
        key: "container",
        label: "Container",
        token: "{{container}}",
        required: true,
        placeholder: "api"
      },
      {
        key: "tail",
        label: "Tail",
        token: "{{tail}}",
        required: false,
        defaultValue: "30"
      }
    ],
    ...overrides
  };
}

describe("stagedCatalogSync", () => {
  it("rehydrates queued commands against the latest catalog template", async () => {
    const allCommandTemplates = ref([createTemplate()]);
    const stagedCommand = buildStagedCommandSnapshot({
      command: createTemplate(),
      argValues: {
        container: "api",
        tail: "30"
      }
    });
    if (!stagedCommand) {
      throw new Error("expected staged command snapshot");
    }
    const stagedCommands = ref([stagedCommand]);

    const scope = effectScope();
    scope.run(() => {
      bindStagedCatalogSync({
        stagedCommands,
        allCommandTemplates
      });
    });

    allCommandTemplates.value = [
      createTemplate({
        title: "Docker Logs V2",
        preview: "docker logs --timestamps {{container}} --tail {{tail}}",
        execution: {
          kind: "exec",
          program: "docker",
          args: ["logs", "--timestamps", "{{container}}", "--tail", "{{tail}}"]
        }
      })
    ];
    await nextTick();
    scope.stop();

    expect(stagedCommands.value[0]?.title).toBe("Docker Logs V2");
    expect(stagedCommands.value[0]?.renderedPreview).toBe(
      "docker logs --timestamps api --tail 30"
    );
    expect(stagedCommands.value[0]?.execution).toEqual({
      kind: "exec",
      program: "docker",
      args: ["logs", "--timestamps", "api", "--tail", "30"]
    });
  });

  it("marks queued commands as stale when their source template disappears from the catalog", async () => {
    const allCommandTemplates = ref([createTemplate()]);
    const stagedCommand = buildStagedCommandSnapshot({
      command: createTemplate(),
      argValues: {
        container: "api",
        tail: "30"
      }
    });
    if (!stagedCommand) {
      throw new Error("expected staged command snapshot");
    }
    const stagedCommands = ref([stagedCommand]);

    const scope = effectScope();
    scope.run(() => {
      bindStagedCatalogSync({
        stagedCommands,
        allCommandTemplates
      });
    });

    allCommandTemplates.value = [];
    await nextTick();
    scope.stop();

    expect(stagedCommands.value[0]?.blockingIssue?.code).toBe("stale-command-snapshot");
    expect(stagedCommands.value[0]?.sourceCommandId).toBe("docker-logs");
  });
});
