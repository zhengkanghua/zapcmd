import type { Ref } from "vue";
import type { TerminalOption } from "../../features/terminals/fallbackTerminals";
import { resolveEffectiveTerminal } from "../../features/terminals/resolveEffectiveTerminal";
import type {
  CommandExecutor,
  StructuredTerminalExecutionStep
} from "../../services/commandExecutor";
import type { TerminalReusePolicy } from "../../stores/settingsStore";

interface UseTerminalExecutionOptions {
  commandExecutor: CommandExecutor;
  defaultTerminal: Ref<string>;
  alwaysElevatedTerminal: Ref<boolean>;
  terminalReusePolicy: Ref<TerminalReusePolicy>;
  availableTerminals: Ref<TerminalOption[]>;
  fallbackTerminalOptions: () => TerminalOption[];
  isTauriRuntime: () => boolean;
  readAvailableTerminals: () => Promise<TerminalOption[]>;
  persistCorrectedTerminal: () => void;
}

interface TerminalExecutionOptions {
  requiresElevation?: boolean;
}

async function resolveAvailableTerminals(
  options: UseTerminalExecutionOptions
): Promise<TerminalOption[]> {
  if (options.availableTerminals.value.length > 0) {
    return options.availableTerminals.value;
  }

  if (!options.isTauriRuntime()) {
    return [];
  }

  try {
    const discovered = await options.readAvailableTerminals();
    if (Array.isArray(discovered) && discovered.length > 0) {
      options.availableTerminals.value = discovered;
      return discovered;
    }
  } catch (error) {
    console.warn("readAvailableTerminals before execution failed", error);
  }

  return [];
}

async function resolveTerminalIdBeforeDispatch(
  options: UseTerminalExecutionOptions
): Promise<string> {
  const availableTerminals = await resolveAvailableTerminals(options);
  const resolution = resolveEffectiveTerminal(
    options.defaultTerminal.value,
    availableTerminals,
    options.fallbackTerminalOptions()
  );
  if (resolution.corrected) {
    options.defaultTerminal.value = resolution.effectiveId;
    try {
      options.persistCorrectedTerminal();
    } catch (error) {
      console.warn("persist corrected terminal before execution failed", error);
    }
  }
  return resolution.effectiveId;
}

function normalizeExecutionSteps(
  steps: StructuredTerminalExecutionStep[]
): StructuredTerminalExecutionStep[] {
  return steps.filter((step) => step.summary.trim().length > 0);
}

/**
 * 暴露单条与批量终端执行入口；真正的 shell/runner 适配下沉到 Rust executor。
 * @param options 命令执行器与默认终端引用。
 * @returns 终端执行相关的组合式 API。
 */
export function useTerminalExecution(options: UseTerminalExecutionOptions) {
  async function runCommandInTerminal(
    step: StructuredTerminalExecutionStep,
    executionOptions: TerminalExecutionOptions = {}
  ): Promise<void> {
    const summary = step.summary.trim();
    if (summary.length === 0) {
      throw new Error("Command summary cannot be empty.");
    }

    const terminalId = await resolveTerminalIdBeforeDispatch(options);
    await options.commandExecutor.run({
      terminalId,
      steps: [step],
      requiresElevation: executionOptions.requiresElevation === true,
      alwaysElevated: options.alwaysElevatedTerminal.value,
      terminalReusePolicy: options.terminalReusePolicy.value
    });
  }

  async function runCommandsInTerminal(
    steps: StructuredTerminalExecutionStep[],
    executionOptions: TerminalExecutionOptions = {}
  ): Promise<void> {
    const normalizedSteps = normalizeExecutionSteps(steps);
    if (normalizedSteps.length === 0) {
      throw new Error("No executable commands in queue.");
    }

    const terminalId = await resolveTerminalIdBeforeDispatch(options);
    await options.commandExecutor.run({
      terminalId,
      steps: normalizedSteps,
      requiresElevation: executionOptions.requiresElevation === true,
      alwaysElevated: options.alwaysElevatedTerminal.value,
      terminalReusePolicy: options.terminalReusePolicy.value
    });
  }

  return {
    runCommandInTerminal,
    runCommandsInTerminal
  };
}
