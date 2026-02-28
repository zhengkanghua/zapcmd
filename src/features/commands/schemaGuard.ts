import type {
  RuntimeCommand,
  RuntimeCommandArg,
  RuntimeCommandFile,
  RuntimeCommandPrerequisite,
  RuntimeLocalizedTextOrString
} from "./runtimeTypes";

const COMMAND_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const COMMAND_ARG_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;
const ALLOWED_TOP_LEVEL_KEYS = new Set(["_meta", "commands"]);
const ALLOWED_COMMAND_KEYS = new Set([
  "id",
  "name",
  "description",
  "tags",
  "category",
  "platform",
  "template",
  "shell",
  "adminRequired",
  "dangerous",
  "args",
  "prerequisites"
]);
const ALLOWED_ARG_KEYS = new Set([
  "key",
  "label",
  "type",
  "required",
  "default",
  "placeholder",
  "validation"
]);
const ALLOWED_VALIDATION_KEYS = new Set(["pattern", "min", "max", "options", "errorMessage"]);
const ALLOWED_PREREQUISITE_KEYS = new Set([
  "id",
  "type",
  "required",
  "check",
  "installHint",
  "fallbackCommandId"
]);

const ALLOWED_CATEGORIES = new Set([
  "network",
  "docker",
  "git",
  "system",
  "file",
  "package",
  "database",
  "cloud",
  "kubernetes",
  "ssh",
  "security",
  "dev",
  "custom"
]);

