import { describe, expect, it, vi } from "vitest";
import { loadBuiltinCommandTemplates, loadUserCommandTemplatesWithReport } from "../runtimeLoader";

describe("runtimeLoader", () => {
  it("loads command templates for current platform", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    expect(templates.length).toBeGreaterThan(50);
    expect(templates.some((item) => item.id === "docker-ps")).toBe(true);
  });

  it("filters out non-target platform templates", () => {
    const winTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    expect(winTemplates.some((item) => item.id === "base64-encode-mac")).toBe(false);
    expect(winTemplates.some((item) => item.id === "base64-encode-linux")).toBe(false);
  });

  it("keeps command ids unique after loading", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
    const ids = templates.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reports invalid user command files", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const loaded = loadUserCommandTemplatesWithReport(
        [
          {
            path: "C:/Users/test/.zapcmd/commands/bad.json",
            content: "{invalid-json",
            modifiedMs: 1
          }
        ],
        { runtimePlatform: "win" }
      );
      expect(loaded.templates).toHaveLength(0);
      expect(loaded.issues.some((item) => item.code === "invalid-json")).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reports shell field as ignored", () => {
    const loaded = loadUserCommandTemplatesWithReport(
      [
        {
          path: "C:/Users/test/.zapcmd/commands/custom-shell.json",
          content: JSON.stringify({
            commands: [
              {
                id: "custom-shell",
                name: "Custom shell command",
                tags: ["test"],
                category: "custom",
                platform: "win",
                template: "echo hello",
                shell: "powershell",
                adminRequired: false
              }
            ]
          }),
          modifiedMs: 1
        }
      ],
      { runtimePlatform: "win" }
    );

    expect(loaded.templates).toHaveLength(1);
    expect(loaded.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "shell-ignored",
          sourceId: "C:/Users/test/.zapcmd/commands/custom-shell.json",
          commandId: "custom-shell"
        })
      ])
    );
  });
});
