import type { MotionPresetMeta } from "../../features/motion/motionRegistry";
import type {
  CommandFilterIssue,
  CommandFilterOverride,
  CommandFilterSource,
  CommandFilterStatus,
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
import type {
  HotkeyFieldId,
  PointerActionFieldId,
  SearchResultPointerAction,
  TerminalReusePolicy
} from "../../stores/settingsStore";
import type { AppLocale } from "../../i18n";
import type { ThemeMeta } from "../../features/themes/themeRegistry";
import type { SettingsNavIconName } from "./ui/settingsNavIcon";

export interface SettingsNavItem {
  id: SettingsRoute;
  label: string;
  icon: SettingsNavIconName;
}

export interface SettingsSegmentNavItem extends SettingsNavItem {
  panelId: string;
}

export type SettingsWindowProps = SettingsHotkeysProps &
  SettingsCommandsProps &
  SettingsGeneralProps &
  SettingsAppearanceProps &
  SettingsAboutProps & {
  settingsNavItems: SettingsNavItem[];
  settingsRoute: SettingsRoute;
};

export interface SettingsHotkeysProps {
  hotkeyGlobalFields: HotkeyFieldDefinition[];
  hotkeySearchFields: HotkeyFieldDefinition[];
  hotkeyQueueFields: HotkeyFieldDefinition[];
  pointerActionFields: Array<{ id: PointerActionFieldId; label: string }>;
  pointerActionOptions: Array<{ value: SearchResultPointerAction; label: string }>;
  getHotkeyValue: (field: HotkeyFieldId) => string;
  getPointerActionValue: (field: PointerActionFieldId) => SearchResultPointerAction;
  hotkeyErrorFields: HotkeyFieldId[];
  hotkeyErrorMessage: string;
}

export interface SettingsGeneralProps {
  availableTerminals: TerminalOption[];
  terminalLoading: boolean;
  defaultTerminal: string;
  terminalReusePolicy: TerminalReusePolicy;
  selectedTerminalPath: string;
  language: AppLocale;
  languageOptions: Array<{ value: AppLocale; label: string }>;
  autoCheckUpdate: boolean;
  launchAtLogin: boolean;
  alwaysElevatedTerminal: boolean;
  queueAutoClearOnSuccess: boolean;
  generalErrorMessage: string;
  showAlwaysElevatedTerminal: boolean;
}

export interface SettingsCommandsProps {
  commandRows: CommandManagementRow[];
  visibleCommandRows: CommandManagementRow[];
  commandSummary: CommandManagementSummary;
  commandLoadIssues: CommandLoadIssueView[];
  commandFilteredCount: number;
  renderedCommandRowCount: number;
  commandView: CommandManagementViewState;
  commandSourceOptions: CommandSelectOption<CommandFilterSource>[];
  commandStatusOptions: CommandSelectOption<CommandFilterStatus>[];
  commandCategoryOptions: CommandSelectOption<string>[];
  commandOverrideOptions: CommandSelectOption<CommandFilterOverride>[];
  commandIssueOptions: CommandSelectOption<CommandFilterIssue>[];
  commandSortOptions: CommandSelectOption<CommandSortBy>[];
  commandSourceFileOptions: CommandSourceFileOption[];
  advanceVisibleCommandRows: () => void;
}

export interface SettingsAppearanceProps {
  windowOpacity: number;
  theme: string;
  blurEnabled: boolean;
  motionPreset: string;
  themes: ReadonlyArray<ThemeMeta>;
  motionPresets: ReadonlyArray<MotionPresetMeta>;
}

export interface SettingsAboutProps {
  appVersion: string;
  runtimePlatform: string;
  updateStatus: UpdateStatus;
  homepageActionStatus?: {
    tone: "success" | "error";
    message: string;
  } | null;
}
