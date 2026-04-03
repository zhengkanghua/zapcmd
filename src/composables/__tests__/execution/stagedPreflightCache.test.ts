import { describe, expect, it } from "vitest";
import type {
  CommandPrerequisite,
  CommandPrerequisiteProbeResult
} from "../../../features/commands/prerequisiteTypes";
import type { CommandPreflightIssue } from "../../execution/useCommandExecution/helpers";
import {
  buildRefreshQueueFeedbackMessage,
  buildStageQueueFeedbackMessage,
  buildStagedPreflightCache,
  countQueuedCommandsWithPreflightIssues,
  summarizeStagedPreflightIssues
} from "../../execution/useCommandExecution/stagedPreflightCache";

function createPrerequisite(
  overrides: Partial<CommandPrerequisite> = {}
): CommandPrerequisite {
  return {
    id: "docker",
    type: "binary",
    required: true,
    check: "binary:docker",
    displayName: "Docker Desktop",
    resolutionHint: "安装 Docker Desktop 后重试",
    ...overrides
  };
}

function createProbeResult(
  overrides: Partial<CommandPrerequisiteProbeResult> = {}
): CommandPrerequisiteProbeResult {
  return {
    id: "docker",
    ok: false,
    code: "missing-binary",
    message: "required binary not found: docker",
    required: true,
    ...overrides
  };
}

function createIssue(overrides: Partial<CommandPreflightIssue> = {}): CommandPreflightIssue {
  return {
    prerequisite: createPrerequisite(),
    result: createProbeResult(),
    ...overrides
  };
}

describe("stagedPreflightCache", () => {
  it("returns undefined cache for clean commands and empty summary for missing cache", () => {
    expect(buildStagedPreflightCache("docker-ps", [])).toBeUndefined();
    expect(summarizeStagedPreflightIssues(undefined)).toBe("");
  });

  it("builds cache from a single prerequisite issue", () => {
    const cache = buildStagedPreflightCache("docker-ps", [createIssue()]);

    expect(cache?.issues).toEqual(["未检测到 Docker Desktop。"]);
    expect(cache?.issueCount).toBe(1);
    expect(cache?.source).toBe("issues");
    expect(summarizeStagedPreflightIssues(cache)).toBe("未检测到 Docker Desktop。");
  });

  it("summarizes multiple prerequisite issues into a compact message", () => {
    const cache = buildStagedPreflightCache("docker-ps", [
      createIssue(),
      createIssue({
        prerequisite: createPrerequisite({
          id: "github-token",
          type: "env",
          check: "env:GITHUB_TOKEN",
          displayName: "GitHub Token"
        }),
        result: createProbeResult({
          id: "github-token",
          code: "missing-env",
          message: "required environment variable not found: GITHUB_TOKEN"
        })
      })
    ]);

    expect(cache).toBeTruthy();
    expect(summarizeStagedPreflightIssues(cache!)).toBe("未检测到 Docker Desktop 等 2 项环境提示。");
  });

  it("collapses probe failures into a system-failure cache", () => {
    const cache = buildStagedPreflightCache("docker-ps", [
      createIssue({
        result: createProbeResult({
          code: "probe-error",
          message: "probe transport failed"
        })
      })
    ]);

    expect(cache?.source).toBe("system-failure");
    expect(cache?.issues).toEqual(["执行前检查暂时失败，请重试或查看日志。"]);
  });

  it("uses the invalid-response system message when every probe returns invalid", () => {
    const cache = buildStagedPreflightCache("docker-ps", [
      createIssue({
        result: createProbeResult({
          code: "probe-invalid-response",
          message: "invalid response"
        })
      })
    ]);

    expect(cache?.issues).toEqual(["执行前检查返回了无效结果，请重试或查看日志。"]);
  });

  it("falls back to check target and raw code-compatible wording when displayName is missing", () => {
    const cache = buildStagedPreflightCache("shell-check", [
      createIssue({
        prerequisite: createPrerequisite({
          id: "powershell",
          type: "shell",
          check: "shell:powershell",
          displayName: undefined
        }),
        result: createProbeResult({
          id: "powershell",
          code: "missing-shell",
          message: "required shell not found: powershell"
        })
      })
    ]);

    expect(cache?.issues).toEqual(["当前环境缺少 powershell。"]);
  });

  it("falls back to probe result id when env check target has no colon", () => {
    const cache = buildStagedPreflightCache("gh-auth", [
      createIssue({
        prerequisite: createPrerequisite({
          id: "github-token",
          type: "env",
          check: "GITHUB_TOKEN",
          displayName: undefined
        }),
        result: createProbeResult({
          id: "github-token",
          code: "missing-env",
          message: "required environment variable not found"
        })
      })
    ]);

    expect(cache?.issues).toEqual(["缺少 github-token（环境变量 github-token）。"]);
  });

  it("uses raw result code when custom issue has no message", () => {
    const cache = buildStagedPreflightCache("custom-check", [
      createIssue({
        result: createProbeResult({
          code: "custom-check-failed",
          message: ""
        })
      })
    ]);

    expect(cache?.issues).toEqual(["custom-check-failed。"]);
  });

  it("keeps normal issue reasons when mixed with system failures", () => {
    const cache = buildStagedPreflightCache("gh-auth", [
      createIssue({
        result: createProbeResult({
          code: "probe-error",
          message: "transport failed"
        })
      }),
      createIssue({
        prerequisite: createPrerequisite({
          id: "github-token",
          type: "env",
          check: "env:GITHUB_TOKEN",
          displayName: "GitHub Token"
        }),
        result: createProbeResult({
          id: "github-token",
          code: "missing-env",
          message: "required environment variable not found: GITHUB_TOKEN"
        })
      })
    ]);

    expect(cache?.source).toBe("issues");
    expect(cache?.issues).toEqual(["缺少 GitHub Token（环境变量 GITHUB_TOKEN）。"]);
  });

  it("builds queue feedback summaries from queued cache state", () => {
    expect(buildStageQueueFeedbackMessage(0)).toBe("已加入队列");
    expect(buildStageQueueFeedbackMessage(1)).toContain("1 条命令存在环境提示");
    expect(buildRefreshQueueFeedbackMessage(0)).toBe("已刷新检测");
    expect(buildRefreshQueueFeedbackMessage(2)).toContain("2 条命令存在环境提示");
    expect(
      countQueuedCommandsWithPreflightIssues([
        { preflightCache: undefined },
        {
          preflightCache: {
            checkedAt: 1,
            issueCount: 0,
            source: "issues",
            issues: []
          }
        },
        {
          preflightCache: {
            checkedAt: 2,
            issueCount: 2,
            source: "issues",
            issues: ["未检测到 Docker Desktop。", "缺少 GitHub Token（环境变量 GITHUB_TOKEN）。"]
          }
        }
      ])
    ).toBe(1);
  });
});
