import { t } from "../../i18n";

export interface TerminalOption {
  id: string;
  label: string;
  path: string;
}

export function fallbackTerminalOptions(platform = resolvePlatform()): TerminalOption[] {
  const normalized = platform.toLowerCase();
  if (normalized.includes("win")) {
    return [
      { id: "powershell", label: "PowerShell", path: "powershell.exe" },
      { id: "pwsh", label: "PowerShell 7", path: "pwsh.exe" },
      { id: "wt", label: "Windows Terminal", path: "wt.exe" },
      { id: "cmd", label: `${t("settings.general.commandPrompt")} (CMD)`, path: "cmd.exe" }
    ];
  }
  if (normalized.includes("mac")) {
    return [
      { id: "terminal", label: "Terminal", path: "/System/Applications/Utilities/Terminal.app" },
      { id: "iterm2", label: "iTerm2", path: "/Applications/iTerm.app" }
    ];
  }
  return [
    { id: "x-terminal-emulator", label: "System Terminal", path: "x-terminal-emulator" },
    { id: "gnome-terminal", label: "GNOME Terminal", path: "gnome-terminal" },
    { id: "konsole", label: "Konsole", path: "konsole" },
    { id: "alacritty", label: "Alacritty", path: "alacritty" }
  ];
}

function resolvePlatform(): string {
  if (typeof navigator === "undefined") {
    return "";
  }
  return navigator.platform ?? "";
}
