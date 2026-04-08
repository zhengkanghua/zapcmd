import type { CommandArg } from "../commands/types";
import { t } from "../../i18n";

const INJECTION_PATTERN = /(?:\r|\n|[|&`<>]|;\s*|\$\(|\$\{)/;

export interface CommandArgValidationError {
  key: string;
  message: string;
  kind: "invalid" | "blocked";
}

export interface CommandArgValidationOptions {
  trustedArgKeys?: string[];
}

function validateCommandArgValueDetail(
  arg: CommandArg,
  argValue: string | undefined,
  options: CommandArgValidationOptions = {}
): Omit<CommandArgValidationError, "key"> | null {
  const value = (argValue ?? "").trim();
  if (arg.required !== false && value.length === 0) {
    return {
      kind: "invalid",
      message: t("safety.validation.required", { label: arg.label })
    };
  }
  if (value.length === 0) {
    return null;
  }

  if (arg.argType === "number") {
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      return {
        kind: "invalid",
        message: t("safety.validation.number", { label: arg.label })
      };
    }

    const numericValue = Number(value);
    if (typeof arg.min === "number" && numericValue < arg.min) {
      return {
        kind: "invalid",
        message:
          arg.validationError?.trim() ||
          t("safety.validation.min", { label: arg.label, min: arg.min })
      };
    }
    if (typeof arg.max === "number" && numericValue > arg.max) {
      return {
        kind: "invalid",
        message:
          arg.validationError?.trim() ||
          t("safety.validation.max", { label: arg.label, max: arg.max })
      };
    }
  }

  if (arg.options && arg.options.length > 0 && !arg.options.includes(value)) {
    return {
      kind: "invalid",
      message: t("safety.validation.options", { label: arg.label })
    };
  }

  if (arg.validationPattern) {
    try {
      const regex = new RegExp(arg.validationPattern);
      if (!regex.test(value)) {
        return {
          kind: "invalid",
          message:
            arg.validationError?.trim() ||
            t("safety.validation.pattern", { label: arg.label })
        };
      }
    } catch (error) {
      console.warn("command arg validationPattern is invalid", {
        label: arg.label,
        pattern: arg.validationPattern,
        error
      });
      return {
        kind: "invalid",
        message: t("safety.validation.invalidPattern", { label: arg.label })
      };
    }
  }

  const trustedArgKeys = options.trustedArgKeys ?? [];
  if (!trustedArgKeys.includes(arg.key) && INJECTION_PATTERN.test(value)) {
    return {
      kind: "blocked",
      message: t("safety.validation.injection", { label: arg.label })
    };
  }

  return null;
}

export function validateCommandArgValue(
  arg: CommandArg,
  argValue: string | undefined,
  options: CommandArgValidationOptions = {}
): string | null {
  return validateCommandArgValueDetail(arg, argValue, options)?.message ?? null;
}

export function collectCommandArgValidationErrors(
  args: CommandArg[] | undefined,
  argValues: Record<string, string> | undefined,
  options: CommandArgValidationOptions = {}
): Record<string, string> {
  if (!args || args.length === 0) {
    return {};
  }

  return args.reduce<Record<string, string>>((errors, arg) => {
    const error = validateCommandArgValueDetail(arg, argValues?.[arg.key], options);
    if (error) {
      errors[arg.key] = error.message;
    }
    return errors;
  }, {});
}

export function findFirstCommandArgValidationError(
  args: CommandArg[] | undefined,
  argValues: Record<string, string> | undefined,
  options: CommandArgValidationOptions = {}
): CommandArgValidationError | null {
  if (!args || args.length === 0) {
    return null;
  }

  for (const arg of args) {
    const error = validateCommandArgValueDetail(arg, argValues?.[arg.key], options);
    if (error) {
      return {
        key: arg.key,
        kind: error.kind,
        message: error.message
      };
    }
  }

  return null;
}
