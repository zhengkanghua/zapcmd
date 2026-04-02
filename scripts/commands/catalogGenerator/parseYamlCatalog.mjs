import { basename } from "node:path";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const MODULE_FILE_PATTERN = /^_[a-z0-9]+(?:-[a-z0-9]+)*\.yaml$/u;
const MODULE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
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
  assertCondition(typeof meta.name === "string" && meta.name.trim().length > 0, `${fileName} meta.name is required.`);
  assertCondition(
    typeof meta.moduleSlug === "string" && MODULE_SLUG_PATTERN.test(meta.moduleSlug.trim()),
    `${fileName} meta.moduleSlug must be a valid slug.`
  );

  const commands = parsed.commands;
  assertCondition(Array.isArray(commands) && commands.length > 0, `${fileName} must contain commands[].`);

  return {
    filePath,
    fileName,
    moduleSlug: meta.moduleSlug.trim(),
    meta: {
      name: meta.name.trim(),
      description:
        typeof meta.description === "string" && meta.description.trim().length > 0
          ? meta.description.trim()
          : undefined
    },
    commands
  };
}
