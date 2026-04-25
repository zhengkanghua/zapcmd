import { describe, expect, it } from "vitest";

import { CommandExecutionError } from "../../../services/commandExecutor";
import {
  buildCommandUnavailableFeedback,
  buildExecutionFailureFeedback
} from "../../execution/useCommandExecution/helpers";

describe("useCommandExecution helpers", () => {
  it("formats structured terminal launch failures for queue mode", () => {
    const error = new CommandExecutionError(
      "terminal-launch-failed",
      "terminal launch failed"
    );

    const message = buildExecutionFailureFeedback(error, "queue");

    expect(message).toContain("终端");
    expect(message).toContain("下一步");
  });

  it("formats platform unsupported failures with actionable next step", () => {
    const error = new CommandExecutionError(
      "terminal-launch-failed",
      "not supported on this platform"
    );

    const message = buildExecutionFailureFeedback(error, "single");

    expect(message).toContain("当前平台");
    expect(message).toContain("下一步");
  });

  it("formats unavailable command feedback in queue mode", () => {
    const message = buildCommandUnavailableFeedback(
      {
        code: "invalid-arg-pattern",
        message: "命令配置有问题，暂时不可用。",
        detail: "参数 value 的校验正则无效。"
      },
      "queue"
    );

    expect(message).toContain("命令配置有问题");
    expect(message).toContain("下一步");
  });
});
