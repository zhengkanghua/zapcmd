import { describe, expect, it } from "vitest";

import { mapRuntimeCommandToTemplate } from "../runtimeMapper";

describe("commandTemplates", () => {
  it("keeps preview as derived text while exposing structured exec payload", () => {
    const template = mapRuntimeCommandToTemplate({
      id: "sqlite-query",
      name: "SQLite Query",
      description: "Execute SQL via stdin",
      tags: ["sqlite"],
      category: "sqlite",
      platform: "all",
      exec: {
        program: "sqlite3",
        args: ['"{{file}}"'],
        stdinArgKey: "sql"
      },
      adminRequired: false,
      args: [
        {
          key: "file",
          label: "File",
          type: "path",
          required: true
        },
        {
          key: "sql",
          label: "SQL",
          type: "text",
          required: true
        }
      ]
    });

    expect(template.preview).toBe('sqlite3 "{{file}}"');
    expect(template.execution).toMatchObject({
      kind: "exec",
      program: "sqlite3",
      stdinArgKey: "sql"
    });
    expect(template.args?.map((arg) => arg.key)).toEqual(["file", "sql"]);
  });

  it("summarizes script commands for display while retaining runner metadata", () => {
    const template = mapRuntimeCommandToTemplate({
      id: "kill-port-win",
      name: "Kill Port Win",
      tags: ["network"],
      category: "network",
      platform: "win",
      script: {
        runner: "powershell",
        command: "Stop-Process -Id {{pid}} -Force"
      },
      adminRequired: false,
      args: [
        {
          key: "pid",
          label: "PID",
          type: "number",
          required: true
        }
      ],
      prerequisites: [
        {
          id: "powershell",
          type: "shell",
          required: true,
          check: "shell:powershell"
        }
      ]
    });

    expect(template.preview).toContain("powershell");
    expect(template.preview).toContain("Stop-Process");
    expect(template.execution).toMatchObject({
      kind: "script",
      runner: "powershell"
    });
  });
});
