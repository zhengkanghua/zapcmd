import { loadBuiltinCommandTemplates } from "./runtimeLoader";

export type {
  CommandArg,
  CommandExecutionTemplate,
  CommandTemplate,
  ResolvedCommandExecution
} from "./types";

export const commandTemplates = loadBuiltinCommandTemplates();
