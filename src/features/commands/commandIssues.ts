import { t } from "../../i18n";
import type { CommandArg, CommandTemplate } from "./types";

const MAX_VALIDATION_PATTERN_LENGTH = 512;

export interface CommandBlockingIssue {
  code: "invalid-arg-pattern" | "stale-command-snapshot";
  message: string;
  detail: string;
}

function getPatternCompileErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return t("execution.invalidCommandPatternUnknown");
}

function buildInvalidArgPatternIssue(arg: CommandArg): CommandBlockingIssue | null {
  const pattern = arg.validationPattern?.trim();
  if (!pattern) {
    return null;
  }
  if (pattern.length > MAX_VALIDATION_PATTERN_LENGTH) {
    return {
      code: "invalid-arg-pattern",
      message: t("execution.invalidCommandConfig"),
      detail: t("execution.invalidCommandPatternDetail", {
        label: arg.label,
        pattern: `${pattern.slice(0, 80)}...`,
        reason: `pattern length cannot exceed ${MAX_VALIDATION_PATTERN_LENGTH} characters`
      })
    };
  }

  try {
    new RegExp(pattern);
    return null;
  } catch (error) {
    return {
      code: "invalid-arg-pattern",
      message: t("execution.invalidCommandConfig"),
      detail: t("execution.invalidCommandPatternDetail", {
        label: arg.label,
        pattern,
        reason: getPatternCompileErrorMessage(error)
      })
    };
  }
}

/** 命令加载期先收敛配置错误，避免用户第一次操作时才发现。 */
export function findCommandBlockingIssue(
  command: Pick<CommandTemplate, "args">
): CommandBlockingIssue | null {
  for (const arg of command.args ?? []) {
    const issue = buildInvalidArgPatternIssue(arg);
    if (issue) {
      return issue;
    }
  }

  return null;
}

export function createStaleCommandSnapshotIssue(commandId: string): CommandBlockingIssue {
  return {
    code: "stale-command-snapshot",
    message: t("execution.staleCommandSnapshot"),
    detail: t("execution.staleCommandSnapshotDetail", {
      commandId
    })
  };
}
