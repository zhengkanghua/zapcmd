import { describe, expect, it } from "vitest";

import type { CommandTemplate } from "../../commands/commandTemplates";
import {
  buildInitialArgValues,
  getCommandArgs,
  renderCommand
} from "../commandRuntime";

function createTemplate(overrides: Partial<CommandTemplate> = {}): CommandTemplate {
  return {
    id: "test",
    title: "test",
    description: "test",
    preview: "echo hello",
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
});

