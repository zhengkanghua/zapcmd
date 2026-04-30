import { describe, expect, it } from "vitest";

import type { CommandTemplate } from "../../commands/commandTemplates";
import {
  buildInitialArgValues,
  getCommandArgs,
  renderCommand,
  resolveCommandExecution
} from "../commandRuntime";

function createTemplate(overrides: Partial<CommandTemplate> = {}): CommandTemplate {
  return {
    id: "test",
    title: "test",
    description: "test",
    preview: "echo hello",
    execution: {
      kind: "exec",
      program: "echo",
      args: ["hello"]
    },
    folder: "@_test",
    category: "test",
    needsArgs: false,
    ...overrides
  };
}

describe("commandRuntime", () => {
  it("returns explicit args when command.args is provided", () => {
    const command = createTemplate({
      needsArgs: true,
      args: [
        {
          key: "name",
          label: "Name",
          token: "{{name}}"
        }
      ]
    });

    expect(getCommandArgs(command)).toEqual(command.args);
  });

  it("returns empty args when command does not declare parameters", () => {
    expect(getCommandArgs(createTemplate())).toEqual([]);
  });

  it("builds fallback arg for legacy needsArgs command", () => {
    const command = createTemplate({
      needsArgs: true,
      preview: "echo {{value}}",
      argLabel: "参数",
      argPlaceholder: "demo",
      argToken: "{{value}}"
    });

    const args = getCommandArgs(command);
    expect(args).toHaveLength(1);
    expect(args[0].key).toBe("value");
    expect(args[0].defaultValue).toBe("demo");
  });

  it("renders command with defaults and strips duplicated spaces", () => {
    const command = createTemplate({
      needsArgs: true,
      preview: "docker logs --tail {{tail}} {{container}} {{filter}}",
      execution: {
        kind: "exec",
        program: "docker",
        args: ["logs", "--tail", "{{tail}}", "{{container}}", "{{filter}}"]
      },
      args: [
        { key: "container", label: "Container", token: "{{container}}", required: true, placeholder: "my-app" },
        { key: "tail", label: "Tail", token: "{{tail}}", required: false, defaultValue: "200" },
        { key: "filter", label: "Filter", token: "{{filter}}", required: false }
      ]
    });

    const rendered = renderCommand(command, {
      container: "api",
      tail: "",
      filter: ""
    });

    expect(rendered).toBe("docker logs --tail 200 api");
  });

  it("builds initial arg values from provided runtime values", () => {
    const command = createTemplate({
      needsArgs: true,
      args: [
        { key: "container", label: "Container", token: "{{container}}", required: true, placeholder: "my-app" },
        { key: "tail", label: "Tail", token: "{{tail}}", required: false, defaultValue: "100" }
      ]
    });

    const snapshot = buildInitialArgValues(command, { container: "worker" });
    expect(snapshot.args).toHaveLength(2);
    expect(snapshot.values).toEqual({
      container: "worker",
      tail: "100"
    });
  });

  it("resolves preview and structured execution independently", () => {
    const command = createTemplate({
      preview: 'sqlite3 "{{file}}"',
      execution: {
        kind: "exec",
        program: "sqlite3",
        args: ['"{{file}}"'],
        stdinArgKey: "sql"
      },
      needsArgs: true,
      args: [
        { key: "file", label: "File", token: "{{file}}", required: true, placeholder: "app.db" },
        { key: "sql", label: "SQL", token: "{{sql}}", required: true }
      ]
    });

    const resolved = resolveCommandExecution(command, {
      file: "data.db",
      sql: "select 1;"
    });

    expect(resolved.renderedPreview).toBe('sqlite3 "data.db"');
    expect(resolved.execution).toEqual({
      kind: "exec",
      program: "sqlite3",
      args: ["data.db"],
      stdinArgKey: "sql",
      stdin: "select 1;"
    });
  });

  it("renders script execution with fallback placeholder values", () => {
    const command = createTemplate({
      preview: "bash: echo {{message}}",
      execution: {
        kind: "script",
        runner: "bash",
        command: "echo {{message}}"
      },
      needsArgs: true,
      args: [
        {
          key: "message",
          label: "Message",
          token: "{{message}}",
          required: true,
          placeholder: "hello"
        }
      ]
    });

    const resolved = resolveCommandExecution(command, { message: "   " });

    expect(resolved.renderedPreview).toBe("bash: echo 'hello'");
    expect(resolved.execution).toEqual({
      kind: "script",
      runner: "bash",
      command: "echo 'hello'"
    });
  });

  it("quotes bash script token values by runner instead of raw interpolation", () => {
    const command = createTemplate({
      execution: {
        kind: "script",
        runner: "bash",
        command: "echo {{message}}"
      },
      needsArgs: true,
      args: [
        {
          key: "message",
          label: "Message",
          token: "{{message}}",
          required: true
        }
      ]
    });

    const resolved = resolveCommandExecution(command, {
      message: "a b ' c"
    });

    expect(resolved.execution).toEqual({
      kind: "script",
      runner: "bash",
      command: "echo 'a b '\\'' c'"
    });
  });

  it("quotes powershell script token values by runner instead of raw interpolation", () => {
    const command = createTemplate({
      execution: {
        kind: "script",
        runner: "powershell",
        command: "Write-Output {{message}}"
      },
      needsArgs: true,
      args: [
        {
          key: "message",
          label: "Message",
          token: "{{message}}",
          required: true
        }
      ]
    });

    const resolved = resolveCommandExecution(command, {
      message: "alpha ' beta"
    });

    expect(resolved.execution).toEqual({
      kind: "script",
      runner: "powershell",
      command: "Write-Output 'alpha '' beta'"
    });
  });

  it("replaces already quoted script tokens without adding nested literal quotes", () => {
    const command = createTemplate({
      execution: {
        kind: "script",
        runner: "powershell",
        command: "Select-String -Pattern \"{{pattern}}\" -Path \"{{path}}\""
      },
      needsArgs: true,
      args: [
        { key: "pattern", label: "Pattern", token: "{{pattern}}", required: true },
        { key: "path", label: "Path", token: "{{path}}", required: true }
      ]
    });

    const resolved = resolveCommandExecution(command, {
      pattern: "error",
      path: "app.log"
    });

    expect(resolved.execution).toEqual({
      kind: "script",
      runner: "powershell",
      command: "Select-String -Pattern 'error' -Path 'app.log'"
    });
  });

  it("throws when command is missing structured execution", () => {
    const command = createTemplate({
      execution: undefined
    });

    expect(() => resolveCommandExecution(command)).toThrow(
      'Command "test" is missing structured execution.'
    );
  });

  it("preserves unquoted short exec args while normalizing quoted values", () => {
    const command = createTemplate({
      preview: "tool {{flag}} {{single}} {{double}}",
      execution: {
        kind: "exec",
        program: "tool",
        args: ["{{flag}}", "'{{single}}'", '"{{double}}"']
      },
      needsArgs: true,
      args: [
        { key: "flag", label: "Flag", token: "{{flag}}", required: true, placeholder: "-f" },
        { key: "single", label: "Single", token: "{{single}}", required: true, placeholder: "alpha" },
        { key: "double", label: "Double", token: "{{double}}", required: true, placeholder: "beta" }
      ]
    });

    const resolved = resolveCommandExecution(command);

    expect(resolved.renderedPreview).toBe('tool -f \'alpha\' "beta"');
    expect(resolved.execution).toEqual({
      kind: "exec",
      program: "tool",
      args: ["-f", "alpha", "beta"],
      stdinArgKey: undefined,
      stdin: undefined
    });
  });

  it("builds empty initial values when args have no defaults", () => {
    const command = createTemplate({
      needsArgs: true,
      args: [
        { key: "message", label: "Message", token: "{{message}}", required: false }
      ]
    });

    const snapshot = buildInitialArgValues(command);

    expect(snapshot.values).toEqual({
      message: ""
    });
  });
});
