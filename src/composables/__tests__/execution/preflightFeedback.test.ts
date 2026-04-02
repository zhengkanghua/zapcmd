import { describe, expect, it } from "vitest";
import type {
  CommandPrerequisite,
  CommandPrerequisiteProbeResult
} from "../../../features/commands/prerequisiteTypes";
import {
  formatBlockingPreflightFeedback,
  formatWarningPreflightFeedback,
  isSystemPreflightFailure,
  type CommandPreflightIssue
} from "../../execution/useCommandExecution/preflightFeedback";

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
    installHint: "兼容旧字段",
    fallbackCommandId: "install-docker",
    ...overrides
  };
}

function createIssue(
  overrides: Partial<CommandPreflightIssue> = {}
): CommandPreflightIssue {
  return {
    prerequisite: createPrerequisite(),
    result: createProbeResult(),
    ...overrides
  };
}

describe("preflightFeedback", () => {
  it("formats blocking binary prerequisite feedback with resolution and fallback title", () => {
    const message = formatBlockingPreflightFeedback(
      [
        createIssue({
          prerequisite: createPrerequisite({
            resolutionHint: "新字段优先",
            installHint: "兼容旧字段"
          })
        })
      ],
      {
        resolveCommandTitle: (commandId) =>
          commandId === "install-docker" ? "安装 Docker" : null
      }
    );

    expect(message).toContain("无法执行该命令。");
    expect(message).toContain("未检测到 Docker Desktop。");
    expect(message).toContain("处理建议：新字段优先。");
    expect(message).toContain("可改用“安装 Docker”命令。");
  });

  it("formats missing-shell feedback with humanized reason", () => {
    const message = formatBlockingPreflightFeedback([
      createIssue({
        prerequisite: createPrerequisite({
          id: "powershell",
          type: "shell",
          check: "shell:powershell",
          displayName: "PowerShell 7",
          resolutionHint: "安装 PowerShell 7 后重试"
        }),
        result: createProbeResult({
          id: "powershell",
          code: "missing-shell",
          message: "required shell not found: powershell"
        })
      })
    ]);

    expect(message).toContain("当前环境缺少 PowerShell 7。");
  });

  it("formats missing-env feedback with display name and env target", () => {
    const message = formatBlockingPreflightFeedback([
      createIssue({
        prerequisite: createPrerequisite({
          id: "github-token",
          type: "env",
          check: "env:GITHUB_TOKEN",
          displayName: "GitHub Token",
          resolutionHint: "设置 GITHUB_TOKEN 后重试",
          fallbackCommandId: undefined
        }),
        result: createProbeResult({
          id: "github-token",
          code: "missing-env",
          message: "required environment variable not found: GITHUB_TOKEN"
        })
      })
    ]);

    expect(message).toContain("缺少 GitHub Token（环境变量 GITHUB_TOKEN）。");
  });

  it("prefixes queue item title and falls back to command id when fallback title is missing", () => {
    const message = formatBlockingPreflightFeedback(
      [
        createIssue({
          title: "docker-ps"
        })
      ],
      {
        resolveCommandTitle: () => null
      }
    );

    expect(message).toContain("docker-ps：未检测到 Docker Desktop。");
    expect(message).toContain("可改用“install-docker”命令。");
  });

  it("formats warning feedback with the optional summary", () => {
    const message = formatWarningPreflightFeedback([
      createIssue({
        result: createProbeResult({
          required: false
        }),
        prerequisite: createPrerequisite({
          required: false
        })
      })
    ]);

    expect(message).toContain("命令已发送到终端，但有一项可选依赖未满足。");
    expect(message).toContain("未检测到 Docker Desktop。");
  });

  it("falls back to prerequisite id and installHint when new metadata is missing", () => {
    const message = formatBlockingPreflightFeedback([
      createIssue({
        prerequisite: createPrerequisite({
          id: "jq",
          check: "",
          displayName: undefined,
          resolutionHint: undefined,
          installHint: "先安装 jq",
          fallbackCommandId: undefined
        }),
        result: createProbeResult({
          id: "jq",
          message: ""
        })
      })
    ]);

    expect(message).toContain("未检测到 jq。");
    expect(message).toContain("处理建议：先安装 jq。");
  });

  it("uses the raw message as a fallback for unknown codes", () => {
    const message = formatBlockingPreflightFeedback([
      createIssue({
        prerequisite: undefined,
        result: createProbeResult({
          id: "custom-check",
          code: "custom-error",
          message: "custom diagnostic"
        })
      })
    ]);

    expect(message).toContain("custom diagnostic。");
  });

  it("formats system invalid-response and empty collections", () => {
    expect(formatBlockingPreflightFeedback([])).toBe("无法执行该命令。");
    expect(formatWarningPreflightFeedback([])).toBe("");
    expect(
      formatBlockingPreflightFeedback([
        createIssue({
          result: createProbeResult({
            code: "probe-invalid-response",
            message: "invalid"
          })
        })
      ])
    ).toContain("执行前检查返回了无效结果");
  });

  it("formats multiple optional warnings with plural summary", () => {
    const message = formatWarningPreflightFeedback([
      createIssue({
        result: createProbeResult({
          required: false
        }),
        prerequisite: createPrerequisite({
          required: false
        })
      }),
      createIssue({
        prerequisite: createPrerequisite({
          id: "github-token",
          type: "env",
          required: false,
          check: "env:GITHUB_TOKEN",
          displayName: "GitHub Token",
          resolutionHint: "设置 GITHUB_TOKEN 后重试",
          fallbackCommandId: undefined
        }),
        result: createProbeResult({
          id: "github-token",
          code: "missing-env",
          required: false,
          message: "required environment variable not found: GITHUB_TOKEN"
        })
      })
    ]);

    expect(message).toContain("2 项可选依赖未满足。");
    expect(message).toContain("缺少 GitHub Token（环境变量 GITHUB_TOKEN）。");
  });

  it("detects system-level preflight failures", () => {
    expect(
      isSystemPreflightFailure(
        createProbeResult({
          code: "probe-error"
        })
      )
    ).toBe(true);
    expect(
      isSystemPreflightFailure(
        createProbeResult({
          code: "probe-invalid-response"
        })
      )
    ).toBe(true);
    expect(
      isSystemPreflightFailure(
        createProbeResult({
          code: "missing-binary"
        })
      )
    ).toBe(false);
  });
});
