import { invoke, isTauri } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      command: "echo test"
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("run_command_in_terminal", {
      terminalId: "powershell",
      command: "echo test"
    });
  });

  it("is a noop in browser mode", async () => {
    isTauriMock.mockReturnValue(false);
    const executor = createCommandExecutor();

    await executor.run({
      terminalId: "powershell",
      command: "echo test"
    });

    expect(invokeMock).not.toHaveBeenCalled();
  });
});
