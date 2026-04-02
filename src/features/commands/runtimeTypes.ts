import type {
  CommandPrerequisite,
  CommandPrerequisiteType
} from "./prerequisiteTypes";

export type RuntimeLocalizedText = Record<string, string>;
export type RuntimeLocalizedTextOrString = RuntimeLocalizedText | string;

export type RuntimeCategory = string;

export type RuntimePlatform = "all" | "win" | "mac" | "linux";
export type RuntimeArgType = "text" | "number" | "path" | "select";
export type RuntimePrerequisiteType = CommandPrerequisiteType;

export interface RuntimeCommandArgValidation {
  pattern?: string;
  min?: number;
  max?: number;
  options?: string[];
  errorMessage?: RuntimeLocalizedTextOrString;
}

export interface RuntimeCommandArg {
  key: string;
  label: RuntimeLocalizedTextOrString;
  type: RuntimeArgType;
  required?: boolean;
  default?: string;
  placeholder?: string;
  validation?: RuntimeCommandArgValidation;
}

export interface RuntimeCommandPrerequisite extends Omit<CommandPrerequisite, "installHint"> {
  installHint?: RuntimeLocalizedTextOrString;
}

export interface RuntimeCommand {
  id: string;
  name: RuntimeLocalizedTextOrString;
  description?: RuntimeLocalizedTextOrString;
  tags: string[];
  category: RuntimeCategory;
  platform: RuntimePlatform;
  template: string;
  adminRequired: boolean;
  dangerous?: boolean;
  args?: RuntimeCommandArg[];
  prerequisites?: RuntimeCommandPrerequisite[];
}

export interface RuntimeCommandFileMeta {
  name?: RuntimeLocalizedTextOrString;
  author?: string;
  version?: string;
  description?: RuntimeLocalizedTextOrString;
  source?: string;
}

export interface RuntimeCommandFile {
  _meta?: RuntimeCommandFileMeta;
  commands: RuntimeCommand[];
}