const ALLOWED_PLATFORMS = new Set(["all", "win", "mac", "linux"]);
const ALLOWED_SHELLS = new Set(["bash", "zsh", "powershell", "cmd"]);
const ALLOWED_ARG_TYPES = new Set(["text", "number", "path", "select"]);
const ALLOWED_PREREQUISITE_TYPES = new Set(["binary", "shell", "network", "permission", "env"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(target: Record<string, unknown>, allowedKeys: Set<string>): boolean {
  return Object.keys(target).every((key) => allowedKeys.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isLocalizedText(value: unknown): value is Record<string, string> {
  if (!isObject(value)) {
    return false;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return false;
  }
  return entries.every(([key, text]) => key.trim().length > 0 && isNonEmptyString(text));
}

function isLocalizedTextOrString(value: unknown): value is RuntimeLocalizedTextOrString {
  return isNonEmptyString(value) || isLocalizedText(value);
}

function hasUniqueNonEmptyStrings(values: unknown[]): values is string[] {
  if (values.length === 0) {
    return false;
  }
  const normalized = values.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (normalized.some((item) => item.length === 0)) {
    return false;
  }
  return new Set(normalized).size === normalized.length;
}

function isValidCommandArgValidation(value: unknown): boolean {
  if (!isObject(value) || !hasOnlyKeys(value, ALLOWED_VALIDATION_KEYS)) {
    return false;
  }

  if (value.pattern !== undefined && !isNonEmptyString(value.pattern)) {
    return false;
  }
  if (value.min !== undefined && typeof value.min !== "number") {
    return false;
  }
  if (value.max !== undefined && typeof value.max !== "number") {
    return false;
  }
  if (value.options !== undefined) {
    if (!Array.isArray(value.options) || !hasUniqueNonEmptyStrings(value.options)) {
      return false;
    }
  }
  if (value.errorMessage !== undefined && !isLocalizedTextOrString(value.errorMessage)) {
    return false;
  }
  return true;
}

function isValidCommandArg(arg: unknown): arg is RuntimeCommandArg {
  if (!isObject(arg) || !hasOnlyKeys(arg, ALLOWED_ARG_KEYS)) {
    return false;
  }

  if (!isNonEmptyString(arg.key) || !COMMAND_ARG_KEY_PATTERN.test(arg.key)) {
    return false;
  }
  if (!isLocalizedTextOrString(arg.label)) {
    return false;
  }
  if (!isNonEmptyString(arg.type) || !ALLOWED_ARG_TYPES.has(arg.type)) {
    return false;
  }
  if (arg.required !== undefined && typeof arg.required !== "boolean") {
    return false;
  }
  if (arg.default !== undefined && typeof arg.default !== "string") {
    return false;
  }
  if (arg.placeholder !== undefined && typeof arg.placeholder !== "string") {
    return false;
  }
  if (arg.validation !== undefined && !isValidCommandArgValidation(arg.validation)) {
    return false;
  }

  if (arg.type === "select") {
    if (!isObject(arg.validation) || !Array.isArray(arg.validation.options)) {
      return false;
    }
    if (!hasUniqueNonEmptyStrings(arg.validation.options)) {
      return false;
    }
  }

  return true;
}

function isValidCommandPrerequisite(item: unknown): item is RuntimeCommandPrerequisite {
  if (!isObject(item) || !hasOnlyKeys(item, ALLOWED_PREREQUISITE_KEYS)) {
    return false;
  }

  if (!isNonEmptyString(item.id)) {
    return false;
  }
  if (!isNonEmptyString(item.type) || !ALLOWED_PREREQUISITE_TYPES.has(item.type)) {
    return false;
  }
  if (typeof item.required !== "boolean") {
    return false;
  }
  if (!isNonEmptyString(item.check)) {
    return false;
  }
  if (item.installHint !== undefined && !isLocalizedTextOrString(item.installHint)) {
    return false;
  }
  if (item.fallbackCommandId !== undefined) {
    if (!isNonEmptyString(item.fallbackCommandId) || !COMMAND_ID_PATTERN.test(item.fallbackCommandId)) {
      return false;
    }
  }

  return true;
}

function isValidCommand(command: unknown): command is RuntimeCommand {
  if (!isObject(command) || !hasOnlyKeys(command, ALLOWED_COMMAND_KEYS)) {
    return false;
  }

  if (!isNonEmptyString(command.id) || !COMMAND_ID_PATTERN.test(command.id)) {
    return false;
  }
  if (!isLocalizedTextOrString(command.name)) {
    return false;
  }
  if (!Array.isArray(command.tags) || !hasUniqueNonEmptyStrings(command.tags)) {
    return false;
  }
  if (!isNonEmptyString(command.category) || !ALLOWED_CATEGORIES.has(command.category)) {
    return false;
  }
  if (!isNonEmptyString(command.platform) || !ALLOWED_PLATFORMS.has(command.platform)) {
    return false;
  }
  if (!isNonEmptyString(command.template)) {
    return false;
  }
  if (typeof command.adminRequired !== "boolean") {
    return false;
  }
  if (command.description !== undefined && !isLocalizedTextOrString(command.description)) {
    return false;
  }
  if (command.shell !== undefined) {
    if (!isNonEmptyString(command.shell) || !ALLOWED_SHELLS.has(command.shell)) {
      return false;
    }
  }
  if (command.dangerous !== undefined && typeof command.dangerous !== "boolean") {
    return false;
  }
  if (command.args !== undefined) {
    if (!Array.isArray(command.args) || !command.args.every((arg) => isValidCommandArg(arg))) {
      return false;
    }
  }
  if (command.prerequisites !== undefined) {
    if (
      !Array.isArray(command.prerequisites) ||
      !command.prerequisites.every((item) => isValidCommandPrerequisite(item))
    ) {
      return false;
    }
  }

  return true;
}

function hasValidMeta(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  if (!isObject(value)) {
    return false;
  }

  if (value.name !== undefined && !isLocalizedTextOrString(value.name)) {
    return false;
  }
  if (value.author !== undefined && !isNonEmptyString(value.author)) {
    return false;
  }
  if (value.version !== undefined && !isNonEmptyString(value.version)) {
    return false;
  }
  if (value.description !== undefined && !isLocalizedTextOrString(value.description)) {
    return false;
  }
  if (value.source !== undefined && !isNonEmptyString(value.source)) {
    return false;
  }
  return true;
}

export function isRuntimeCommandFile(value: unknown): value is RuntimeCommandFile {
  if (!isObject(value) || !hasOnlyKeys(value, ALLOWED_TOP_LEVEL_KEYS)) {
    return false;
  }

  if (!hasValidMeta(value._meta)) {
    return false;
  }

  if (!Array.isArray(value.commands) || value.commands.length === 0) {
    return false;
  }

  return value.commands.every((command) => isValidCommand(command));
}
