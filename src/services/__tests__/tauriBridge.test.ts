import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  refreshAvailableTerminals,
  readAvailableTerminals,
  readUserCommandFiles,
  readUserCommandsDir,
  readLauncherHotkey,
  readRuntimePlatform,
  readAutoStartEnabled,
  requestAnimateMainWindowSize,
  requestHideMainWindow,
  requestResizeMainWindowForReveal,
  requestSetMainWindowSize,
  writeAutoStartEnabled,
  writeLauncherHotkey
} from "../tauriBridge";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

describe("tauriBridge", () => {
  const invokeMock = vi.mocked(invoke);

  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("reads available terminals through invoke bridge", async () => {
    invokeMock.mockResolvedValueOnce([]);
    await readAvailableTerminals();

    expect(invokeMock).toHaveBeenCalledWith("get_available_terminals");
  });

  it("refreshes available terminals through dedicated invoke bridge", async () => {
    invokeMock.mockResolvedValueOnce([]);
    await refreshAvailableTerminals();

    expect(invokeMock).toHaveBeenCalledWith("refresh_available_terminals");
  });

  it("reads and writes launcher hotkey through invoke bridge", async () => {
    invokeMock.mockResolvedValueOnce("Alt+V");
    invokeMock.mockResolvedValueOnce("win");
    invokeMock.mockResolvedValueOnce(true);
    await readLauncherHotkey();
    await readRuntimePlatform();
    await readAutoStartEnabled();
    await writeLauncherHotkey("Ctrl+Shift+V");
    await writeAutoStartEnabled(true);

    expect(invokeMock).toHaveBeenNthCalledWith(1, "get_launcher_hotkey");
    expect(invokeMock).toHaveBeenNthCalledWith(2, "get_runtime_platform");
    expect(invokeMock).toHaveBeenNthCalledWith(3, "get_autostart_enabled");
    expect(invokeMock).toHaveBeenNthCalledWith(4, "update_launcher_hotkey", {
      hotkey: "Ctrl+Shift+V"
    });
    expect(invokeMock).toHaveBeenNthCalledWith(5, "set_autostart_enabled", {
      enabled: true
    });
  });

  it("requests hide main window and resize through invoke bridge", async () => {
    invokeMock.mockResolvedValue(undefined);
    await requestHideMainWindow();
    await requestSetMainWindowSize(920, 540);

    expect(invokeMock).toHaveBeenNthCalledWith(1, "hide_main_window");
    expect(invokeMock).toHaveBeenNthCalledWith(2, "set_main_window_size", {
      width: 920,
      height: 540
    });
  });

  it("requests animated window resize through invoke bridge", async () => {
    invokeMock.mockResolvedValue(undefined);
    await requestAnimateMainWindowSize(920, 540);
    expect(invokeMock).toHaveBeenCalledWith("animate_main_window_size", {
      width: 920,
      height: 540
    });
  });

  it("calls resize_main_window_for_reveal through invoke bridge", async () => {
    invokeMock.mockResolvedValue(undefined);
    await requestResizeMainWindowForReveal(920, 540);

    expect(invokeMock).toHaveBeenCalledWith("resize_main_window_for_reveal", {
      width: 920,
      height: 540
    });
  });

  it("reads user command directory and files through invoke bridge", async () => {
    invokeMock.mockResolvedValueOnce("C:/Users/demo/.zapcmd/commands");
    invokeMock.mockResolvedValueOnce([
      {
        path: "C:/Users/demo/.zapcmd/commands/custom.json",
        content: "{\"commands\":[]}",
        modified_ms: 1700000000000
      }
    ]);

    const userDir = await readUserCommandsDir();
    const files = await readUserCommandFiles();

    expect(userDir).toContain(".zapcmd/commands");
    expect(files).toEqual([
      {
        path: "C:/Users/demo/.zapcmd/commands/custom.json",
        content: "{\"commands\":[]}",
        modifiedMs: 1700000000000
      }
    ]);
    expect(invokeMock).toHaveBeenNthCalledWith(1, "get_user_commands_dir");
    expect(invokeMock).toHaveBeenNthCalledWith(2, "read_user_command_files");
  });
});
