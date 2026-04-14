import { basename } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeMaybeText(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseCommandOverlay(command, contextLabel) {
  assertCondition(isPlainObject(command), `${contextLabel} must be an object.`);

  const args = command.args;
  if (args !== undefined) {
    assertCondition(isPlainObject(args), `${contextLabel}.args must be an object.`);
    for (const [key, argOverlay] of Object.entries(args)) {
      assertCondition(isPlainObject(argOverlay), `${contextLabel}.args.${key} must be an object.`);
    }
  }

  const prerequisites = command.prerequisites;
  if (prerequisites !== undefined) {
    assertCondition(
      isPlainObject(prerequisites),
      `${contextLabel}.prerequisites must be an object.`
    );
    for (const [key, prereqOverlay] of Object.entries(prerequisites)) {
      assertCondition(
        isPlainObject(prereqOverlay),
        `${contextLabel}.prerequisites.${key} must be an object.`
      );
    }
  }

  return {
    name: normalizeMaybeText(command.name),
    description: normalizeMaybeText(command.description),
    args:
      isPlainObject(args)
        ? Object.fromEntries(
            Object.entries(args).map(([key, value]) => [
              key,
              {
                label: normalizeMaybeText(value.label),
                placeholder: normalizeMaybeText(value.placeholder),
                description: normalizeMaybeText(value.description)
              }
            ])
          )
        : undefined,
    prerequisites:
      isPlainObject(prerequisites)
        ? Object.fromEntries(
            Object.entries(prerequisites).map(([key, value]) => [
              key,
              {
                displayName: normalizeMaybeText(value.displayName),
                resolutionHint: normalizeMaybeText(value.resolutionHint)
              }
            ])
          )
        : undefined
  };
}

/**
 * 读取单个 locale overlay（比如 commands/catalog/locales/zh/_network.yaml）。
 *
 * 兼容 legacy 仓库：如果 overlay 不存在则返回空对象，不报错。
 */
export function parseYamlCatalogLocaleOverlay(filePath) {
  if (!existsSync(filePath)) {
    return {
      filePath,
      fileName: basename(filePath),
      meta: {},
      commands: {},
      prerequisites: {}
    };
  }

  const raw = readFileSync(filePath, "utf8");
  const parsed = parse(raw);
  assertCondition(
    parsed && typeof parsed === "object" && !Array.isArray(parsed),
    `${basename(filePath)} must contain a top-level object.`
  );

  const meta = parsed.meta;
  if (meta !== undefined) {
    assertCondition(isPlainObject(meta), `${basename(filePath)} meta must be an object.`);
  }

  const commands = parsed.commands;
  if (commands !== undefined) {
    assertCondition(
      isPlainObject(commands),
      `${basename(filePath)} commands must be a key-based object.`
    );
  }

  const prerequisites = parsed.prerequisites;
  if (prerequisites !== undefined) {
    assertCondition(
      isPlainObject(prerequisites),
      `${basename(filePath)} prerequisites must be a key-based object.`
    );
  }

  const normalizedCommands = isPlainObject(commands)
    ? Object.fromEntries(
        Object.entries(commands).map(([key, value]) => [
          key,
          parseCommandOverlay(value, `${basename(filePath)} commands.${key}`)
        ])
      )
    : {};

  const normalizedPrereqs = isPlainObject(prerequisites)
    ? Object.fromEntries(
        Object.entries(prerequisites).map(([key, value]) => {
          assertCondition(
            isPlainObject(value),
            `${basename(filePath)} prerequisites.${key} must be an object.`
          );
          return [
            key,
            {
              displayName: normalizeMaybeText(value.displayName),
              resolutionHint: normalizeMaybeText(value.resolutionHint)
            }
          ];
        })
      )
    : {};

  return {
    filePath,
    fileName: basename(filePath),
    meta: {
      name: normalizeMaybeText(meta?.name),
      description: normalizeMaybeText(meta?.description)
    },
    commands: normalizedCommands,
    prerequisites: normalizedPrereqs
  };
}

