import type { Ref } from "vue";
import type { CommandLoadIssue } from "../../../features/commands/runtimeLoader";
import type { CommandTemplate } from "../../../features/commands/types";
import type {
  UserCommandFileScanResult,
  UserCommandJsonFile as UserCommandSingleFile
} from "../../../features/commands/userCommandSourceTypes";
import type { AppLocale } from "../../../i18n";

export const USER_COMMAND_SOURCE_ID = "user-command-files";
export type CommandCatalogStatus = "idle" | "loading" | "ready" | "error";

export interface UseCommandCatalogOptions {
  isTauriRuntime: () => boolean;
  scanUserCommandFiles?: () => Promise<UserCommandFileScanResult>;
  readUserCommandFile?: (path: string) => Promise<UserCommandSingleFile>;
  readRuntimePlatform?: () => Promise<string>;
  disabledCommandIds?: Readonly<Ref<string[]>>;
  locale?: Readonly<Ref<AppLocale>>;
  activated?: Readonly<Ref<boolean>>;
}

export interface UseCommandCatalogReturn {
  commandTemplates: Ref<CommandTemplate[]>;
  allCommandTemplates: Ref<CommandTemplate[]>;
  commandSourceById: Ref<Record<string, string>>;
  userCommandSourceById: Ref<Record<string, string>>;
  overriddenCommandIds: Ref<string[]>;
  loadIssues: Ref<CommandLoadIssue[]>;
  catalogReady: Ref<boolean>;
  catalogStatus: Ref<CommandCatalogStatus>;
  refreshUserCommands: () => Promise<void>;
}
