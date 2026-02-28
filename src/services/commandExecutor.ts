import { invoke, isTauri } from "@tauri-apps/api/core";

export interface CommandExecutionRequest {
  terminalId: string;
  command: string;
}

export interface CommandExecutor {
  run(request: CommandExecutionRequest): Promise<void>;
}

class TauriCommandExecutor implements CommandExecutor {
  async run(request: CommandExecutionRequest): Promise<void> {
    await invoke("run_command_in_terminal", {
      terminalId: request.terminalId,
      command: request.command
    });
  }
}

class BrowserNoopCommandExecutor implements CommandExecutor {
  async run(_request: CommandExecutionRequest): Promise<void> {
    // Web preview mode: no terminal bridge.
  }
}

export function createCommandExecutor(): CommandExecutor {
  return isTauri() ? new TauriCommandExecutor() : new BrowserNoopCommandExecutor();
}
