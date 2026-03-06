import type { StartupUpdateCheckResult } from "../../../services/startupUpdateCheck";

export interface StartupUpdatePolicyInput {
  isTauriRuntime: boolean;
  autoCheckUpdateEnabled: boolean;
}

export interface StartupUpdatePolicyDecision {
  shouldCheck: boolean;
  enabled: boolean;
}

export function evaluateStartupUpdatePolicy(
  input: StartupUpdatePolicyInput
): StartupUpdatePolicyDecision {
  return {
    shouldCheck: input.isTauriRuntime && input.autoCheckUpdateEnabled,
    enabled: input.autoCheckUpdateEnabled
  };
}

export interface StartupUpdateFeedbackPolicyDecision {
  shouldNotify: boolean;
  version: string;
}

export function evaluateStartupUpdateFeedbackPolicy(
  result: StartupUpdateCheckResult
): StartupUpdateFeedbackPolicyDecision {
  return {
    shouldNotify: result.available,
    version: result.version?.trim() ?? ""
  };
}

export interface SettingsWindowOpenPolicyInput {
  isTauriRuntime: boolean;
}

export interface SettingsWindowOpenPolicyDecision {
  shouldOpen: boolean;
}

export function evaluateSettingsWindowOpenPolicy(
  input: SettingsWindowOpenPolicyInput
): SettingsWindowOpenPolicyDecision {
  return {
    shouldOpen: input.isTauriRuntime
  };
}
