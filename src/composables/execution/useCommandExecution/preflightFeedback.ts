import type {
  CommandPrerequisite,
  CommandPrerequisiteProbeResult
} from "../../../features/commands/prerequisiteTypes";
import { t } from "../../../i18n";

const TRAILING_PUNCTUATION_RE = /[。.!！？]+$/u;

export interface CommandPreflightIssue {
  title?: string;
  prerequisite?: CommandPrerequisite;
  result: CommandPrerequisiteProbeResult;
}

interface PreflightFeedbackOptions {
  resolveCommandTitle?: (commandId: string) => string | null;
}

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

function resolveCheckTarget(prerequisite?: CommandPrerequisite): string | null {
  const check = trimText(prerequisite?.check);
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

function resolveDisplaySubject(prerequisite?: CommandPrerequisite): string {
  const displayName = trimText(prerequisite?.displayName);
  if (displayName) {
    return displayName;
  }
  return resolveCheckTarget(prerequisite) ?? trimText(prerequisite?.id) ?? "";
}

function resolveResolutionHint(prerequisite?: CommandPrerequisite): string | null {
  const resolutionHint = trimText(prerequisite?.resolutionHint);
  if (resolutionHint) {
    return resolutionHint;
  }
  const installHint = trimText(prerequisite?.installHint);
  return installHint || null;
}

function resolveFallbackTitle(
  commandId: string,
  resolveCommandTitle?: (commandId: string) => string | null
): string {
  const resolved = trimText(resolveCommandTitle?.(commandId) ?? undefined);
  return resolved || commandId;
}

function formatReason(issue: CommandPreflightIssue): string {
  const subject = resolveDisplaySubject(issue.prerequisite) || trimText(issue.result.id);
  if (issue.result.code === "missing-binary") {
    return t("execution.preflightReasonMissingBinary", { subject });
  }
  if (issue.result.code === "missing-shell") {
    return t("execution.preflightReasonMissingShell", { subject });
  }
  if (issue.result.code === "missing-env") {
    return t("execution.preflightReasonMissingEnv", {
      subject,
      target: resolveCheckTarget(issue.prerequisite) ?? trimText(issue.result.id)
    });
  }
  return ensureSentence(trimText(issue.result.message) || trimText(issue.result.code));
}

function formatActions(
  issue: CommandPreflightIssue,
  options: PreflightFeedbackOptions
): string[] {
  const actions: string[] = [];
  const resolutionHint = resolveResolutionHint(issue.prerequisite);
  const fallbackCommandId = trimText(issue.prerequisite?.fallbackCommandId);

  if (resolutionHint) {
    actions.push(
      t("execution.preflightResolutionHint", {
        hint: resolutionHint.replace(TRAILING_PUNCTUATION_RE, "")
      })
    );
  }
  if (fallbackCommandId) {
    actions.push(
      t("execution.preflightFallbackCommandTitle", {
        commandTitle: resolveFallbackTitle(fallbackCommandId, options.resolveCommandTitle)
      })
    );
  }

  return actions;
}

function formatIssue(
  issue: CommandPreflightIssue,
  options: PreflightFeedbackOptions
): string {
  const detail = [formatReason(issue), ...formatActions(issue, options)].join(" ");
  const title = trimText(issue.title);
  return title ? `${title}：${detail}` : detail;
}

function formatSystemFailure(issues: CommandPreflightIssue[]): string {
  if (issues.every((issue) => issue.result.code === "probe-invalid-response")) {
    return t("execution.preflightProbeInvalidResponse");
  }
  return t("execution.preflightProbeFailed");
}

export function isSystemPreflightFailure(
  result: CommandPrerequisiteProbeResult
): boolean {
  return result.code === "probe-error" || result.code === "probe-invalid-response";
}

export function formatBlockingPreflightFeedback(
  issues: CommandPreflightIssue[],
  options: PreflightFeedbackOptions = {}
): string {
  if (issues.length === 0) {
    return t("execution.preflightBlockedSummary");
  }
  if (issues.every((issue) => isSystemPreflightFailure(issue.result))) {
    return formatSystemFailure(issues);
  }
  return [
    t("execution.preflightBlockedSummary"),
    ...issues.map((issue) => formatIssue(issue, options))
  ].join(" ");
}

export function formatWarningPreflightFeedback(
  issues: CommandPreflightIssue[],
  options: PreflightFeedbackOptions = {}
): string {
  if (issues.length === 0) {
    return "";
  }
  if (issues.every((issue) => isSystemPreflightFailure(issue.result))) {
    return formatSystemFailure(issues);
  }
  const summary =
    issues.length === 1
      ? t("execution.preflightWarningSummary")
      : t("execution.preflightWarningSummaryMany", { count: issues.length });
  return [summary, ...issues.map((issue) => formatIssue(issue, options))].join(" ");
}
