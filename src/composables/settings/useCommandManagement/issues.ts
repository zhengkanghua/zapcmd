import { computed, type Ref } from "vue";
import { t } from "../../../i18n";
import type { CommandLoadIssue } from "../../../features/commands/runtimeLoader";
import type { CommandLoadIssueView } from "../../../features/settings/types";

export function formatIssueStage(issue: CommandLoadIssue): string {
  if (issue.stage === "scan") {
    return t("settings.commands.issueStageScan");
  }
  if (issue.stage === "read") {
    return t("settings.commands.issueStageRead");
  }
  if (issue.stage === "parse") {
    return t("settings.commands.issueStageParse");
  }
  if (issue.stage === "schema") {
    return t("settings.commands.issueStageSchema");
  }
  if (issue.stage === "command") {
    return t("settings.commands.issueStageCommand");
  }
  return t("settings.commands.issueStageMerge");
}

export function formatIssue(issue: CommandLoadIssue): string {
  const stage = formatIssueStage(issue);
  const reason = issue.reason.trim().length > 0 ? issue.reason : t("execution.failedFallback");

  let summary = "";
  if (issue.code === "scan-failed") {
    summary = t("settings.commands.issueScanFailed", { sourceId: issue.sourceId });
  }
  if (issue.code === "read-failed") {
    summary = t("settings.commands.issueReadFailed", { sourceId: issue.sourceId });
  }
  if (issue.code === "invalid-json") {
    summary = t("settings.commands.issueInvalidJson", { sourceId: issue.sourceId });
  }
  if (issue.code === "invalid-schema") {
    summary = t("settings.commands.issueInvalidSchema", { sourceId: issue.sourceId });
  }
  if (issue.code === "duplicate-id") {
    summary = t("settings.commands.issueDuplicateId", {
      commandId: issue.commandId ?? "unknown",
      sourceId: issue.sourceId
    });
  }
  if (issue.code === "invalid-command-config") {
    summary = t("settings.commands.issueInvalidCommandConfig", {
      commandId: issue.commandId ?? "unknown",
      sourceId: issue.sourceId
    });
  }

  return t("settings.commands.issueWithReason", {
    stage,
    summary,
    reason
  });
}

export function createIssueViews(loadIssues: Readonly<Ref<CommandLoadIssue[]>>) {
  return computed<CommandLoadIssueView[]>(() =>
    loadIssues.value.map((issue) => ({
      code: issue.code,
      stage: issue.stage,
      sourceId: issue.sourceId,
      reason: issue.reason,
      commandId: issue.commandId,
      message: formatIssue(issue)
    }))
  );
}
