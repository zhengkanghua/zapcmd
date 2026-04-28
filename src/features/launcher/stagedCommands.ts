import {
  buildInitialArgValues,
  resolveCommandExecution
} from "./commandRuntime";
import type { StagedCommand, StagedCommandPreflightCache } from "./types";
import { createStaleCommandSnapshotIssue } from "../commands/commandIssues";
import type {
  CommandExecutionTemplate,
  CommandTemplate,
  ResolvedCommandExecution
} from "../commands/types";

const STAGED_COMMAND_TIMESTAMP_SUFFIX_RE = /-\d{6,}$/;
const STALE_SNAPSHOT_PLACEHOLDER_EXECUTION_TEMPLATE: CommandExecutionTemplate = {
  kind: "script",
  runner: "bash",
  command: "echo stale-command-snapshot"
};
const STALE_SNAPSHOT_PLACEHOLDER_EXECUTION: ResolvedCommandExecution = {
  kind: "script",
  runner: "bash",
  command: "echo stale-command-snapshot"
};

function createStagedCommandId(commandId: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${commandId}-${globalThis.crypto.randomUUID()}`;
  }
  return `${commandId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface PersistedLauncherSessionCommand {
  id: string;
  sourceCommandId?: string;
  title: string;
  rawPreview: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeSourceCommandId(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizePreviewString(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return value;
}

function createStalePersistedLauncherSessionCommand(
  command: PersistedLauncherSessionCommand
): StagedCommand {
  const sourceCommandId = resolveStagedCommandSourceId(command);

  return {
    id: command.id,
    sourceCommandId,
    title: command.title,
    rawPreview: command.rawPreview,
    renderedPreview: command.rawPreview,
    executionTemplate: STALE_SNAPSHOT_PLACEHOLDER_EXECUTION_TEMPLATE,
    execution: STALE_SNAPSHOT_PLACEHOLDER_EXECUTION,
    args: [],
    argValues: {},
    blockingIssue: createStaleCommandSnapshotIssue(sourceCommandId)
  };
}

function rehydratePersistedLauncherSessionCommand(
  command: PersistedLauncherSessionCommand,
  currentTemplate: CommandTemplate
): StagedCommand | null {
  const rebuilt = buildStagedCommandSnapshot({
    command: currentTemplate,
    id: command.id
  });
  if (!rebuilt) {
    return null;
  }
  return {
    ...rebuilt,
    argValues: {},
    preflightCache: undefined
  };
}

/**
 * 队列快照的显示 id 会拼接时间戳；恢复或对齐当前 catalog 时，需要稳定拿回源命令 id。
 */
export function resolveStagedCommandSourceId(
  command: Pick<PersistedLauncherSessionCommand, "id" | "sourceCommandId">
): string {
  const explicitSourceId = sanitizeSourceCommandId(command.sourceCommandId);
  if (explicitSourceId) {
    return explicitSourceId;
  }
  const normalizedId = command.id.trim();
  return normalizedId.replace(STAGED_COMMAND_TIMESTAMP_SUFFIX_RE, "") || normalizedId;
}

export function normalizePersistedLauncherSessionCommandSnapshot(
  value: unknown
): PersistedLauncherSessionCommand | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = sanitizeRequiredString(value.id);
  const title = sanitizeRequiredString(value.title);
  const rawPreview = sanitizePreviewString(value.rawPreview);
  if (!id || !title || !rawPreview) {
    return null;
  }

  const sourceCommandId = sanitizeSourceCommandId(
    typeof value.sourceCommandId === "string" ? value.sourceCommandId : undefined
  );

  return {
    id,
    sourceCommandId: sourceCommandId ?? undefined,
    title,
    rawPreview
  };
}

export function buildPersistedLauncherSessionCommandSnapshot(
  command: Pick<
    StagedCommand,
    "id" | "sourceCommandId" | "title" | "rawPreview"
  >
): PersistedLauncherSessionCommand {
  return {
    id: command.id,
    sourceCommandId: sanitizeSourceCommandId(command.sourceCommandId) ?? undefined,
    title: command.title,
    rawPreview: command.rawPreview
  };
}

export function buildStagedCommandSnapshot(params: {
  command: CommandTemplate;
  argValues?: Record<string, string>;
  preflightCache?: StagedCommandPreflightCache;
  id?: string;
}): StagedCommand | null {
  const { command, argValues, preflightCache, id } = params;
  if (!command.execution) {
    return null;
  }

  const { args, values } = buildInitialArgValues(command, argValues);
  const resolved = resolveCommandExecution(command, values);

  return {
    id: id ?? createStagedCommandId(command.id),
    sourceCommandId: command.id,
    title: command.title,
    rawPreview: command.preview,
    renderedPreview: resolved.renderedPreview,
    executionTemplate: command.execution,
    execution: resolved.execution,
    args,
    argValues: values,
    prerequisites: command.prerequisites,
    preflightCache,
    adminRequired: command.adminRequired ?? false,
    dangerous: command.dangerous ?? false,
    blockingIssue: command.blockingIssue
  };
}

/**
 * 恢复旧队列时，按当前 catalog 重新生成执行快照，避免继续沿用过期 execution / 风险标记。
 */
export function rehydrateStagedCommandSnapshot(
  command: StagedCommand,
  currentTemplate: CommandTemplate
): StagedCommand | null {
  return rehydratePersistedLauncherSessionCommand(
    buildPersistedLauncherSessionCommandSnapshot(command),
    currentTemplate
  );
}

/**
 * 旧会话中的快照若已无法和当前 catalog 对齐，保留可见性但强制阻断执行，避免重启后执行旧定义。
 */
export function markStagedCommandSnapshotAsStale(command: StagedCommand): StagedCommand {
  return createStalePersistedLauncherSessionCommand(
    buildPersistedLauncherSessionCommandSnapshot(command)
  );
}

export function restorePersistedLauncherSessionCommandSnapshot(
  command: PersistedLauncherSessionCommand,
  currentTemplate?: CommandTemplate
): StagedCommand {
  if (!currentTemplate) {
    return createStalePersistedLauncherSessionCommand(command);
  }

  return rehydratePersistedLauncherSessionCommand(command, currentTemplate)
    ?? createStalePersistedLauncherSessionCommand(command);
}

export function restoreStagedCommandSnapshot(
  command: StagedCommand,
  currentTemplate?: CommandTemplate
): StagedCommand {
  return restorePersistedLauncherSessionCommandSnapshot(
    buildPersistedLauncherSessionCommandSnapshot(command),
    currentTemplate
  );
}
