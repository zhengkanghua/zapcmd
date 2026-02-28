import { describe, expect, it } from "vitest";
import {
  checkQueueCommandSafety,
  checkSingleCommandSafety
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
});
