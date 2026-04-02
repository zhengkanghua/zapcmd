import type { CommandArg, CommandTemplate } from "../commands/types";
import { t } from "../../i18n";
import { findFirstCommandArgValidationError } from "./commandArgValidation";

export interface SafetyCommandInput {
  title: string;
  renderedCommand: string;
  args?: CommandArg[];
  argValues?: Record<string, string>;
  trustedArgKeys?: string[];
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

export function collectTrustedArgKeysFromExecution(
  execution: CommandTemplate["execution"] | undefined,
  args: CommandArg[]
): string[] {
  if (!execution || execution.kind !== "exec" || !execution.stdinArgKey) {
    return [];
  }

  const trustedArg = args.find((arg) => arg.key === execution.stdinArgKey);
  if (!trustedArg) {
    return [];
  }

  const token = trustedArg.token;
  const appearsInProgram = execution.program.includes(token);
  const appearsInArgs = execution.args.some((item) => item.includes(token));
  return appearsInProgram || appearsInArgs ? [] : [trustedArg.key];
}

function validateArgumentsWithTrust(input: SafetyCommandInput): string | null {
  return (
    findFirstCommandArgValidationError(input.args, input.argValues, {
      trustedArgKeys: input.trustedArgKeys
    })?.message ?? null
  );
}

export function checkSingleCommandSafety(input: SafetyCommandInput): SingleCommandSafetyResult {
  const blockedMessage = validateArgumentsWithTrust(input);
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
    const blockedMessage = validateArgumentsWithTrust(item);
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
    trustedArgKeys: collectTrustedArgKeysFromExecution(command.execution, args),
    adminRequired: command.adminRequired ?? false,
    dangerous: command.dangerous ?? false
  };
}
