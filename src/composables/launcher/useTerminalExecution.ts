import type { Ref } from "vue";
import type { TerminalOption } from "../../features/terminals/fallbackTerminals";
import { resolveEffectiveTerminal } from "../../features/terminals/resolveEffectiveTerminal";
import {
  CommandExecutionError,
  type CommandExecutor,
  type StructuredTerminalExecutionStep
} from "../../services/commandExecutor";
import type { TerminalReusePolicy } from "../../stores/settingsStore";

interface UseTerminalExecutionOptions {
  commandExecutor: CommandExecutor;
  defaultTerminal: Ref<string>;
  alwaysElevatedTerminal: Ref<boolean>;
  terminalReusePolicy: Ref<TerminalReusePolicy>;
  availableTerminals: Ref<TerminalOption[]>;
  availableTerminalsTrusted: Ref<boolean>;
  fallbackTerminalOptions: () => TerminalOption[];
  isTauriRuntime: () => boolean;
  readAvailableTerminals: () => Promise<TerminalOption[]>;
  persistCorrectedTerminal: () => void;
}

interface TerminalExecutionOptions {
  requiresElevation?: boolean;
}

interface ResolvedTerminalOptions {
  terminals: TerminalOption[];
  trusted: boolean;
  usedTrustedCache: boolean;
}

interface TerminalResolutionResult {
  terminalId: string;
  usedTrustedCache: boolean;
}

async function resolveAvailableTerminals(
  options: UseTerminalExecutionOptions,
  resolveOptions: { forceDiscovery?: boolean } = {}
): Promise<ResolvedTerminalOptions> {
  if (
    !resolveOptions.forceDiscovery &&
    options.availableTerminalsTrusted.value &&
    options.availableTerminals.value.length > 0
  ) {
    return {
      terminals: options.availableTerminals.value,
      trusted: true,
      usedTrustedCache: true
    };
  }

  if (!options.isTauriRuntime()) {
    return {
      terminals: [],
      trusted: false,
      usedTrustedCache: false
    };
  }

  try {
    const discovered = await options.readAvailableTerminals();
    if (Array.isArray(discovered) && discovered.length > 0) {
      options.availableTerminals.value = discovered;
      options.availableTerminalsTrusted.value = true;
      return {
        terminals: discovered,
        trusted: true,
        usedTrustedCache: false
      };
    }
    options.availableTerminals.value = [];
    options.availableTerminalsTrusted.value = false;
  } catch (error) {
    console.warn("readAvailableTerminals before execution failed", error);
    options.availableTerminals.value = [];
    options.availableTerminalsTrusted.value = false;
  }

  return {
    terminals: [],
    trusted: false,
    usedTrustedCache: false
  };
}

async function resolveTerminalIdBeforeDispatch(
  options: UseTerminalExecutionOptions,
  resolveOptions: { forceDiscovery?: boolean } = {}
): Promise<TerminalResolutionResult> {
  const { terminals: availableTerminals, trusted, usedTrustedCache } =
    await resolveAvailableTerminals(options, resolveOptions);
  const resolution = resolveEffectiveTerminal(
    options.defaultTerminal.value,
    availableTerminals,
    options.fallbackTerminalOptions()
  );
  if (resolution.corrected && trusted) {
    options.defaultTerminal.value = resolution.effectiveId;
    try {
      options.persistCorrectedTerminal();
    } catch (error) {
      console.warn("persist corrected terminal before execution failed", error);
    }
  }
  return {
    terminalId: resolution.effectiveId,
    usedTrustedCache
  };
}

function normalizeExecutionSteps(
  steps: StructuredTerminalExecutionStep[]
): StructuredTerminalExecutionStep[] {
  return steps.filter((step) => step.summary.trim().length > 0);
}

function shouldRetryAfterInvalidTerminalRequest(
  error: unknown,
  resolution: TerminalResolutionResult,
  options: UseTerminalExecutionOptions
): error is CommandExecutionError {
  return (
    error instanceof CommandExecutionError &&
    error.code === "invalid-request" &&
    resolution.usedTrustedCache &&
    options.isTauriRuntime()
  );
}

/**
 * 暴露单条与批量终端执行入口；真正的 shell/runner 适配下沉到 Rust executor。
 * @param options 命令执行器与默认终端引用。
 * @returns 终端执行相关的组合式 API。
 */
export function useTerminalExecution(options: UseTerminalExecutionOptions) {
  async function runTerminalRequest(params: {
    steps: StructuredTerminalExecutionStep[];
    requiresElevation: boolean;
  }): Promise<void> {
    const firstResolution = await resolveTerminalIdBeforeDispatch(options);
    const baseRequest = {
      steps: params.steps,
      requiresElevation: params.requiresElevation,
      alwaysElevated: options.alwaysElevatedTerminal.value,
      terminalReusePolicy: options.terminalReusePolicy.value
    };

    try {
      await options.commandExecutor.run({
        terminalId: firstResolution.terminalId,
        ...baseRequest
      });
    } catch (error) {
      if (!shouldRetryAfterInvalidTerminalRequest(error, firstResolution, options)) {
        throw error;
      }

      const retriedResolution = await resolveTerminalIdBeforeDispatch(options, {
        forceDiscovery: true
      });
      await options.commandExecutor.run({
        terminalId: retriedResolution.terminalId,
        ...baseRequest
      });
    }
  }

  async function runCommandInTerminal(
    step: StructuredTerminalExecutionStep,
    executionOptions: TerminalExecutionOptions = {}
  ): Promise<void> {
    const summary = step.summary.trim();
    if (summary.length === 0) {
      throw new Error("Command summary cannot be empty.");
    }

    // 前端统一透传 reuse policy；当前只有 Windows 后端真正消费，其他平台保持无条件忽略。
    await runTerminalRequest({
      steps: [step],
      requiresElevation: executionOptions.requiresElevation === true,
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

    // 批量执行与单条执行共享同一契约，避免前端再按平台分叉 reuse policy 行为。
    await runTerminalRequest({
      steps: normalizedSteps,
      requiresElevation: executionOptions.requiresElevation === true,
    });
  }

  return {
    runCommandInTerminal,
    runCommandsInTerminal
  };
}
