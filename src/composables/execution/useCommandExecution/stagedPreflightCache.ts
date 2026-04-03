import { t } from "../../../i18n";
import type { StagedCommandPreflightCache } from "../../../features/launcher/types";
import {
  isSystemPreflightFailure,
  type CommandPreflightIssue
} from "./preflightFeedback";

const TRAILING_PUNCTUATION_RE = /[。.!！？]+$/u;

function trimText(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return TRAILING_PUNCTUATION_RE.test(trimmed) ? trimmed : `${trimmed}。`;
}

function resolveCheckTarget(issue: CommandPreflightIssue): string | null {
  const check = trimText(issue.prerequisite?.check);
  if (!check) {
    return null;
  }
  const separatorIndex = check.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }
  const target = check.slice(separatorIndex + 1).trim();
  return target.length > 0 ? target : null;
}

function resolveDisplaySubject(issue: CommandPreflightIssue): string {
  const displayName = trimText(issue.prerequisite?.displayName);
  if (displayName) {
    return displayName;
  }
  return resolveCheckTarget(issue) ?? trimText(issue.result.id);
}

function formatIssueReason(issue: CommandPreflightIssue): string {
  const subject = resolveDisplaySubject(issue);
  if (issue.result.code === "missing-binary") {
    return t("execution.preflightReasonMissingBinary", { subject });
  }
  if (issue.result.code === "missing-shell") {
    return t("execution.preflightReasonMissingShell", { subject });
  }
  if (issue.result.code === "missing-env") {
    return t("execution.preflightReasonMissingEnv", {
      subject,
      target: resolveCheckTarget(issue) ?? trimText(issue.result.id)
    });
  }
  return ensureSentence(trimText(issue.result.message) || trimText(issue.result.code));
}

function formatSystemFailure(issues: CommandPreflightIssue[]): string {
  if (issues.every((issue) => issue.result.code === "probe-invalid-response")) {
    return t("execution.preflightProbeInvalidResponse");
  }
  return t("execution.preflightProbeFailed");
}

export function buildStagedPreflightCache(
  _commandTitle: string,
  issues: CommandPreflightIssue[]
): StagedCommandPreflightCache | undefined {
  if (issues.length === 0) {
    return undefined;
  }

  if (issues.every((issue) => isSystemPreflightFailure(issue.result))) {
    return {
      checkedAt: Date.now(),
      issueCount: 1,
      source: "system-failure",
      issues: [formatSystemFailure(issues)]
    };
  }

  const reasons = issues
    .filter((issue) => !isSystemPreflightFailure(issue.result))
    .map((issue) => formatIssueReason(issue))
    .filter((item) => item.length > 0);

  if (reasons.length === 0) {
    return {
      checkedAt: Date.now(),
      issueCount: 1,
      source: "system-failure",
      issues: [formatSystemFailure(issues)]
    };
  }

  return {
    checkedAt: Date.now(),
    issueCount: reasons.length,
    source: "issues",
    issues: reasons
  };
}

export function summarizeStagedPreflightIssues(
  cache: StagedCommandPreflightCache | undefined
): string {
  const firstIssue = trimText(cache?.issues[0]);
  if (!cache || cache.issueCount <= 0 || !firstIssue) {
    return "";
  }
  if (cache.issueCount === 1) {
    return ensureSentence(firstIssue);
  }
  return `${firstIssue.replace(TRAILING_PUNCTUATION_RE, "")} 等 ${cache.issueCount} 项环境提示。`;
}

export function countQueuedCommandsWithPreflightIssues(
  queuedCommands: Array<{ preflightCache?: StagedCommandPreflightCache }>
): number {
  return queuedCommands.filter((item) => (item.preflightCache?.issueCount ?? 0) > 0).length;
}

export function buildStageQueueFeedbackMessage(issueCommandCount: number): string {
  if (issueCommandCount <= 0) {
    return t("launcher.flowAdded");
  }
  return `${t("launcher.flowAdded")}，${t("launcher.queuePreflightIssueSummary", {
    count: issueCommandCount
  })}。`;
}

export function buildRefreshQueueFeedbackMessage(issueCommandCount: number): string {
  if (issueCommandCount <= 0) {
    return t("launcher.queuePreflightRefreshDone");
  }
  return `${t("launcher.queuePreflightRefreshDone")}，${t("launcher.queuePreflightIssueSummary", {
    count: issueCommandCount
  })}。`;
}
