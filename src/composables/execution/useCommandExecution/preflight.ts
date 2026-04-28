import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type {
  StagedCommand,
  StagedCommandPreflightCache
} from "../../../features/launcher/types";
import { type CommandPreflightIssue, runCommandPreflight } from "./helpers";
import type { UseCommandExecutionOptions } from "./model";
import { buildStagedPreflightCache } from "./stagedPreflightCache";

type CommandPrerequisites =
  | CommandTemplate["prerequisites"]
  | StagedCommand["prerequisites"];

export function hasPrerequisites(
  prerequisites: CommandPrerequisites
): prerequisites is NonNullable<CommandPrerequisites> {
  return Array.isArray(prerequisites) && prerequisites.length > 0;
}

export function collectFailedPreflightIssues(
  prerequisites: CommandPrerequisites,
  results: Awaited<ReturnType<NonNullable<UseCommandExecutionOptions["runCommandPreflight"]>>>,
  title?: string
): CommandPreflightIssue[] {
  return results.flatMap((result, index) =>
    result.ok === true
      ? []
      : [
          {
            title,
            prerequisite: prerequisites?.[index],
            result
          }
        ]
  );
}

export async function collectCommandPreflightIssues(
  options: UseCommandExecutionOptions,
  prerequisites: CommandPrerequisites,
  title?: string
): Promise<CommandPreflightIssue[]> {
  if (!hasPrerequisites(prerequisites)) {
    return [];
  }

  return collectFailedPreflightIssues(
    prerequisites,
    await runCommandPreflight(options, prerequisites),
    title
  );
}

export async function collectCommandPreflightCache(
  options: UseCommandExecutionOptions,
  title: string,
  prerequisites: CommandPrerequisites
): Promise<StagedCommandPreflightCache | undefined> {
  const issues = await collectCommandPreflightIssues(options, prerequisites, title);

  return buildStagedPreflightCache(title, issues);
}

export function createEmptyPreflightCache(): StagedCommandPreflightCache {
  return {
    checkedAt: Date.now(),
    issueCount: 0,
    source: "issues",
    issues: []
  };
}

export async function collectStagedCommandPreflight(
  options: UseCommandExecutionOptions,
  command: StagedCommand
): Promise<{
  cache: StagedCommandPreflightCache;
  issues: CommandPreflightIssue[];
}> {
  const issues = await collectCommandPreflightIssues(options, command.prerequisites, command.title);
  return {
    cache: buildStagedPreflightCache(command.title, issues) ?? createEmptyPreflightCache(),
    issues
  };
}
