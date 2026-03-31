import { describe, expect, it, vi } from "vitest";
import {
  createReadFailedIssue,
  loadBuiltinCommandTemplates,
  loadUserCommandTemplatesWithReport
} from "../runtimeLoader";

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

  it("exposes redis builtin category after source split", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.category === "redis")).toBe(true);
    expect(templates.some((item) => item.category === "database")).toBe(false);
  });

  it("loads mysql/postgres/sqlite builtin categories", () => {
    const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

    expect(templates.some((item) => item.category === "mysql")).toBe(true);
    expect(templates.some((item) => item.category === "postgres")).toBe(true);
    expect(templates.some((item) => item.category === "sqlite")).toBe(true);
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
      const issue = loaded.issues.find((item) => item.code === "invalid-json");
      expect(issue).toMatchObject({
        code: "invalid-json",
        stage: "parse",
        sourceId: "C:/Users/test/.zapcmd/commands/bad.json"
      });
      expect(issue?.reason.length).toBeGreaterThan(0);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reports invalid schema with first failure reason", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const loaded = loadUserCommandTemplatesWithReport(
        [
          {
            path: "C:/Users/test/.zapcmd/commands/invalid-schema.json",
            content: JSON.stringify({
              commands: [
                {
                  id: "bad id",
                  name: "bad id",
                  tags: ["test"],
                  category: "custom",
                  platform: "win",
                  template: "echo bad",
                  adminRequired: false
                }
              ]
            }),
            modifiedMs: 1
          }
        ],
        { runtimePlatform: "win" }
      );

      expect(loaded.templates).toHaveLength(0);
      expect(loaded.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "invalid-schema",
            stage: "schema",
            sourceId: "C:/Users/test/.zapcmd/commands/invalid-schema.json"
          })
        ])
      );
      const issue = loaded.issues.find((item) => item.code === "invalid-schema");
      expect(issue?.reason).toContain("commands[0].id");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reports business-rule validation failures with readable reason", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const loaded = loadUserCommandTemplatesWithReport(
        [
          {
            path: "C:/Users/test/.zapcmd/commands/min-max-conflict.json",
            content: JSON.stringify({
              commands: [
                {
                  id: "port-range-conflict",
                  name: "Port Range Conflict",
                  tags: ["test"],
                  category: "custom",
                  platform: "win",
                  template: "echo {{port}}",
                  adminRequired: false,
                  args: [
                    {
                      key: "port",
                      label: "port",
                      type: "number",
                      required: true,
                      validation: {
                        min: 100,
                        max: 1
                      }
                    }
                  ]
                }
              ]
            }),
            modifiedMs: 1
          }
        ],
        { runtimePlatform: "win" }
      );

      expect(loaded.templates).toHaveLength(0);
      const issue = loaded.issues.find((item) => item.code === "invalid-schema");
      expect(issue).toMatchObject({
        code: "invalid-schema",
        stage: "schema",
        sourceId: "C:/Users/test/.zapcmd/commands/min-max-conflict.json"
      });
      expect(issue?.reason).toContain("min");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reports duplicate ids with merge stage reason", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const loaded = loadUserCommandTemplatesWithReport(
        [
          {
            path: "C:/Users/test/.zapcmd/commands/duplicate-id.json",
            content: JSON.stringify({
              commands: [
                {
                  id: "custom-dup",
                  name: "duplicate 1",
                  tags: ["test"],
                  category: "custom",
                  platform: "win",
                  template: "echo one",
                  adminRequired: false
                },
                {
                  id: "custom-dup",
                  name: "duplicate 2",
                  tags: ["test"],
                  category: "custom",
                  platform: "win",
                  template: "echo two",
                  adminRequired: false
                }
              ]
            }),
            modifiedMs: 1
          }
        ],
        { runtimePlatform: "win" }
      );

      const duplicateIssue = loaded.issues.find((item) => item.code === "duplicate-id");
      expect(duplicateIssue).toMatchObject({
        code: "duplicate-id",
        stage: "merge",
        sourceId: "C:/Users/test/.zapcmd/commands/duplicate-id.json",
        commandId: "custom-dup"
      });
      expect(duplicateIssue?.reason).toContain("custom-dup");
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
          stage: "merge",
          sourceId: "C:/Users/test/.zapcmd/commands/custom-shell.json",
          commandId: "custom-shell",
          reason: expect.stringContaining("ignored")
        })
      ])
    );
  });

  it("loads user commands with custom slug category", () => {
    const loaded = loadUserCommandTemplatesWithReport(
      [
        {
          path: "C:/Users/test/.zapcmd/commands/redis.json",
          content: JSON.stringify({
            commands: [
              {
                id: "redis-shell",
                name: "Redis Shell",
                tags: ["redis"],
                category: "redis",
                platform: "win",
                template: "redis-cli",
                adminRequired: false
              }
            ]
          }),
          modifiedMs: 1
        }
      ],
      { runtimePlatform: "win" }
    );

    expect(loaded.templates[0]?.category).toBe("redis");
    expect(loaded.issues).toHaveLength(0);
  });

  it("creates read-failed issues with read stage reason", () => {
    const issue = createReadFailedIssue("C:/Users/test/.zapcmd/commands", new Error("permission denied"));
    expect(issue).toEqual(
      expect.objectContaining({
        code: "read-failed",
        stage: "read",
        sourceId: "C:/Users/test/.zapcmd/commands"
      })
    );
    expect(issue.reason).toContain("permission denied");
  });

  it("normalizes string read failures and truncates oversized reasons", () => {
    const issue = createReadFailedIssue(
      "C:/Users/test/.zapcmd/commands",
      `  ${"permission denied ".repeat(20)}  `
    );

    expect(issue.reason.endsWith("...")).toBe(true);
    expect(issue.reason.length).toBe(180);
    expect(issue.reason).not.toContain("  ");
  });

  it("falls back to default read failure reason for unknown error shapes", () => {
    const issue = createReadFailedIssue("C:/Users/test/.zapcmd/commands", { code: "EACCES" });

    expect(issue.reason).toBe("Failed to read command source.");
  });
});
