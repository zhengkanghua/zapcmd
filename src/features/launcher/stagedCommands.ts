import {
  buildInitialArgValues,
  resolveCommandExecution
} from "./commandRuntime";
import type { StagedCommand, StagedCommandPreflightCache } from "./types";
import { createStaleCommandSnapshotIssue } from "../commands/commandIssues";
import type { CommandTemplate } from "../commands/types";

const STAGED_COMMAND_TIMESTAMP_SUFFIX_RE = /-\d{6,}$/;

function sanitizeSourceCommandId(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 队列快照的显示 id 会拼接时间戳；恢复或对齐当前 catalog 时，需要稳定拿回源命令 id。
 */
export function resolveStagedCommandSourceId(
  command: Pick<StagedCommand, "id" | "sourceCommandId">
): string {
  const explicitSourceId = sanitizeSourceCommandId(command.sourceCommandId);
  if (explicitSourceId) {
    return explicitSourceId;
  }
  const normalizedId = command.id.trim();
  return normalizedId.replace(STAGED_COMMAND_TIMESTAMP_SUFFIX_RE, "") || normalizedId;
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
    id: id ?? `${command.id}-${Date.now()}`,
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
  const rebuilt = buildStagedCommandSnapshot({
    command: currentTemplate,
    argValues: command.argValues,
    id: command.id
  });
  if (!rebuilt) {
    return null;
  }
  return {
    ...rebuilt,
    preflightCache: undefined
  };
}

/**
 * 旧会话中的快照若已无法和当前 catalog 对齐，保留可见性但强制阻断执行，避免重启后执行旧定义。
 */
export function markStagedCommandSnapshotAsStale(command: StagedCommand): StagedCommand {
  const sourceCommandId = resolveStagedCommandSourceId(command);

  return {
    ...command,
    sourceCommandId,
    preflightCache: undefined,
    blockingIssue: createStaleCommandSnapshotIssue(sourceCommandId)
  };
}

export function restoreStagedCommandSnapshot(
  command: StagedCommand,
  currentTemplate?: CommandTemplate
): StagedCommand {
  if (!currentTemplate) {
    return markStagedCommandSnapshotAsStale(command);
  }

  return rehydrateStagedCommandSnapshot(command, currentTemplate)
    ?? markStagedCommandSnapshotAsStale(command);
}
