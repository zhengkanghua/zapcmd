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

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeProbeResult(
  result: CommandPrerequisiteProbeResult
): CommandPrerequisiteProbeResult {
  const code = result.code.trim();
  const message = result.message.trim().length > 0 ? result.message.trim() : code;

  return {
    id: result.id.trim(),
    ok: result.ok,
    code,
    message,
    required: result.required
  };
}

function isAlignedProbeResult(
  result: unknown,
  prerequisite: CommandPrerequisite
): result is CommandPrerequisiteProbeResult {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return false;
  }

  const candidate = result as Partial<CommandPrerequisiteProbeResult>;
  return (
    typeof candidate.ok === "boolean" &&
    hasNonEmptyString(candidate.code) &&
    typeof candidate.message === "string" &&
    hasNonEmptyString(candidate.id) &&
    typeof candidate.required === "boolean" &&
    candidate.id.trim() === prerequisite.id &&
    candidate.required === prerequisite.required
  );
}

function isValidProbePayload(
  payload: unknown,
  prerequisites: CommandPrerequisite[]
): payload is CommandPrerequisiteProbeResult[] {
  return (
    Array.isArray(payload) &&
    payload.length === prerequisites.length &&
    payload.every((result, index) => {
      const prerequisite = prerequisites[index];
      return prerequisite ? isAlignedProbeResult(result, prerequisite) : false;
    })
  );
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

      if (!isValidProbePayload(payload, prerequisites)) {
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
