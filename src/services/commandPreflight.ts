import { invoke, isTauri } from "@tauri-apps/api/core";

import { t } from "../i18n";
import type {
  CommandPrerequisite,
  CommandPrerequisiteProbeResult
} from "../features/commands/prerequisiteTypes";
import { createProbeFailureResults } from "../features/commands/prerequisiteProbeFailure";

interface CommandPreflightService {
  check(
    prerequisites: CommandPrerequisite[]
  ): Promise<CommandPrerequisiteProbeResult[]>;
}

function normalizeProbeResult(
  result: Partial<CommandPrerequisiteProbeResult>
): CommandPrerequisiteProbeResult {
  const code =
    typeof result.code === "string" && result.code.trim().length > 0
      ? result.code.trim()
      : "probe-error";
  const message =
    typeof result.message === "string" && result.message.trim().length > 0
      ? result.message.trim()
      : code;

  return {
    id: typeof result.id === "string" ? result.id : "",
    ok: result.ok === true,
    code,
    message,
    required: result.required === true
  };
}

class TauriCommandPreflightService implements CommandPreflightService {
  async check(
    prerequisites: CommandPrerequisite[]
  ): Promise<CommandPrerequisiteProbeResult[]> {
    if (prerequisites.length === 0) {
      return [];
    }

    try {
      const payload = await invoke<CommandPrerequisiteProbeResult[]>(
        "probe_command_prerequisites",
        { prerequisites }
      );

      if (!Array.isArray(payload)) {
        // probe contract 失真时必须 fail-closed，避免把未知状态当成“无问题”继续执行。
        return createProbeFailureResults(prerequisites, "probe-invalid-response");
      }

      return payload.map(normalizeProbeResult);
    } catch (error) {
      // transport / invoke 异常同样视为 probe 失败，由调用方统一按 prerequisite failure 处理。
      return createProbeFailureResults(prerequisites, "probe-error", error);
    }
  }
}

class BrowserCommandPreflightService implements CommandPreflightService {
  async check(
    prerequisites: CommandPrerequisite[]
  ): Promise<CommandPrerequisiteProbeResult[]> {
    return prerequisites.map((prerequisite) => ({
      id: prerequisite.id,
      ok: false,
      code: "unsupported-runtime",
      message: t("execution.desktopOnly"),
      required: prerequisite.required
    }));
  }
}

export function createCommandPreflightService(): CommandPreflightService {
  return isTauri()
    ? new TauriCommandPreflightService()
    : new BrowserCommandPreflightService();
}
