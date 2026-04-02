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
export type RuntimeScriptRunner = "powershell" | "pwsh" | "cmd" | "bash" | "sh";

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

export interface RuntimeCommandPrerequisite
  extends Omit<
    CommandPrerequisite,
    "displayName" | "resolutionHint" | "installHint"
  > {
  displayName?: RuntimeLocalizedTextOrString;
  resolutionHint?: RuntimeLocalizedTextOrString;
  installHint?: RuntimeLocalizedTextOrString;
}

export interface RuntimeExecCommand {
  program: string;
  args: string[];
  stdinArgKey?: string;
}

export interface RuntimeScriptCommand {
  runner: RuntimeScriptRunner;
  command: string;
}

interface RuntimeCommandBase {
  id: string;
  name: RuntimeLocalizedTextOrString;
  description?: RuntimeLocalizedTextOrString;
  tags: string[];
  category: RuntimeCategory;
  platform: RuntimePlatform;
  adminRequired: boolean;
  dangerous?: boolean;
  args?: RuntimeCommandArg[];
  prerequisites?: RuntimeCommandPrerequisite[];
}

export type RuntimeCommand =
  | (RuntimeCommandBase & {
      exec: RuntimeExecCommand;
      script?: never;
    })
  | (RuntimeCommandBase & {
      script: RuntimeScriptCommand;
      exec?: never;
    });

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
