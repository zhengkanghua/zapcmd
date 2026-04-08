import { t } from "../../i18n";
import type { CommandArg, CommandTemplate } from "./types";

export interface CommandBlockingIssue {
  code: "invalid-arg-pattern";
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
