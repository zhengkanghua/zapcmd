import { describe, expect, it, vi } from "vitest";
import { createUserCommandSourceCache } from "../userCommandSourceCache";

describe("createUserCommandSourceCache invalid json", () => {
  it("在短批次扫描中为非 Error 的 JSON 解析失败提供兜底原因", async () => {
    const parseSpy = vi.spyOn(JSON, "parse").mockImplementationOnce(() => {
      throw {};
    });
    const cache = createUserCommandSourceCache({
      scanUserCommandFiles: async () => ({
        files: [
          {
            path: "C:/Users/test/.zapcmd/commands/broken.json",
            modifiedMs: 1,
            size: 8
          }
        ],
        issues: []
      }),
      readUserCommandFile: async () => ({
        path: "C:/Users/test/.zapcmd/commands/broken.json",
        content: "{oops}",
        modifiedMs: 1,
        size: 8
      })
    });

    const snapshot = await cache.refreshFromScan();

    expect(snapshot.payloadEntries).toEqual([]);
    expect(snapshot.issues).toEqual([
      expect.objectContaining({
        code: "invalid-json",
        sourceId: "C:/Users/test/.zapcmd/commands/broken.json",
        reason: "JSON parse failed."
      })
    ]);
    expect(cache.hasPrimedScan()).toBe(true);

    parseSpy.mockRestore();
  });
});
