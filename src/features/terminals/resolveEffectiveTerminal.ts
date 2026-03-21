interface TerminalIdOption {
  id: string;
}

export interface EffectiveTerminalResolution {
  effectiveId: string;
  corrected: boolean;
  reason:
    | "requested-available"
    | "requested-fallback"
    | "fallback-available"
    | "fallback-default"
    | "unresolved";
}

function normalizeTerminalId(value: string): string {
  return value.trim();
}

function includesTerminalId(options: readonly TerminalIdOption[], terminalId: string): boolean {
  return options.some((item) => item.id === terminalId);
}

export function resolveEffectiveTerminal(
  requestedId: string,
  availableTerminals: readonly TerminalIdOption[],
  fallbackOptions: readonly TerminalIdOption[]
): EffectiveTerminalResolution {
  const normalizedRequestedId = normalizeTerminalId(requestedId);

  if (normalizedRequestedId && includesTerminalId(availableTerminals, normalizedRequestedId)) {
    return {
      effectiveId: normalizedRequestedId,
      corrected: false,
      reason: "requested-available"
    };
  }

  if (availableTerminals.length > 0) {
    const effectiveId = availableTerminals[0]?.id ?? normalizedRequestedId;
    return {
      effectiveId,
      corrected: effectiveId !== normalizedRequestedId,
      reason: "fallback-available"
    };
  }

  if (normalizedRequestedId && includesTerminalId(fallbackOptions, normalizedRequestedId)) {
    return {
      effectiveId: normalizedRequestedId,
      corrected: false,
      reason: "requested-fallback"
    };
  }

  if (fallbackOptions.length > 0) {
    const effectiveId = fallbackOptions[0]?.id ?? normalizedRequestedId;
    return {
      effectiveId,
      corrected: effectiveId !== normalizedRequestedId,
      reason: "fallback-default"
    };
  }

  return {
    effectiveId: normalizedRequestedId,
    corrected: false,
    reason: "unresolved"
  };
}
