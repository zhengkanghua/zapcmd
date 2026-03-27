import { t } from "../../i18n";
import type {
  CommandPrerequisite,
  CommandPrerequisiteProbeResult
} from "./prerequisiteTypes";

export type CommandProbeFailureCode = "probe-error" | "probe-invalid-response";

function resolveProbeFailureMessage(
  code: CommandProbeFailureCode,
  error?: unknown
): string {
  if (code === "probe-error") {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message.trim();
    }
    if (typeof error === "string" && error.trim().length > 0) {
      return error.trim();
    }
    return t("execution.preflightProbeFailed");
  }

  return t("execution.preflightProbeInvalidResponse");
}

/**
 * 将 probe 层异常或畸形返回统一映射为结构化失败结果，避免执行链静默放行。
 * @param prerequisites 原始前置条件列表，用于保留 id / required 语义。
 * @param code 失败类型编码，区分 transport error 与无效响应。
 * @param error 原始异常或附加上下文，用于提取更具体的人类可读错误信息。
 * @returns 与 prerequisites 一一对应的失败结果数组。
 */
export function createProbeFailureResults(
  prerequisites: CommandPrerequisite[],
  code: CommandProbeFailureCode,
  error?: unknown
): CommandPrerequisiteProbeResult[] {
  const message = resolveProbeFailureMessage(code, error);

  return prerequisites.map((prerequisite) => ({
    id: prerequisite.id,
    ok: false,
    code,
    message,
    required: prerequisite.required
  }));
}
