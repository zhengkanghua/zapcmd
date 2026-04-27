import { describe, expect, it, vi } from "vitest";

import type { CommandTemplate } from "../../commands/types";
import type { StagedCommand } from "../types";
import {
  buildStagedCommandSnapshot,
  buildPersistedLauncherSessionCommandSnapshot,
  resolveStagedCommandSourceId,
  restorePersistedLauncherSessionCommandSnapshot
} from "../stagedCommands";

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

function createStagedCommand(id: string, overrides: Partial<StagedCommand> = {}): StagedCommand {
  return {
    id,
    sourceCommandId: "docker-logs",
    title: "Docker Logs",
    rawPreview: "docker logs {{container}} --tail {{tail}}",
    renderedPreview: "docker logs api --tail 30",
    executionTemplate: {
      kind: "exec",
      program: "docker",
      args: ["logs", "{{container}}", "--tail", "{{tail}}"]
    },
    execution: {
      kind: "exec",
      program: "docker",
      args: ["logs", "api", "--tail", "30"]
    },
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
    argValues: {
      container: "api",
      tail: "30"
    },
    preflightCache: {
      checkedAt: 1743648000000,
      issueCount: 1,
      source: "issues",
      issues: ["未检测到 Docker Desktop。"]
    },
    prerequisites: [
      {
        id: "docker",
        type: "binary",
        required: true,
        check: "docker"
      }
    ],
    adminRequired: true,
    dangerous: false,
    ...overrides
  };
}

describe("stagedCommands session snapshot helpers", () => {
  it("builds a minimal launcher session snapshot from staged command runtime state", () => {
    const snapshot = buildPersistedLauncherSessionCommandSnapshot(createStagedCommand("docker-logs-1"));

    expect(snapshot).toEqual({
      id: "docker-logs-1",
      sourceCommandId: "docker-logs",
      title: "Docker Logs",
      rawPreview: "docker logs {{container}} --tail {{tail}}",
      renderedPreview: "docker logs api --tail 30",
      argValues: {
        container: "api",
        tail: "30"
      }
    });
  });

  it("rebuilds a full staged command from minimal snapshot when the current template still exists", () => {
    const restored = restorePersistedLauncherSessionCommandSnapshot(
      {
        id: "docker-logs-1",
        sourceCommandId: "docker-logs",
        title: "旧标题",
        rawPreview: "docker logs {{container}} --tail 120",
        renderedPreview: "docker logs old-api --tail 120",
        argValues: {
          container: "api"
        }
      },
      createTemplate()
    );

    expect(restored.id).toBe("docker-logs-1");
    expect(restored.sourceCommandId).toBe("docker-logs");
    expect(restored.title).toBe("Docker Logs");
    expect(restored.rawPreview).toBe("docker logs {{container}} --tail {{tail}}");
    expect(restored.renderedPreview).toBe("docker logs api --tail 30");
    expect(restored.argValues).toEqual({
      container: "api",
      tail: "30"
    });
    expect(restored.args).toHaveLength(2);
    expect(restored.preflightCache).toBeUndefined();
    expect(restored.blockingIssue).toBeUndefined();
  });

  it("restores a missing-template snapshot as a visible stale item that stays blocked", () => {
    const restored = restorePersistedLauncherSessionCommandSnapshot({
      id: "docker-logs-1710000000000",
      title: "Docker Logs",
      rawPreview: "docker logs {{container}} --tail 120",
      renderedPreview: "docker logs api --tail 120",
      argValues: {
        container: "api"
      }
    });

    expect(resolveStagedCommandSourceId(restored)).toBe("docker-logs");
    expect(restored.sourceCommandId).toBe("docker-logs");
    expect(restored.title).toBe("Docker Logs");
    expect(restored.rawPreview).toBe("docker logs {{container}} --tail 120");
    expect(restored.renderedPreview).toBe("docker logs api --tail 120");
    expect(restored.argValues).toEqual({
      container: "api"
    });
    expect(restored.args).toEqual([]);
    expect(restored.preflightCache).toBeUndefined();
    expect(restored.executionTemplate.kind).toBe("script");
    expect(restored.execution.kind).toBe("script");
    expect(restored.blockingIssue?.code).toBe("stale-command-snapshot");
  });

  it("generates distinct staged ids even when the same command is queued within one millisecond", () => {
    const template = createTemplate();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1745740800000);

    try {
      const first = buildStagedCommandSnapshot({ command: template });
      const second = buildStagedCommandSnapshot({ command: template });

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(first?.id).not.toBe(second?.id);
      expect(first?.sourceCommandId).toBe(template.id);
      expect(second?.sourceCommandId).toBe(template.id);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
