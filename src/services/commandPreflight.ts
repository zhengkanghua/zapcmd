import { invoke, isTauri } from "@tauri-apps/api/core";

import { t } from "../i18n";
import type {
  CommandPrerequisite,
  CommandPrerequisiteProbeResult
} from "../features/commands/prerequisiteTypes";

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

    const payload = await invoke<CommandPrerequisiteProbeResult[]>(
      "probe_command_prerequisites",
      { prerequisites }
    );

    if (!Array.isArray(payload)) {
      return [];
    }

    return payload.map(normalizeProbeResult);
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
