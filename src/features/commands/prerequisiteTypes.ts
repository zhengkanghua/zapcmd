export const SUPPORTED_PREREQUISITE_TYPES = [
  "binary",
  "shell",
  "env"
] as const;

export type CommandPrerequisiteType = (typeof SUPPORTED_PREREQUISITE_TYPES)[number];

export interface CommandPrerequisite {
  id: string;
  type: CommandPrerequisiteType;
  required: boolean;
  check: string;
  displayName?: string;
  resolutionHint?: string;
  installHint?: string;
  fallbackCommandId?: string;
}

export interface CommandPrerequisiteProbeResult {
  id: string;
  ok: boolean;
  code: string;
  message: string;
  required: boolean;
}

export function isSupportedPrerequisiteType(
  value: string
): value is CommandPrerequisiteType {
  return (SUPPORTED_PREREQUISITE_TYPES as readonly string[]).includes(value);
}
