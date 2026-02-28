import type { CommandArg, CommandTemplate } from "../commands/commandTemplates";
import { t } from "../../i18n";

export function getCommandArgs(command: CommandTemplate): CommandArg[] {
  if (command.args && command.args.length > 0) {
    return command.args;
  }

  if (!command.needsArgs) {
    return [];
  }

  return [
    {
      key: "value",
      label: command.argLabel ?? t("command.argFallbackLabel"),
      token: command.argToken ?? "{{value}}",
      placeholder: command.argPlaceholder,
      required: true,
      defaultValue: command.argPlaceholder
    }
  ];
}

export function renderCommand(command: CommandTemplate, argValues?: Record<string, string>): string {
  const args = getCommandArgs(command);
  if (args.length === 0) {
    return command.preview;
  }

  let rendered = command.preview;
  for (const arg of args) {
    const rawValue = argValues?.[arg.key] ?? "";
    const fallback =
      arg.defaultValue ?? (arg.required === false ? "" : arg.placeholder ?? "value");
    const safeValue = rawValue.trim() || fallback;
    rendered = rendered.split(arg.token).join(safeValue);
  }

  return rendered.replace(/\s{2,}/g, " ").trim();
}

export function buildInitialArgValues(
  command: CommandTemplate,
  argValues?: Record<string, string>
): { args: CommandArg[]; values: Record<string, string> } {
  const args = getCommandArgs(command);
  const values = args.reduce<Record<string, string>>((acc, arg) => {
    const inputValue = argValues?.[arg.key];
    if (typeof inputValue === "string") {
      acc[arg.key] = inputValue;
      return acc;
    }
    acc[arg.key] = arg.defaultValue ?? "";
    return acc;
  }, {});

  return { args, values };
}
