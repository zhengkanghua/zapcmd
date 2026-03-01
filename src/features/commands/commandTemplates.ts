import { loadBuiltinCommandTemplates } from "./runtimeLoader";

export type { CommandArg, CommandTemplate } from "./types";

export const commandTemplates = loadBuiltinCommandTemplates();
