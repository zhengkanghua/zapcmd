import type { CommandPrerequisite } from "./prerequisiteTypes";

export interface CommandArg {
  key: string;
  label: string;
  token: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  argType?: "text" | "number" | "path" | "select";
  validationPattern?: string;
  validationError?: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface CommandTemplate {
  id: string;
  title: string;
  description: string;
  preview: string;
  folder: string;
  category: string;
  needsArgs: boolean;
  argLabel?: string;
  argPlaceholder?: string;
  argToken?: string;
  args?: CommandArg[];
  prerequisites?: CommandPrerequisite[];
  adminRequired?: boolean;
  dangerous?: boolean;
}
