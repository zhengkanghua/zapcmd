import { invoke, isTauri } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "../../i18n";
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

  it("returns structured failures when tauri probe throws", async () => {
    isTauriMock.mockReturnValue(true);
    invokeMock.mockRejectedValueOnce(new Error("probe transport failed"));
    const service = createCommandPreflightService();

    await expect(
      service.check([
        { id: "docker", type: "binary", required: true, check: "docker" }
      ])
    ).resolves.toEqual([
      {
        id: "docker",
        ok: false,
        code: "probe-error",
        message: "probe transport failed",
        required: true
      }
    ]);
  });

  it("returns structured failures when tauri probe payload is malformed", async () => {
    isTauriMock.mockReturnValue(true);
    invokeMock.mockResolvedValueOnce({ ok: true });
    const service = createCommandPreflightService();

    await expect(
      service.check([
        { id: "docker", type: "binary", required: true, check: "docker" }
      ])
    ).resolves.toEqual([
      {
        id: "docker",
        ok: false,
        code: "probe-invalid-response",
        message: t("execution.preflightProbeInvalidResponse"),
        required: true
      }
    ]);
  });
});
