import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-shell";
import {
  readAutoStartEnabled,
  readAvailableTerminals,
  readUserCommandFile,
  refreshAvailableTerminals,
  readLauncherHotkey,
  readRuntimePlatform,
  scanUserCommandFiles,
  requestAnimateMainWindowSize,
  requestHideMainWindow,
  requestResizeMainWindowForReveal,
  requestSetMainWindowSize,
  writeAutoStartEnabled,
  writeLauncherHotkey
} from "../../../services/tauriBridge";
import {
  maybeCheckForUpdateAtStartup,
  type StartupUpdateCheckResult
} from "../../../services/startupUpdateCheck";

export interface StartupUpdateCheckInput {
  enabled: boolean;
  storage: Storage | null;
}

export interface AppCompositionRootPorts {
  isTauriRuntime: () => boolean;
  getCurrentWindow: typeof getCurrentWindow;
  invoke: typeof invoke;
  openExternalUrl: (url: string) => Promise<void>;
  getLocalStorage: () => Storage | null;
  checkStartupUpdate: (options: StartupUpdateCheckInput) => Promise<StartupUpdateCheckResult>;
  scanUserCommandFiles: typeof scanUserCommandFiles;
  readUserCommandFile: typeof readUserCommandFile;
  readRuntimePlatform: typeof readRuntimePlatform;
  readAvailableTerminals: typeof readAvailableTerminals;
  refreshAvailableTerminals: typeof refreshAvailableTerminals;
  readAutoStartEnabled: typeof readAutoStartEnabled;
  writeAutoStartEnabled: typeof writeAutoStartEnabled;
  writeLauncherHotkey: typeof writeLauncherHotkey;
  readLauncherHotkey: typeof readLauncherHotkey;
  requestHideMainWindow: typeof requestHideMainWindow;
  requestSetMainWindowSize: typeof requestSetMainWindowSize;
  requestAnimateMainWindowSize: typeof requestAnimateMainWindowSize;
  requestResizeMainWindowForReveal: typeof requestResizeMainWindowForReveal;
  logWarn: (message: string, payload?: unknown) => void;
  logError: (message: string, payload?: unknown) => void;
}

export function createDefaultAppCompositionRootPorts(): AppCompositionRootPorts {
  return {
    isTauriRuntime: isTauri,
    getCurrentWindow,
    invoke,
    openExternalUrl: async (url: string) => {
      if (isTauri()) {
        await open(url);
        return;
      }
      if (typeof window !== "undefined" && typeof window.open === "function") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    getLocalStorage: () => (typeof window === "undefined" ? null : window.localStorage),
    checkStartupUpdate: maybeCheckForUpdateAtStartup,
    scanUserCommandFiles,
    readUserCommandFile,
    readRuntimePlatform,
    readAvailableTerminals,
    refreshAvailableTerminals,
    readAutoStartEnabled,
    writeAutoStartEnabled,
    writeLauncherHotkey,
    readLauncherHotkey,
    requestHideMainWindow,
    requestSetMainWindowSize,
    requestAnimateMainWindowSize,
    requestResizeMainWindowForReveal,
    logWarn: (message, payload) => {
      console.warn(message, payload);
    },
    logError: (message, payload) => {
      console.error(message, payload);
    }
  };
}

export function createAppCompositionRootPorts(
  overrides: Partial<AppCompositionRootPorts> = {}
): AppCompositionRootPorts {
  return {
    ...createDefaultAppCompositionRootPorts(),
    ...overrides
  };
}
