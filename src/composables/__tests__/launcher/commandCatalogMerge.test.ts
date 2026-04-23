import { describe, expect, it } from "vitest";
import type { CommandTemplate } from "../../../features/commands/types";
import {
  computeOverrideIds,
  mergeCommandSourceById,
  mergeCommandTemplates
} from "../../launcher/useCommandCatalog/merge";

function createCommand(id: string, title: string): CommandTemplate {
  return {
    id,
    title,
    description: "",
    preview: title,
    category: "test",
    folder: "test",
    needsArgs: false,
    dangerous: false,
    args: []
  };
}

describe("command catalog merge helpers", () => {
  it("lets user commands override builtin commands and keeps source ids aligned", () => {
    const builtinTemplates = [
      createCommand("builtin-a", "Builtin A"),
      createCommand("shared-id", "Builtin Shared")
    ];
    const userTemplates = [
      createCommand("shared-id", "User Shared"),
      createCommand("user-only", "User Only")
    ];

    const merged = mergeCommandTemplates(builtinTemplates, userTemplates);
    const sourceById = mergeCommandSourceById(
      {
        "builtin-a": "builtin-a.json",
        "shared-id": "builtin-shared.json"
      },
      {
        "shared-id": "user-shared.json",
        "user-only": "user-only.json"
      },
      merged
    );

    expect(merged.map((item) => item.id)).toEqual(["builtin-a", "shared-id", "user-only"]);
    expect(merged.find((item) => item.id === "shared-id")?.title).toBe("User Shared");
    expect(computeOverrideIds(builtinTemplates, userTemplates)).toEqual(["shared-id"]);
    expect(sourceById).toEqual({
      "builtin-a": "builtin-a.json",
      "shared-id": "user-shared.json",
      "user-only": "user-only.json"
    });
  });
});
