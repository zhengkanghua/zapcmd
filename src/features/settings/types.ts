import type { HotkeyFieldId } from "../../stores/settingsStore";

export type SettingsRoute = "hotkeys" | "general" | "commands" | "appearance" | "about";

export interface HotkeyFieldDefinition {
  id: HotkeyFieldId;
  label: string;
  scope: "global" | "local";
  optional?: boolean;
}

export interface CommandManagementRow {
  id: string;
  title: string;
  category: string;
  source: "builtin" | "user";
  sourcePath?: string;
  sourceFileLabel?: string;
  overridesBuiltin: boolean;
  enabled: boolean;
  hasLoadIssue: boolean;
}

export interface CommandManagementSummary {
  total: number;
  enabled: number;
  disabled: number;
  userDefined: number;
  overridden: number;
}

export interface CommandLoadIssueView {
  code:
    | "read-failed"
    | "invalid-json"
    | "invalid-schema"
    | "duplicate-id"
    | "invalid-command-config";
  stage: "read" | "parse" | "schema" | "merge" | "command";
  sourceId: string;
  reason: string;
  commandId?: string;
  message: string;
}

export type CommandFilterSource = "all" | "builtin" | "user";
export type CommandFilterStatus = "all" | "enabled" | "disabled";
export type CommandFilterOverride = "all" | "overridden";
export type CommandFilterIssue = "all" | "with-issues";
export type CommandSortBy = "default" | "title" | "category" | "source" | "status";
export type CommandDisplayMode = "list";

export interface CommandSourceFileOption {
  value: string;
  label: string;
  count: number;
}

export interface CommandSelectOption<T extends string> {
  value: T;
  label: string;
}

export interface CommandManagementViewState {
  query: string;
  sourceFilter: CommandFilterSource;
  statusFilter: CommandFilterStatus;
  categoryFilter: string;
  overrideFilter: CommandFilterOverride;
  issueFilter: CommandFilterIssue;
  fileFilter: string;
  sortBy: CommandSortBy;
  displayMode: CommandDisplayMode;
}

export interface CommandManagementGroup {
  key: string;
  title: string;
  count: number;
  sourcePath?: string;
  rows: CommandManagementRow[];
}
