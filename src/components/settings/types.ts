import type {
  CommandDisplayMode,
  CommandFilterIssue,
  CommandFilterOverride,
  CommandFilterSource,
  CommandFilterStatus,
  CommandManagementGroup,
  CommandLoadIssueView,
  CommandManagementRow,
  CommandManagementSummary,
  CommandManagementViewState,
  CommandSelectOption,
  CommandSortBy,
  CommandSourceFileOption,
  HotkeyFieldDefinition,
  SettingsRoute
} from "../../features/settings/types";
import type { UpdateStatus } from "../../features/update/types";
import type { TerminalOption } from "../../features/terminals/fallbackTerminals";
import type { HotkeyFieldId } from "../../stores/settingsStore";
import type { AppLocale } from "../../i18n";
import type { ThemeMeta } from "../../features/themes/themeRegistry";

export interface SettingsNavItem {
  route: SettingsRoute;
  label: string;
}

export interface SettingsNavProps {
  settingsNavItems: SettingsNavItem[];
  settingsRoute: SettingsRoute;
  settingsErrorRoute: SettingsRoute | null;
}

export interface SettingsHotkeysProps {
  hotkeyGlobalFields: HotkeyFieldDefinition[];
  hotkeySearchFields: HotkeyFieldDefinition[];
  hotkeyQueueFields: HotkeyFieldDefinition[];
  isHotkeyRecording: (field: HotkeyFieldId) => boolean;
  getHotkeyDisplay: (field: HotkeyFieldId) => string;
  hotkeyErrorFields: HotkeyFieldId[];
  hotkeyErrorPrimaryField: HotkeyFieldId | null;
}

export interface SettingsGeneralProps {
  availableTerminals: TerminalOption[];
  terminalLoading: boolean;
  terminalDropdownOpen: boolean;
  terminalFocusIndex: number;
  defaultTerminal: string;
  selectedTerminalOption: TerminalOption | null;
  selectedTerminalPath: string;
  language: AppLocale;
  languageOptions: Array<{ value: AppLocale; label: string }>;
  autoCheckUpdate: boolean;
  launchAtLogin: boolean;
}

export interface SettingsCommandsProps {
  commandRows: CommandManagementRow[];
  commandSummary: CommandManagementSummary;
  commandLoadIssues: CommandLoadIssueView[];
  commandFilteredCount: number;
  commandView: CommandManagementViewState;
  commandSourceOptions: CommandSelectOption<CommandFilterSource>[];
  commandStatusOptions: CommandSelectOption<CommandFilterStatus>[];
  commandOverrideOptions: CommandSelectOption<CommandFilterOverride>[];
  commandIssueOptions: CommandSelectOption<CommandFilterIssue>[];
  commandSortOptions: CommandSelectOption<CommandSortBy>[];
  commandDisplayModeOptions: CommandSelectOption<CommandDisplayMode>[];
  commandSourceFileOptions: CommandSourceFileOption[];
  commandGroups: CommandManagementGroup[];
}

export interface SettingsAppearanceProps {
  windowOpacity: number;
  theme: string;
  blurEnabled: boolean;
  themes: ReadonlyArray<ThemeMeta>;
}

export interface SettingsAboutProps {
  appVersion: string;
  runtimePlatform: string;
  updateStatus: UpdateStatus;
}
