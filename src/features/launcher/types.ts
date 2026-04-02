import type {
  CommandArg,
  CommandExecutionTemplate,
  ResolvedCommandExecution
} from "../commands/commandTemplates";
import type { CommandPrerequisite } from "../commands/prerequisiteTypes";

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
  adminRequired?: boolean;
  dangerous?: boolean;
}
