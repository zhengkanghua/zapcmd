import type {
  RuntimeCommand,
  RuntimeCommandArg,
  RuntimeCommandFile,
  RuntimeLocalizedTextOrString
} from "./runtimeTypes";

const ARG_TOKEN_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/u;

function isLocalizedTextObject(
  value: RuntimeLocalizedTextOrString | undefined
): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBlankString(value: string | undefined): boolean {
  return value !== undefined && value.trim().length === 0;
}

function findLocalizedTextViolation(
  value: RuntimeLocalizedTextOrString | undefined,
  path: string
): string | null {
  if (typeof value === "string") {
    return value.trim().length === 0 ? `${path} must not be blank.` : null;
  }
  if (!isLocalizedTextObject(value)) {
    return null;
  }

  for (const [key, text] of Object.entries(value)) {
    if (key.trim().length === 0) {
      return `${path} contains an empty locale key.`;
    }
    if (text.trim().length === 0) {
      return `${path}.${key} must not be blank.`;
    }
  }

  return null;
}

function findMissingTemplateToken(
  command: RuntimeCommand,
  commandPath: string
): string | null {
  const availableKeys = new Set((command.args ?? []).map((arg) => arg.key));
  const tokens = command.template.matchAll(/\{\{([^{}]+)\}\}/gu);

  for (const match of tokens) {
    const tokenKey = match[1]?.trim() ?? "";
    // 只校验 ZapCmd 自己的参数占位符，保留外部模板语法字面量原样通过。
    if (
      tokenKey.length === 0 ||
      !ARG_TOKEN_KEY_PATTERN.test(tokenKey) ||
      availableKeys.has(tokenKey)
    ) {
      continue;
    }
    return `${commandPath}.template references undefined token "${tokenKey}".`;
  }

  return null;
}

function findNumberDefaultViolation(
  arg: RuntimeCommandArg,
  argPath: string
): string | null {
  if (arg.type !== "number" || arg.default === undefined) {
    return null;
  }

  const parsedValue = Number(arg.default);
  if (!Number.isFinite(parsedValue)) {
    return `${argPath}.default must be a valid number string.`;
  }

  if (typeof arg.validation?.min === "number" && parsedValue < arg.validation.min) {
    return `${argPath}.default must be greater than or equal to min.`;
  }
  if (typeof arg.validation?.max === "number" && parsedValue > arg.validation.max) {
    return `${argPath}.default must be less than or equal to max.`;
  }

  return null;
}

function findArgBusinessRuleViolation(
  command: RuntimeCommand,
  arg: RuntimeCommandArg,
  commandIndex: number,
  argIndex: number
): string | null {
  const argPath = `commands[${commandIndex}].args[${argIndex}]`;
  const labelKeyViolation = findLocalizedTextViolation(arg.label, `${argPath}.label`);
  if (labelKeyViolation) {
    return labelKeyViolation;
  }

  if (
    typeof arg.validation?.min === "number" &&
    typeof arg.validation?.max === "number" &&
    arg.validation.min > arg.validation.max
  ) {
    return `${argPath}.validation.min must be less than or equal to max.`;
  }

  const defaultViolation = findNumberDefaultViolation(arg, argPath);
  if (defaultViolation) {
    return defaultViolation;
  }

  if (command.args && command.args.filter((item) => item.key === arg.key).length > 1) {
    return `${argPath}.key must be unique within the command.`;
  }

  return null;
}

function findCommandBusinessRuleViolation(
  command: RuntimeCommand,
  commandIndex: number
): string | null {
  const commandPath = `commands[${commandIndex}]`;
  const nameKeyViolation = findLocalizedTextViolation(command.name, `${commandPath}.name`);
  if (nameKeyViolation) {
    return nameKeyViolation;
  }
  const descriptionKeyViolation = findLocalizedTextViolation(
    command.description,
    `${commandPath}.description`
  );
  if (descriptionKeyViolation) {
    return descriptionKeyViolation;
  }
  if (command.tags.some((tag) => tag.trim().length === 0)) {
    return `${commandPath}.tags must not contain blank items.`;
  }
  if (isBlankString(command.template)) {
    return `${commandPath}.template must not be blank.`;
  }

  const missingTemplateToken = findMissingTemplateToken(command, commandPath);
  if (missingTemplateToken) {
    return missingTemplateToken;
  }

  for (const [argIndex, arg] of (command.args ?? []).entries()) {
    const violation = findArgBusinessRuleViolation(command, arg, commandIndex, argIndex);
    if (violation) {
      return violation;
    }
  }

  return null;
}

export function findRuntimeCommandFileBusinessRuleViolation(
  file: RuntimeCommandFile
): string | null {
  const metaNameViolation = findLocalizedTextViolation(file._meta?.name, "_meta.name");
  if (metaNameViolation) {
    return metaNameViolation;
  }
  const metaDescriptionViolation = findLocalizedTextViolation(
    file._meta?.description,
    "_meta.description"
  );
  if (metaDescriptionViolation) {
    return metaDescriptionViolation;
  }
  if (isBlankString(file._meta?.author)) {
    return "_meta.author must not be blank.";
  }
  if (isBlankString(file._meta?.version)) {
    return "_meta.version must not be blank.";
  }
  if (isBlankString(file._meta?.source)) {
    return "_meta.source must not be blank.";
  }

  for (const [commandIndex, command] of file.commands.entries()) {
    const violation = findCommandBusinessRuleViolation(command, commandIndex);
    if (violation) {
      return violation;
    }
  }

  for (const [commandIndex, command] of file.commands.entries()) {
    for (const [prerequisiteIndex, prerequisite] of (command.prerequisites ?? []).entries()) {
      if (prerequisite.check.trim().length === 0) {
        return `commands[${commandIndex}].prerequisites[${prerequisiteIndex}].check must not be blank.`;
      }
    }
  }

  return null;
}
