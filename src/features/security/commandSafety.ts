import type { CommandArg, CommandTemplate } from "../commands/types";
import { t } from "../../i18n";
import { findFirstCommandArgValidationError } from "./commandArgValidation";

export interface SafetyCommandInput {
  title: string;
  renderedCommand: string;
  args?: CommandArg[];
  argValues?: Record<string, string>;
  adminRequired?: boolean;
  dangerous?: boolean;
}

export interface SafetyConfirmationItem {
  title: string;
  renderedCommand: string;
  reasons: string[];
}

export interface SingleCommandSafetyResult {
  blockedMessage: string | null;
  confirmationReasons: string[];
}

export interface QueueCommandSafetyResult {
  blockedMessage: string | null;
  confirmationItems: SafetyConfirmationItem[];
}

const DANGEROUS_COMMAND_PATTERNS: Array<{ pattern: RegExp; reasonKey: string }> = [
  { pattern: /\brm\s+-rf\b/i, reasonKey: "safety.reasons.rmRf" },
  { pattern: /\bdel\s+\/[a-z]*f[a-z]*\b/i, reasonKey: "safety.reasons.delForce" },
  { pattern: /\bformat\s+[a-z]:/i, reasonKey: "safety.reasons.formatDisk" },
  { pattern: /\bshutdown\s+\/[sr]/i, reasonKey: "safety.reasons.shutdown" },
  { pattern: /\btaskkill\b.*\/f/i, reasonKey: "safety.reasons.taskkillForce" },
  { pattern: /\bstop-process\b/i, reasonKey: "safety.reasons.stopProcess" },
  { pattern: /\bkill\s+-9\b/i, reasonKey: "safety.reasons.kill9" }
];

function sanitizeCommandSummary(value: string): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return t("execution.emptyCommand");
  }
  return collapsed.length > 120 ? `${collapsed.slice(0, 120)}...` : collapsed;
}

function collectConfirmationReasons(input: SafetyCommandInput): string[] {
  const reasons: string[] = [];
  if (input.dangerous) {
    reasons.push(t("safety.reasons.dangerousFlag"));
  }
  if (input.adminRequired) {
    reasons.push(t("safety.reasons.adminRequired"));
  }

  for (const item of DANGEROUS_COMMAND_PATTERNS) {
    if (item.pattern.test(input.renderedCommand)) {
      reasons.push(t(item.reasonKey));
    }
  }

  return Array.from(new Set(reasons));
}

function validateArguments(args: CommandArg[] | undefined, argValues: Record<string, string> | undefined): string | null {
  return findFirstCommandArgValidationError(args, argValues)?.message ?? null;
}

export function checkSingleCommandSafety(input: SafetyCommandInput): SingleCommandSafetyResult {
  const blockedMessage = validateArguments(input.args, input.argValues);
  if (blockedMessage) {
    return {
      blockedMessage,
      confirmationReasons: []
    };
  }

  return {
    blockedMessage: null,
    confirmationReasons: collectConfirmationReasons(input)
  };
}

export function checkQueueCommandSafety(items: SafetyCommandInput[]): QueueCommandSafetyResult {
  const confirmationItems: SafetyConfirmationItem[] = [];

  for (const item of items) {
    const blockedMessage = validateArguments(item.args, item.argValues);
    if (blockedMessage) {
      return {
        blockedMessage: t("safety.queueBlockedPrefix", { title: item.title, reason: blockedMessage }),
        confirmationItems: []
      };
    }

    const reasons = collectConfirmationReasons(item);
    if (reasons.length > 0) {
      confirmationItems.push({
        title: item.title,
        renderedCommand: sanitizeCommandSummary(item.renderedCommand),
        reasons
      });
    }
  }

  return {
    blockedMessage: null,
    confirmationItems
  };
}

export function buildSafetyInputFromTemplate(
  command: CommandTemplate,
  renderedCommand: string,
  argValues: Record<string, string> | undefined,
  args: CommandArg[]
): SafetyCommandInput {
  return {
    title: command.title,
    renderedCommand,
    args,
    argValues,
    adminRequired: command.adminRequired ?? false,
    dangerous: command.dangerous ?? false
  };
}
