import { basename } from "node:path";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const MODULE_FILE_PATTERN = /^_[a-z0-9]+(?:-[a-z0-9]+)*\.yaml$/u;
const MODULE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const LOCALIZED_COMMAND_FIELDS = ["name", "description"];
const LOCALIZED_ARG_FIELDS = ["label", "placeholder", "description"];
const LOCALIZED_PREREQUISITE_FIELDS = ["displayName", "resolutionHint", "installHint"];

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoLocalizedTextFields(target, fieldNames, fileName, pathLabel) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return;
  }

  for (const fieldName of fieldNames) {
    if (Object.prototype.hasOwnProperty.call(target, fieldName)) {
      throw new Error(
        `${fileName} must not define localized text in base yaml at ${pathLabel}.${fieldName}. Move it to commands/catalog/locales/<locale>/${fileName}.`
      );
    }
  }
}

export function parseYamlCatalog(filePath) {
  const fileName = basename(filePath);
  assertCondition(
    MODULE_FILE_PATTERN.test(fileName),
    `Unsupported catalog file name: ${fileName}`
  );

  const raw = readFileSync(filePath, "utf8");
  const parsed = parse(raw);
  assertCondition(parsed && typeof parsed === "object" && !Array.isArray(parsed), `${fileName} must contain a top-level object.`);

  const meta = parsed.meta;
  assertCondition(meta && typeof meta === "object" && !Array.isArray(meta), `${fileName} must contain meta.`);
  assertCondition(
    typeof meta.moduleSlug === "string" && MODULE_SLUG_PATTERN.test(meta.moduleSlug.trim()),
    `${fileName} meta.moduleSlug must be a valid slug.`
  );
  assertNoLocalizedTextFields(meta, ["name", "description"], fileName, "meta");

  const commands = parsed.commands;
  assertCondition(Array.isArray(commands) && commands.length > 0, `${fileName} must contain commands[].`);

  for (const command of commands) {
    assertCondition(
      command && typeof command === "object" && !Array.isArray(command),
      `${fileName} commands[] must contain objects.`
    );
    const commandId =
      typeof command.id === "string" && command.id.trim().length > 0
        ? command.id.trim()
        : "<unknown>";
    assertNoLocalizedTextFields(command, LOCALIZED_COMMAND_FIELDS, fileName, `commands.${commandId}`);

    for (const arg of command.args ?? []) {
      if (!arg || typeof arg !== "object" || Array.isArray(arg)) {
        continue;
      }
      const argKey =
        typeof arg.key === "string" && arg.key.trim().length > 0 ? arg.key.trim() : "<unknown>";
      assertNoLocalizedTextFields(
        arg,
        LOCALIZED_ARG_FIELDS,
        fileName,
        `commands.${commandId}.args.${argKey}`
      );
    }

    for (const prerequisite of command.prerequisites ?? []) {
      if (!prerequisite || typeof prerequisite !== "object" || Array.isArray(prerequisite)) {
        continue;
      }
      const prerequisiteId =
        typeof prerequisite.id === "string" && prerequisite.id.trim().length > 0
          ? prerequisite.id.trim()
          : "<unknown>";
      assertNoLocalizedTextFields(
        prerequisite,
        LOCALIZED_PREREQUISITE_FIELDS,
        fileName,
        `commands.${commandId}.prerequisites.${prerequisiteId}`
      );
    }
  }

  return {
    filePath,
    fileName,
    moduleSlug: meta.moduleSlug.trim(),
    meta: {},
    commands
  };
}
