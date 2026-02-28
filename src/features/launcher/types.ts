import type { CommandArg } from "../commands/commandTemplates";

export interface StagedCommand {
  id: string;
  title: string;
  renderedCommand: string;
  rawPreview: string;
  args: CommandArg[];
  argValues: Record<string, string>;
  adminRequired?: boolean;
  dangerous?: boolean;
}
