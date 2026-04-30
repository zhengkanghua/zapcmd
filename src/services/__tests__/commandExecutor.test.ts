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

  it("calls tauri invoke with structured execution steps", async () => {
    isTauriMock.mockReturnValue(true);
    const executor = createCommandExecutor();

    await executor.run({
      terminalId: "powershell",
      steps: [
        {
          summary: "git status",
          execution: {
            kind: "exec",
            program: "git",
            args: ["status"]
          }
        }
      ],
      requiresElevation: true,
      alwaysElevated: false,
      safetyConfirmed: true
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("run_command_in_terminal", {
      terminalId: "powershell",
      steps: [
        {
          summary: "git status",
          execution: {
            kind: "exec",
            program: "git",
            args: ["status"]
          }
        }
      ],
      requiresElevation: true,
      alwaysElevated: false,
      safetyConfirmed: true
    });
  });

  it("does not include terminalReusePolicy in tauri invoke payload", async () => {
    isTauriMock.mockReturnValue(true);
    const executor = createCommandExecutor();

    await executor.run({
      terminalId: "wt",
      steps: [
        {
          summary: "echo 1",
          execution: {
            kind: "exec",
            program: "echo",
            args: ["1"]
          }
        }
      ],
      requiresElevation: true,
      alwaysElevated: false,
      safetyConfirmed: true
    });

    expect(invokeMock).toHaveBeenCalledWith("run_command_in_terminal", {
      terminalId: "wt",
      steps: [
        {
          summary: "echo 1",
          execution: {
            kind: "exec",
            program: "echo",
            args: ["1"]
          }
        }
      ],
      requiresElevation: true,
      alwaysElevated: false,
      safetyConfirmed: true
    });
  });

  it("defaults safety confirmation to false unless explicitly confirmed", async () => {
    isTauriMock.mockReturnValue(true);
    const executor = createCommandExecutor();

    await executor.run({
      terminalId: "powershell",
      steps: [
        {
          summary: "rm -rf tmp",
          execution: {
            kind: "script",
            runner: "bash",
            command: "rm -rf tmp"
          }
        }
      ],
      requiresElevation: false,
      alwaysElevated: false
    });

    expect(invokeMock).toHaveBeenCalledWith("run_command_in_terminal", {
      terminalId: "powershell",
      steps: [
        {
          summary: "rm -rf tmp",
          execution: {
            kind: "script",
            runner: "bash",
            command: "rm -rf tmp"
          }
        }
      ],
      requiresElevation: false,
      alwaysElevated: false,
      safetyConfirmed: false
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
        steps: [
          {
            summary: "git status",
            execution: {
              kind: "exec",
              program: "git",
              args: ["status"]
            }
          }
        ],
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
        steps: [
          {
            summary: "echo test",
            execution: {
              kind: "exec",
              program: "echo",
              args: ["test"]
            }
          }
        ]
      })
    ).rejects.toThrow(t("execution.desktopOnly"));

    expect(invokeMock).not.toHaveBeenCalled();
  });
});
