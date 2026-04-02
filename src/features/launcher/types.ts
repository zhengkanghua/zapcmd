import type {
  CommandArg,
  CommandExecutionTemplate,
  ResolvedCommandExecution
} from "../commands/commandTemplates";
import type { CommandPrerequisite } from "../commands/prerequisiteTypes";

export interface StagedCommandPreflightCache {
  checkedAt: number;
  issueCount: number;
  source: "issues" | "system-failure";
  issues: string[];
}

export interface StagedCommand {
  id: string;
  title: string;
  renderedPreview: string;
  executionTemplate: CommandExecutionTemplate;
  execution: ResolvedCommandExecution;
  rawPreview: string;
  args: CommandArg[];
  argValues: Record<string, string>;
  prerequisites?: CommandPrerequisite[];
  preflightCache?: StagedCommandPreflightCache;
  adminRequired?: boolean;
  dangerous?: boolean;
}
