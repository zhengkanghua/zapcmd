export type CommandLoadIssueCode =
  | "scan-failed"
  | "read-failed"
  | "invalid-json"
  | "invalid-schema"
  | "duplicate-id"
  | "invalid-command-config";

export type CommandLoadIssueStage = "scan" | "read" | "parse" | "schema" | "merge" | "command";

export interface CommandLoadIssue {
  code: CommandLoadIssueCode;
  stage: CommandLoadIssueStage;
  sourceId: string;
  reason: string;
  commandId?: string;
}

function normalizeIssueReason(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return fallback;
  }
  const maxLength = 180;
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function extractIssueReason(error: unknown, fallback: string): string {
  if (error instanceof Error && typeof error.message === "string") {
    return normalizeIssueReason(error.message, fallback);
  }
  if (typeof error === "string") {
    return normalizeIssueReason(error, fallback);
  }
  return fallback;
}

export function createScanFailedIssue(sourceId: string, error: unknown): CommandLoadIssue {
  return {
    code: "scan-failed",
    stage: "scan",
    sourceId,
    reason: extractIssueReason(error, "Failed to scan command source.")
  };
}

export function createReadFailedIssue(sourceId: string, error: unknown): CommandLoadIssue {
  return {
    code: "read-failed",
    stage: "read",
    sourceId,
    reason: extractIssueReason(error, "Failed to read command source.")
  };
}
