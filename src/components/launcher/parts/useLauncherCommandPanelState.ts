import { computed } from "vue";
import { useI18nText } from "../../../i18n";
import type { CommandArg } from "../../../features/commands/commandTemplates";
import {
  getCommandArgs,
  resolveCommandExecution
} from "../../../features/launcher/commandRuntime";
import {
  buildSafetyInputFromTemplate,
  collectTrustedArgKeysFromExecution,
  checkSingleCommandSafety
} from "../../../features/security/commandSafety";
import { collectCommandArgValidationErrors } from "../../../features/security/commandArgValidation";
import type { LauncherCommandPanelProps } from "../types";

export function useLauncherCommandPanelState(props: LauncherCommandPanelProps) {
  const { t } = useI18nText();

  const args = computed<CommandArg[]>(() => getCommandArgs(props.command));
  const hasArgs = computed(() => args.value.length > 0);

  const resolvedCommand = computed(() =>
    resolveCommandExecution(props.command, props.pendingArgValues)
  );
  const renderedPreview = computed(() => resolvedCommand.value.renderedPreview);
  const resolvedScriptCommand = computed(() =>
    resolvedCommand.value.execution.kind === "script"
      ? resolvedCommand.value.execution.command
      : ""
  );
  const hasMultilineScriptPreview = computed(() => resolvedScriptCommand.value.includes("\n"));

  const dangerReasons = computed(() => {
    const input = buildSafetyInputFromTemplate(
      props.command,
      renderedPreview.value,
      props.pendingArgValues,
      args.value
    );
    const result = checkSingleCommandSafety(input);
    return result.confirmationReasons;
  });

  const argValidationErrors = computed(() =>
    collectCommandArgValidationErrors(args.value, props.pendingArgValues, {
      trustedArgKeys: collectTrustedArgKeysFromExecution(props.command.execution, args.value)
    })
  );
  const hasArgValidationErrors = computed(() => Object.keys(argValidationErrors.value).length > 0);

  const badge = computed(() => {
    if (props.isDangerous && hasArgs.value) {
      return t("commandPanel.badge.dangerWithParam");
    }
    if (props.isDangerous) {
      return t("commandPanel.badge.dangerConfirm");
    }
    return t("commandPanel.badge.paramInput");
  });

  const confirmLabel = computed(() => {
    if (props.mode === "execute") {
      return props.isDangerous
        ? t("commandPanel.btn.confirmExecute")
        : t("commandPanel.btn.execute");
    }
    if (props.mode === "copy") {
      return t("commandPanel.btn.copy");
    }
    return t("commandPanel.btn.addToFlow");
  });

  const isDangerBtn = computed(() => props.isDangerous);
  const dangerDescriptionId = computed(() => `${getPanelIdBase(props.command.id)}-danger-description`);

  function getArgControlId(argKey: string, index: number): string {
    return `${getArgIdBase(props.command.id, argKey, index)}-control`;
  }

  function getArgRequiredHintId(argKey: string, index: number): string {
    return `${getArgIdBase(props.command.id, argKey, index)}-required`;
  }

  function getArgErrorId(argKey: string, index: number): string {
    return `${getArgIdBase(props.command.id, argKey, index)}-error`;
  }

  function getArgDescribedBy(arg: CommandArg, index: number): string | undefined {
    const describedBy: string[] = [];
    if (arg.required !== false) {
      describedBy.push(getArgRequiredHintId(arg.key, index));
    }
    if (props.isDangerous) {
      describedBy.push(dangerDescriptionId.value);
    }
    if (argValidationErrors.value[arg.key]) {
      describedBy.push(getArgErrorId(arg.key, index));
    }
    return describedBy.length > 0 ? describedBy.join(" ") : undefined;
  }

  function getArgError(argKey: string): string | undefined {
    return argValidationErrors.value[argKey];
  }

  return {
    t,
    args,
    hasArgs,
    renderedPreview,
    resolvedScriptCommand,
    hasMultilineScriptPreview,
    dangerReasons,
    hasArgValidationErrors,
    badge,
    confirmLabel,
    isDangerBtn,
    dangerDescriptionId,
    getArgControlId,
    getArgRequiredHintId,
    getArgErrorId,
    getArgDescribedBy,
    getArgError
  };
}

function getPanelIdBase(commandId: string): string {
  return `command-panel-${commandId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function getArgIdBase(commandId: string, argKey: string, index: number): string {
  return `${getPanelIdBase(commandId)}-${argKey.replace(/[^a-zA-Z0-9_-]/g, "-")}-${index}`;
}
