import type { CommandPrerequisite } from "./prerequisiteTypes";
import type { RuntimeScriptRunner } from "./runtimeTypes";

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

export type CommandExecutionTemplate =
  | {
      kind: "exec";
      program: string;
      args: string[];
      stdinArgKey?: string;
    }
  | {
      kind: "script";
      runner: RuntimeScriptRunner;
      command: string;
    };

export type ResolvedCommandExecution =
  | {
      kind: "exec";
      program: string;
      args: string[];
      stdinArgKey?: string;
      stdin?: string;
    }
  | {
      kind: "script";
      runner: RuntimeScriptRunner;
      command: string;
    };

export interface CommandTemplate {
  id: string;
  title: string;
  description: string;
  preview: string;
  execution?: CommandExecutionTemplate;
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
