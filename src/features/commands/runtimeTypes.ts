export type RuntimeLocalizedText = Record<string, string>;
export type RuntimeLocalizedTextOrString = RuntimeLocalizedText | string;

export type RuntimeCategory =
  | "network"
  | "docker"
  | "git"
  | "system"
  | "file"
  | "package"
  | "database"
  | "cloud"
  | "kubernetes"
  | "ssh"
  | "security"
  | "dev"
  | "custom";

export type RuntimePlatform = "all" | "win" | "mac" | "linux";
export type RuntimeShell = "bash" | "zsh" | "powershell" | "cmd";
export type RuntimeArgType = "text" | "number" | "path" | "select";
export type RuntimePrerequisiteType = "binary" | "shell" | "network" | "permission" | "env";

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

export interface RuntimeCommandPrerequisite {
  id: string;
  type: RuntimePrerequisiteType;
  required: boolean;
  check: string;
  installHint?: RuntimeLocalizedTextOrString;
  fallbackCommandId?: string;
}

export interface RuntimeCommand {
  id: string;
  name: RuntimeLocalizedTextOrString;
  description?: RuntimeLocalizedTextOrString;
  tags: string[];
  category: RuntimeCategory;
  platform: RuntimePlatform;
  template: string;
  shell?: RuntimeShell;
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
