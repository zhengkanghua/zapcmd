import type { CommandArg } from "../commands/commandTemplates";
import type { CommandPrerequisite } from "../commands/prerequisiteTypes";

export interface StagedCommand {
  id: string;
  title: string;
  renderedCommand: string;
  rawPreview: string;
  args: CommandArg[];
  argValues: Record<string, string>;
  prerequisites?: CommandPrerequisite[];
  adminRequired?: boolean;
  dangerous?: boolean;
}
