import { describe, expect, it } from "vitest";
import { mapRuntimeCommandToTemplate, resolveRuntimeText } from "../runtimeMapper";
import type { RuntimeCommand } from "../runtimeTypes";

function requireExecExecution(
  template: ReturnType<typeof mapRuntimeCommandToTemplate>
) {
  expect(template.execution).toBeDefined();
  expect(template.execution?.kind).toBe("exec");
  if (!template.execution || template.execution.kind !== "exec") {
    throw new Error("expected exec execution");
  }
  return template.execution;
}

function requireScriptExecution(
  template: ReturnType<typeof mapRuntimeCommandToTemplate>
) {
  expect(template.execution).toBeDefined();
  expect(template.execution?.kind).toBe("script");
  if (!template.execution || template.execution.kind !== "script") {
    throw new Error("expected script execution");
  }
  return template.execution;
}

describe("runtimeMapper", () => {
  it("picks preferred localized text in zh/en order", () => {
    expect(
      resolveRuntimeText({
        en: "English",
        zh: "中文"
      })
    ).toBe("中文");
  });

  it("maps runtime command to launcher command template", () => {
    const runtimeCommand = {
      id: "http-server",
      name: "快速 HTTP 服务",
      description: "启动本地 HTTP 服务",
      tags: ["dev", "http"],
      category: "dev",
      platform: "all",
      exec: {
        program: "python3",
        args: ["-m", "http.server", "{{port}}"]
      },
      adminRequired: false,
      dangerous: false,
      args: [
        {
          key: "port",
          label: "port",
          type: "number",
          required: true
        }
      ],
      prerequisites: [
        {
          id: "python3",
          type: "binary",
          required: true,
          check: "python3 --version",
          displayName: "Docker Desktop",
          resolutionHint: "新字段优先",
          installHint: "兼容旧字段",
          fallbackCommandId: "install-docker"
        }
      ]
    } as RuntimeCommand;

    const template = mapRuntimeCommandToTemplate(runtimeCommand);
    expect(template.id).toBe("http-server");
    expect(template.folder).toBe("@_dev");
    expect(template.needsArgs).toBe(true);
    expect(template.args?.[0]?.token).toBe("{{port}}");
    expect(template.argToken).toBe("{{port}}");
    expect(template.adminRequired).toBe(false);
    expect(template.dangerous).toBe(false);
    expect(template.execution).toMatchObject({
      kind: "exec",
      program: "python3",
      args: ["-m", "http.server", "{{port}}"]
    });
    expect(template.preview).toBe("python3 -m http.server {{port}}");
    expect(template.prerequisites).toEqual([
      expect.objectContaining({
        id: "python3",
        type: "binary",
        required: true,
        displayName: "Docker Desktop",
        resolutionHint: "新字段优先",
        installHint: "兼容旧字段",
        fallbackCommandId: "install-docker"
      })
    ]);
    expect(template.prerequisites?.[0]).toEqual(
      expect.objectContaining({
        resolutionHint: "新字段优先"
      })
    );
  });

  it("maps exec stdinArgKey and script runner into structured execution", () => {
    const execTemplate = mapRuntimeCommandToTemplate({
      id: "sqlite-query",
      name: "SQLite Query",
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

    const execExecution = requireExecExecution(execTemplate);
    expect(execExecution.stdinArgKey).toBe("sql");
    expect(execTemplate.preview).toBe('sqlite3 "{{file}}"');

    const scriptTemplate = mapRuntimeCommandToTemplate({
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

    const scriptExecution = requireScriptExecution(scriptTemplate);
    expect(scriptExecution.runner).toBe("powershell");
    expect(scriptTemplate.preview).toContain("Stop-Process");
  });
});
