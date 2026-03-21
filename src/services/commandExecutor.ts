import { invoke, isTauri } from "@tauri-apps/api/core";
import { t } from "../i18n";

export interface CommandExecutionRequest {
  terminalId: string;
  command: string;
  requiresElevation?: boolean;
  alwaysElevated?: boolean;
}

export interface CommandExecutor {
  run(request: CommandExecutionRequest): Promise<void>;
}

export class CommandExecutionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CommandExecutionError";
    this.code = code;
  }
}

function isStructuredExecutionError(
  error: unknown
): error is { code: string; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as Record<string, unknown>).code === "string"
  );
}

class TauriCommandExecutor implements CommandExecutor {
  async run(request: CommandExecutionRequest): Promise<void> {
    try {
      await invoke("run_command_in_terminal", {
        terminalId: request.terminalId,
        command: request.command,
        requiresElevation: request.requiresElevation ?? false,
        alwaysElevated: request.alwaysElevated ?? false
      });
    } catch (error) {
      // Tauri 侧会逐步切到结构化错误，这里先统一收口，避免前端继续猜字符串。
      if (isStructuredExecutionError(error)) {
        const message =
          typeof error.message === "string" && error.message.trim()
            ? error.message.trim()
            : error.code;
        throw new CommandExecutionError(error.code, message);
      }
      throw error;
    }
  }
}

class BrowserNoopCommandExecutor implements CommandExecutor {
  async run(_request: CommandExecutionRequest): Promise<void> {
    throw new Error(t("execution.desktopOnly"));
  }
}

export function createCommandExecutor(): CommandExecutor {
  return isTauri() ? new TauriCommandExecutor() : new BrowserNoopCommandExecutor();
}
