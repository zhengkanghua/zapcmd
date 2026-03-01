import type { HotkeyFieldDefinition } from "../../../features/settings/types";
import {
  LEGACY_GENERAL_SETTINGS_STORAGE_KEY,
  LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY
} from "../../../stores/settingsStore";

export const SETTINGS_HASH_PREFIX = "#/settings/";

export const SETTINGS_STORAGE_KEYS = [
  SETTINGS_STORAGE_KEY,
  LEGACY_HOTKEY_SETTINGS_STORAGE_KEY,
  LEGACY_GENERAL_SETTINGS_STORAGE_KEY
] as const;

export const HOTKEY_DEFINITIONS: HotkeyFieldDefinition[] = [
  { id: "launcher", label: "launcher", scope: "global" },
  { id: "toggleQueue", label: "toggleQueue", scope: "local" },
  { id: "switchFocus", label: "switchFocus", scope: "local" },
  { id: "navigateUp", label: "navigateUp", scope: "local" },
  { id: "navigateDown", label: "navigateDown", scope: "local" },
  { id: "executeSelected", label: "executeSelected", scope: "local" },
  { id: "stageSelected", label: "stageSelected", scope: "local" },
  { id: "escape", label: "escape", scope: "local" },
  { id: "executeQueue", label: "executeQueue", scope: "local" },
  { id: "clearQueue", label: "clearQueue", scope: "local" },
  { id: "removeQueueItem", label: "removeQueueItem", scope: "local" },
  { id: "reorderUp", label: "reorderUp", scope: "local" },
  { id: "reorderDown", label: "reorderDown", scope: "local" }
];
