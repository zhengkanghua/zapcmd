import { invoke } from "@tauri-apps/api/core";

import type { TerminalOption } from "../features/terminals/fallbackTerminals";
import type {
  UserCommandFileScanResult,
  UserCommandJsonFile
} from "../features/commands/userCommandSourceTypes";

interface UserCommandFilePayload {
  path: string;
  content: string;
  modified_ms: number;
  size?: number;
}

interface UserCommandFileScanEntryPayload {
  path: string;
  modified_ms: number;
  size: number;
}

interface UserCommandFileScanResultPayload {
  files?: UserCommandFileScanEntryPayload[];
  issues?: Array<{
    path: string;
    reason: string;
  }>;
}

function normalizeUserCommandFilePayload(item: UserCommandFilePayload): UserCommandJsonFile {
  return {
    path: item.path,
    content: item.content,
    modifiedMs: Number.isFinite(item.modified_ms) ? item.modified_ms : 0,
    size: Number.isFinite(item.size) ? item.size : 0
  };
}

export async function readAvailableTerminals(): Promise<TerminalOption[]> {
  return invoke<TerminalOption[]>("get_available_terminals");
}

export async function refreshAvailableTerminals(): Promise<TerminalOption[]> {
  return invoke<TerminalOption[]>("refresh_available_terminals");
}

export async function readLauncherHotkey(): Promise<string> {
  return invoke<string>("get_launcher_hotkey");
}

export async function readRuntimePlatform(): Promise<string> {
  return invoke<string>("get_runtime_platform");
}

export async function readAutoStartEnabled(): Promise<boolean> {
  return invoke<boolean>("get_autostart_enabled");
}

export async function writeAutoStartEnabled(enabled: boolean): Promise<void> {
  await invoke("set_autostart_enabled", { enabled });
}

export async function writeLauncherHotkey(hotkey: string): Promise<void> {
  await invoke("update_launcher_hotkey", { hotkey });
}

export async function requestHideMainWindow(): Promise<void> {
  await invoke("hide_main_window");
}

export async function requestSetMainWindowSize(width: number, height: number): Promise<void> {
  await invoke("set_main_window_size", { width, height });
}

export async function requestAnimateMainWindowSize(width: number, height: number): Promise<void> {
  await invoke("animate_main_window_size", { width, height });
}

export async function requestResizeMainWindowForReveal(
  width: number,
  height: number
): Promise<void> {
  await invoke("resize_main_window_for_reveal", { width, height });
}

export async function readUserCommandsDir(): Promise<string> {
  return invoke<string>("get_user_commands_dir");
}

export async function scanUserCommandFiles(): Promise<UserCommandFileScanResult> {
  const payload = await invoke<UserCommandFileScanResultPayload>("scan_user_command_files");
  const files = Array.isArray(payload?.files)
    ? payload.files.map((item) => ({
        path: item.path,
        modifiedMs: Number.isFinite(item.modified_ms) ? item.modified_ms : 0,
        size: Number.isFinite(item.size) ? item.size : 0
      }))
    : [];
  const issues = Array.isArray(payload?.issues)
    ? payload.issues.map((item) => ({
        path: item.path,
        reason: item.reason
      }))
    : [];

  return { files, issues };
}

export async function readUserCommandFile(path: string): Promise<UserCommandJsonFile> {
  const payload = await invoke<UserCommandFilePayload>("read_user_command_file", { path });
  return normalizeUserCommandFilePayload(payload);
}
