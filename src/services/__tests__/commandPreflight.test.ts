import { invoke, isTauri } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCommandPreflightService } from "../commandPreflight";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn()
}));

describe("createCommandPreflightService", () => {
  const invokeMock = vi.mocked(invoke);
  const isTauriMock = vi.mocked(isTauri);

  beforeEach(() => {
    invokeMock.mockReset();
    isTauriMock.mockReset();
  });

  it("checks prerequisites through tauri invoke", async () => {
    isTauriMock.mockReturnValue(true);
    invokeMock.mockResolvedValueOnce([
      {
        id: "docker",
        ok: true,
        code: "ok",
        message: "",
        required: true
      }
    ]);
    const service = createCommandPreflightService();

    await expect(
      service.check([
        { id: "docker", type: "binary", required: true, check: "docker" }
      ])
    ).resolves.toEqual([
      expect.objectContaining({ id: "docker", ok: true })
    ]);
    expect(invokeMock).toHaveBeenCalledWith("probe_command_prerequisites", {
      prerequisites: [
        { id: "docker", type: "binary", required: true, check: "docker" }
      ]
    });
  });
});
