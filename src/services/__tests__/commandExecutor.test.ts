import { invoke, isTauri } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "../../i18n";
import { createCommandExecutor } from "../commandExecutor";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn()
}));

describe("createCommandExecutor", () => {
  const invokeMock = vi.mocked(invoke);
  const isTauriMock = vi.mocked(isTauri);

  beforeEach(() => {
    invokeMock.mockReset();
    isTauriMock.mockReset();
  });

  it("calls tauri invoke when running in tauri", async () => {
    isTauriMock.mockReturnValue(true);
    const executor = createCommandExecutor();

    await executor.run({
      terminalId: "powershell",
      command: "echo test",
      requiresElevation: true,
      alwaysElevated: false
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("run_command_in_terminal", {
      terminalId: "powershell",
      command: "echo test",
      requiresElevation: true,
      alwaysElevated: false
    });
  });

  it("normalizes structured tauri rejection into execution error", async () => {
    isTauriMock.mockReturnValue(true);
    invokeMock.mockRejectedValueOnce({
      code: "elevation-cancelled",
      message: "user cancelled elevation"
    });
    const executor = createCommandExecutor();

    await expect(
      executor.run({
        terminalId: "wt",
        command: "echo test",
        requiresElevation: true,
        alwaysElevated: false
      })
    ).rejects.toMatchObject({
      code: "elevation-cancelled"
    });
  });

  it("rejects execution in browser mode", async () => {
    isTauriMock.mockReturnValue(false);
    const executor = createCommandExecutor();

    await expect(
      executor.run({
        terminalId: "powershell",
        command: "echo test"
      })
    ).rejects.toThrow(t("execution.desktopOnly"));

    expect(invokeMock).not.toHaveBeenCalled();
  });
});
