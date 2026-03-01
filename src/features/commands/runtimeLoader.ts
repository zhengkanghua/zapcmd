import type { CommandTemplate } from "./types";
import type { RuntimeCommandFile, RuntimePlatform } from "./runtimeTypes";
import { mapRuntimeCommandToTemplate } from "./runtimeMapper";
import { isRuntimeCommandFile } from "./schemaGuard";

const builtinModules = import.meta.glob("../../../assets/runtime_templates/commands/builtin/_*.json", {
  eager: true
}) as Record<string, { default: unknown }>;

function detectRuntimePlatform(): RuntimePlatform {
  if (typeof navigator !== "undefined") {
    const agent = navigator.userAgent.toLowerCase();
    if (agent.includes("windows")) {
      return "win";
    }
    if (agent.includes("mac")) {
      return "mac";
    }
    if (agent.includes("linux")) {
      return "linux";
    }
  }

  return "all";
}

function shouldKeepCommand(commandPlatform: RuntimePlatform, runtimePlatform: RuntimePlatform): boolean {
  return commandPlatform === "all" || runtimePlatform === "all" || commandPlatform === runtimePlatform;
}

interface LoadOptions {
  runtimePlatform?: RuntimePlatform;
}

interface RuntimePayloadEntry {
  sourceId: string;
  payload: unknown;
}

export interface UserCommandJsonFile {
  path: string;
  content: string;
  modifiedMs: number;
}

export type CommandLoadIssueCode = "invalid-json" | "invalid-schema" | "duplicate-id";

export interface CommandLoadIssue {
  code: CommandLoadIssueCode;
  sourceId: string;
  commandId?: string;
}

export interface LoadTemplatesResult {
  templates: CommandTemplate[];
  issues: CommandLoadIssue[];
  sourceByCommandId: Record<string, string>;
}

function loadTemplatesFromPayloadEntries(
  entries: RuntimePayloadEntry[],
  options: LoadOptions = {}
): LoadTemplatesResult {
  const runtimePlatform = options.runtimePlatform ?? detectRuntimePlatform();
  const ids = new Set<string>();
  const templates: CommandTemplate[] = [];
  const issues: CommandLoadIssue[] = [];
  const sourceByCommandId: Record<string, string> = {};

  for (const entry of entries) {
    const payload = entry.payload;
    if (!isRuntimeCommandFile(payload)) {
      // Invalid file is ignored to avoid breaking launcher startup.
      console.warn(`[commands] invalid runtime command file skipped: ${entry.sourceId}`);
      issues.push({
        code: "invalid-schema",
        sourceId: entry.sourceId
      });
      continue;
    }

    const runtimeFile = payload as RuntimeCommandFile;
    for (const command of runtimeFile.commands) {
      if (!shouldKeepCommand(command.platform, runtimePlatform)) {
        continue;
      }
      if (ids.has(command.id)) {
        console.warn(`[commands] duplicate command id skipped: ${command.id}`);
        issues.push({
          code: "duplicate-id",
          sourceId: entry.sourceId,
          commandId: command.id
        });
        continue;
      }

      ids.add(command.id);
      templates.push(mapRuntimeCommandToTemplate(command));
      sourceByCommandId[command.id] = entry.sourceId;
    }
  }

  return {
    templates,
    issues,
    sourceByCommandId
  };
}

export function loadBuiltinCommandTemplates(options: LoadOptions = {}): CommandTemplate[] {
  return loadBuiltinCommandTemplatesWithReport(options).templates;
}

export function loadBuiltinCommandTemplatesWithReport(options: LoadOptions = {}): LoadTemplatesResult {
  const entries = Object.entries(builtinModules)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([filePath, module]) => ({
      sourceId: filePath,
      payload: module.default
    }));

  return loadTemplatesFromPayloadEntries(entries, options);
}

export function loadUserCommandTemplates(
  files: UserCommandJsonFile[],
  options: LoadOptions = {}
): CommandTemplate[] {
  return loadUserCommandTemplatesWithReport(files, options).templates;
}

export function loadUserCommandTemplatesWithReport(
  files: UserCommandJsonFile[],
  options: LoadOptions = {}
): LoadTemplatesResult {
  const entries: RuntimePayloadEntry[] = [];
  const issues: CommandLoadIssue[] = [];
  for (const file of files) {
    let payload: unknown;
    try {
      payload = JSON.parse(file.content);
    } catch (error) {
      console.warn(`[commands] invalid json skipped: ${file.path}`, error);
      issues.push({
        code: "invalid-json",
        sourceId: file.path
      });
      continue;
    }

    entries.push({
      sourceId: file.path,
      payload
    });
  }

  const loaded = loadTemplatesFromPayloadEntries(entries, options);
  return {
    templates: loaded.templates,
    issues: [...issues, ...loaded.issues],
    sourceByCommandId: loaded.sourceByCommandId
  };
}
