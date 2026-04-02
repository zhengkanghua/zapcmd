import { describe, expect, it, vi } from "vitest";
import { mapRuntimeCommandToTemplate } from "../../commands/runtimeMapper";
import type { RuntimeCommand } from "../../commands/runtimeTypes";
import {
  checkQueueCommandSafety,
  checkSingleCommandSafety,
  type SafetyCommandInput
} from "../commandSafety";

const INJECTION_CASES: Array<{ label: string; value: string }> = [
  { label: "semicolon", value: "safe;whoami" },
  { label: "pipe", value: "safe | whoami" },
  { label: "ampersand", value: "safe & whoami" },
  { label: "backtick", value: "safe `whoami`" },
  { label: "angle-left", value: "safe < out.txt" },
  { label: "angle-right", value: "safe > out.txt" },
  { label: "newline", value: "safe\nwhoami" },
  { label: "dollar-paren", value: "safe $(whoami)" },
  { label: "dollar-brace", value: "safe ${PATH}" }
];

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

  it("blocks number args below min", () => {
    const result = checkSingleCommandSafety({
      title: "port-min",
      renderedCommand: "echo {{port}}",
      args: [
        {
          key: "port",
          label: "port",
          token: "{{port}}",
          argType: "number",
          min: 1,
          max: 10
        }
      ],
      argValues: {
        port: "0"
      }
    });

    expect(result.blockedMessage).toContain("port");
  });

  it("blocks number args above max", () => {
    const result = checkSingleCommandSafety({
      title: "port-max",
      renderedCommand: "echo {{port}}",
      args: [
        {
          key: "port",
          label: "port",
          token: "{{port}}",
          argType: "number",
          min: 1,
          max: 10
        }
      ],
      argValues: {
        port: "99999"
      }
    });

    expect(result.blockedMessage).toContain("port");
  });

  it("keeps runtime min max rules after mapping into command safety", () => {
    const template = mapRuntimeCommandToTemplate({
      id: "runtime-port-guard",
      name: "Runtime Port Guard",
      tags: ["network"],
      category: "custom",
      platform: "win",
      exec: {
        program: "echo",
        args: ["{{port}}"]
      },
      adminRequired: false,
      args: [
        {
          key: "port",
          label: "port",
          type: "number",
          required: true,
          validation: {
            min: 1000,
            max: 9000
          }
        }
      ]
    } satisfies RuntimeCommand);

    const execution = requireExecExecution(template);
    expect(execution.kind).toBe("exec");
    expect(template.preview).toBe("echo {{port}}");
    expect(template.args?.[0]).toMatchObject({
      min: 1000,
      max: 9000
    });

    const result = checkSingleCommandSafety({
      title: template.title,
      renderedCommand: "echo 22",
      args: template.args,
      argValues: {
        port: "22"
      }
    });

    expect(result.blockedMessage).toContain("port");
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

  it("blocks queue when number arg is outside min max range", () => {
    const result = checkQueueCommandSafety([
      {
        title: "safe",
        renderedCommand: "git status"
      },
      {
        title: "queue-port",
        renderedCommand: "echo {{port}}",
        args: [
          {
            key: "port",
            label: "port",
            token: "{{port}}",
            required: true,
            argType: "number",
            min: 1,
            max: 10
          }
        ],
        argValues: {
          port: "0"
        }
      }
    ]);

    expect(result.blockedMessage).toContain("queue-port");
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

  it.each([
    {
      name: "number arg accepts trimmed numeric value",
      arg: {
        key: "port",
        label: "port",
        token: "{{port}}",
        required: true,
        argType: "number" as const
      },
      value: "  443  "
    },
    {
      name: "text arg accepts trimmed allowed option",
      arg: {
        key: "shell",
        label: "shell",
        token: "{{shell}}",
        required: true,
        argType: "text" as const,
        options: ["pwsh", "cmd"]
      },
      value: "  pwsh  "
    }
  ])("$name", ({ arg, value }) => {
    const result = checkSingleCommandSafety({
      title: "allow-trim",
      renderedCommand: "echo {{value}}",
      args: [arg],
      argValues: {
        [arg.key]: value
      }
    });

    expect(result.blockedMessage).toBeNull();
  });

  it.each(INJECTION_CASES)(
    "blocks text arg when value contains injection token: $label",
    ({ value }) => {
      const result = checkSingleCommandSafety({
        title: "inject-block",
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
          message: value
        }
      });

      expect(result.blockedMessage).toContain("message");
      expect(result.blockedMessage).toContain("注入");
      expect(result.confirmationReasons).toHaveLength(0);
    }
  );

  it("keeps trim boundary behavior: valid value passes but trimmed invalid value still blocks", () => {
    const allowed = checkSingleCommandSafety({
      title: "trim-allow",
      renderedCommand: "echo {{shell}}",
      args: [
        {
          key: "shell",
          label: "shell",
          token: "{{shell}}",
          required: true,
          argType: "text",
          options: ["pwsh"]
        }
      ],
      argValues: {
        shell: "   pwsh   "
      }
    });

    const blocked = checkSingleCommandSafety({
      title: "trim-block",
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
        message: "   whoami; id   "
      }
    });

    expect(allowed.blockedMessage).toBeNull();
    expect(blocked.blockedMessage).toContain("注入");
  });

  it("fails fast for queue and clears confirmationItems when any item is blocked", () => {
    const result = checkQueueCommandSafety([
      {
        title: "needs-confirmation",
        renderedCommand: "taskkill /F /PID 8888",
        dangerous: true
      },
      {
        title: "blocked-item",
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
          message: "  whoami | cat /etc/passwd  "
        }
      }
    ]);

    expect(result.blockedMessage).toContain("blocked-item");
    expect(result.blockedMessage).toMatch(/[:：]/);
    expect(result.blockedMessage).toContain("注入");
    expect(result.confirmationItems).toHaveLength(0);
  });
});
