import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { createCommandCatalogState } from "../../launcher/useCommandCatalog/state";
import type { UseCommandCatalogOptions } from "../../launcher/useCommandCatalog/types";

describe("command catalog controller internals", () => {
  it("request guard only treats the newest request as latest", async () => {
    const { createLatestRequestGuard } = await import(
      "../../launcher/useCommandCatalog/requestGuard"
    );

    const guard = createLatestRequestGuard();
    const first = guard.start();
    const second = guard.start();

    expect(guard.isLatest(first)).toBe(false);
    expect(guard.isLatest(second)).toBe(true);
  });

  it("controller helpers keep missing ports mapped to read-failed", async () => {
    const { setMissingPortsIssue } = await import(
      "../../launcher/useCommandCatalog/controller"
    );

    const options: UseCommandCatalogOptions = {
      isTauriRuntime: () => true,
      disabledCommandIds: ref([])
    };
    const state = createCommandCatalogState(options);

    setMissingPortsIssue(state);

    expect(state.loadIssues.value).toContainEqual(
      expect.objectContaining({
        code: "read-failed",
        stage: "read",
        sourceId: "user-command-files"
      })
    );
  });
});
