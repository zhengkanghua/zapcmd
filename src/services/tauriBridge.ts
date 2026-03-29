import { invoke } from "@tauri-apps/api/core";

import type { TerminalOption } from "../features/terminals/fallbackTerminals";
import type { UserCommandJsonFile } from "../features/commands/runtimeLoader";

interface UserCommandFilePayload {
  path: string;
  content: string;
  modified_ms: number;
}

export async function readAvailableTerminals(): Promise<TerminalOption[]> {
  return invoke<TerminalOption[]>("get_available_terminals");
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

export async function readUserCommandFiles(): Promise<UserCommandJsonFile[]> {
  const payload = await invoke<UserCommandFilePayload[]>("read_user_command_files");
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => ({
    path: item.path,
    content: item.content,
    modifiedMs: Number.isFinite(item.modified_ms) ? item.modified_ms : 0
  }));
}
