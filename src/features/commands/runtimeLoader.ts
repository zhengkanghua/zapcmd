import type { CommandTemplate } from "./types";
import { findCommandBlockingIssue } from "./commandIssues";
import type { RuntimeCommandFile, RuntimePlatform } from "./runtimeTypes";
import { mapRuntimeCommandToTemplate } from "./runtimeMapper";
import { validateRuntimeCommandFile } from "./schemaValidation";
import type { UserCommandJsonFile } from "./userCommandSourceTypes";
import type { CommandLoadIssue } from "./runtimeIssues";

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

export interface LoadOptions {
  runtimePlatform?: RuntimePlatform;
}

export interface RuntimePayloadEntry {
  sourceId: string;
  payload: unknown;
}

export type { UserCommandJsonFile } from "./userCommandSourceTypes";
export type { CommandLoadIssue, CommandLoadIssueCode, CommandLoadIssueStage } from "./runtimeIssues";
export { createReadFailedIssue, createScanFailedIssue } from "./runtimeIssues";

function normalizeIssueReason(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return fallback;
  }
  const maxLength = 180;
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function extractIssueReason(error: unknown, fallback: string): string {
  if (error instanceof Error && typeof error.message === "string") {
    return normalizeIssueReason(error.message, fallback);
  }
  if (typeof error === "string") {
    return normalizeIssueReason(error, fallback);
  }
  return fallback;
}

export interface LoadTemplatesResult {
  templates: CommandTemplate[];
  issues: CommandLoadIssue[];
  sourceByCommandId: Record<string, string>;
}

let builtinPayloadEntriesCache: RuntimePayloadEntry[] | null = null;
let builtinPayloadBuildCount = 0;

export function loadCommandTemplatesFromPayloadEntries(
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
    const validation = validateRuntimeCommandFile(payload);
    if (!validation.valid) {
      // Invalid file is ignored to avoid breaking launcher startup.
      console.warn(`[commands] invalid runtime command file skipped: ${entry.sourceId}`);
      issues.push({
        code: "invalid-schema",
        stage: "schema",
        sourceId: entry.sourceId,
        reason: validation.reason
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
          stage: "merge",
          reason: `Duplicate command id "${command.id}" was skipped.`,
          commandId: command.id
        });
        continue;
      }

      ids.add(command.id);
      const template = mapRuntimeCommandToTemplate(command);
      const blockingIssue = findCommandBlockingIssue(template);
      templates.push(
        blockingIssue
          ? {
              ...template,
              blockingIssue
            }
          : template
      );
      if (blockingIssue) {
        issues.push({
          code: "invalid-command-config",
          stage: "command",
          sourceId: entry.sourceId,
          reason: blockingIssue.detail,
          commandId: command.id
        });
      }
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

export function loadBuiltinCommandPayloadEntries(): RuntimePayloadEntry[] {
  if (builtinPayloadEntriesCache) {
    return builtinPayloadEntriesCache;
  }

  builtinPayloadBuildCount += 1;
  builtinPayloadEntriesCache = Object.entries(builtinModules)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([filePath, module]) => ({
      sourceId: filePath,
      payload: module.default
    }));

  return builtinPayloadEntriesCache;
}

export function loadBuiltinCommandTemplatesWithReport(options: LoadOptions = {}): LoadTemplatesResult {
  return loadCommandTemplatesFromPayloadEntries(loadBuiltinCommandPayloadEntries(), options);
}

export function getBuiltinCommandPayloadBuildCountForTest(): number {
  return builtinPayloadBuildCount;
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
        stage: "parse",
        sourceId: file.path,
        reason: extractIssueReason(error, "JSON parse failed.")
      });
      continue;
    }

    entries.push({
      sourceId: file.path,
      payload
    });
  }

  const loaded = loadCommandTemplatesFromPayloadEntries(entries, options);
  return {
    templates: loaded.templates,
    issues: [...issues, ...loaded.issues],
    sourceByCommandId: loaded.sourceByCommandId
  };
}
