import { describe, expect, it, vi } from "vitest";
import {
  checkQueueCommandSafety,
  checkSingleCommandSafety,
  type SafetyCommandInput
} from "../commandSafety";

describe("commandSafety", () => {
  it("blocks single command when numeric arg contains injection token", () => {
    const result = checkSingleCommandSafety({
      title: "query-port",
      renderedCommand: "netstat -ano | findstr :8080",
      args: [
        {
          key: "port",
          label: "port",
          token: "{{port}}",
          required: true,
          argType: "number"
        }
      ],
      argValues: {
        port: "8080; whoami"
      }
    });

    expect(result.blockedMessage).toContain("port");
    expect(result.confirmationReasons).toHaveLength(0);
  });

  it("requires confirmation for dangerous/admin commands", () => {
    const result = checkSingleCommandSafety({
      title: "kill-process",
      renderedCommand: "Stop-Process -Id 1024 -Force",
      dangerous: true,
      adminRequired: true
    });

    expect(result.blockedMessage).toBeNull();
    expect(result.confirmationReasons.length).toBeGreaterThan(0);
  });

  it("blocks text arg when value contains pipe operator", () => {
    const result = checkSingleCommandSafety({
      title: "find-process",
      renderedCommand: "Get-Process | Where-Object { $_.Name -like {{name}} }",
      args: [
        {
          key: "name",
          label: "name",
          token: "{{name}}",
          required: true,
          argType: "text"
        }
      ],
      argValues: {
        name: "zap* | Stop-Process -Force"
      }
    });

    expect(result.blockedMessage).toContain("name");
    expect(result.confirmationReasons).toHaveLength(0);
  });

  it("blocks text arg when value contains ampersand operator", () => {
    const result = checkSingleCommandSafety({
      title: "echo-message",
      renderedCommand: "echo {{message}}",
      args: [
        {
          key: "message",
          label: "message",
          token: "{{message}}",
          required: true,
          argType: "text"
        }
      ],
      argValues: {
        message: "ok & whoami"
      }
    });

    expect(result.blockedMessage).toContain("message");
    expect(result.confirmationReasons).toHaveLength(0);
  });

  it("collects queue confirmation items and keeps safe items out", () => {
    const result = checkQueueCommandSafety([
      {
        title: "safe",
        renderedCommand: "git status"
      },
      {
        title: "risk",
        renderedCommand: "taskkill /F /PID 1234",
        dangerous: true
      }
    ]);

    expect(result.blockedMessage).toBeNull();
    expect(result.confirmationItems).toHaveLength(1);
    expect(result.confirmationItems[0]?.title).toBe("risk");
  });

  it("allows optional args to be left blank", () => {
    const result = checkSingleCommandSafety({
      title: "optional-arg",
      renderedCommand: "echo {{message}}",
      args: [
        {
          key: "message",
          label: "message",
          token: "{{message}}",
          required: false,
          argType: "text"
        }
      ],
      argValues: {
        message: "   "
      }
    });

    expect(result.blockedMessage).toBeNull();
  });

  it("blocks arg values that are not in options", () => {
    const result = checkSingleCommandSafety({
      title: "select-terminal",
      renderedCommand: "echo {{terminal}}",
      args: [
        {
          key: "terminal",
          label: "terminal",
          token: "{{terminal}}",
          required: true,
          argType: "text",
          options: ["pwsh", "cmd"]
        }
      ],
      argValues: {
        terminal: "bash"
      }
    });

    expect(result.blockedMessage).toContain("terminal");
  });

  it("uses custom validationError when regex validation fails", () => {
    const result = checkSingleCommandSafety({
      title: "custom-regex",
      renderedCommand: "echo {{value}}",
      args: [
        {
          key: "value",
          label: "value",
          token: "{{value}}",
          required: true,
          argType: "text",
          validationPattern: "^zap$",
          validationError: "bad-value"
        }
      ],
      argValues: {
        value: "nope"
      }
    });

    expect(result.blockedMessage).toContain("bad-value");
  });

  it("blocks invalid validationPattern and only warns once per pattern", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const input: SafetyCommandInput = {
      title: "invalid-pattern",
      renderedCommand: "echo {{value}}",
      args: [
        {
          key: "value",
          label: "value",
          token: "{{value}}",
          required: true,
          argType: "text",
          validationPattern: "["
        }
      ],
      argValues: {
        value: "anything"
      }
    };

    const first = checkSingleCommandSafety(input);
    const second = checkSingleCommandSafety(input);

    expect(first.blockedMessage).toContain("value");
    expect(second.blockedMessage).toContain("value");
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("blocks queue when any item fails arg validation", () => {
    const result = checkQueueCommandSafety([
      {
        title: "safe",
        renderedCommand: "git status"
      },
      {
        title: "missing-required-arg",
        renderedCommand: "echo {{port}}",
        args: [
          {
            key: "port",
            label: "port",
            token: "{{port}}",
            required: true,
            argType: "number"
          }
        ],
        argValues: {}
      }
    ]);

    expect(result.blockedMessage).toContain("missing-required-arg");
    expect(result.confirmationItems).toHaveLength(0);
  });

  it("sanitizes confirmation summaries for long and blank commands", () => {
    const longCommand = "a".repeat(130);

    const result = checkQueueCommandSafety([
      {
        title: "long",
        renderedCommand: longCommand,
        dangerous: true
      },
      {
        title: "blank",
        renderedCommand: "   ",
        dangerous: true
      }
    ]);

    expect(result.blockedMessage).toBeNull();
    expect(result.confirmationItems).toHaveLength(2);

    const longItem = result.confirmationItems.find((item) => item.title === "long");
    expect(longItem?.renderedCommand.endsWith("...")).toBe(true);
    expect(longItem?.renderedCommand.length).toBeLessThanOrEqual(123);

    const blankItem = result.confirmationItems.find((item) => item.title === "blank");
    expect(blankItem?.renderedCommand.trim().length).toBeGreaterThan(0);
  });
});
