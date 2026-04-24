#[cfg(target_os = "macos")]
use std::path::Path;
#[cfg(target_os = "windows")]
use std::path::PathBuf;
use std::process::Command as ProcessCommand;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
use crate::terminal::windows_routing;

#[cfg(target_os = "windows")]
use super::TerminalExecutionError;
use super::TerminalOption;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub(crate) fn parse_first_non_empty_line(raw: &str) -> Option<String> {
    raw.lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty())
        .map(|line| line.to_string())
}

#[cfg(target_os = "windows")]
pub(crate) fn command_exists(command: &str) -> bool {
    create_hidden_process("where")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn command_exists(command: &str) -> bool {
    ProcessCommand::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
pub(crate) fn command_path(command: &str) -> Option<String> {
    let output = create_hidden_process("where").arg(command).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8_lossy(&output.stdout);
    parse_first_non_empty_line(&raw)
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn command_path(command: &str) -> Option<String> {
    let output = ProcessCommand::new("which").arg(command).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8_lossy(&output.stdout);
    parse_first_non_empty_line(&raw)
}

#[cfg(target_os = "windows")]
fn create_hidden_process(program: &str) -> ProcessCommand {
    let mut process = ProcessCommand::new(program);
    process.creation_flags(CREATE_NO_WINDOW);
    process
}

#[cfg(target_os = "macos")]
pub(crate) fn resolve_macos_terminals(path_exists: impl Fn(&str) -> bool) -> Vec<TerminalOption> {
    let mut options = Vec::<TerminalOption>::new();
    options.push(TerminalOption {
        id: "terminal".to_string(),
        label: "Terminal".to_string(),
        path: "/System/Applications/Utilities/Terminal.app".to_string(),
    });

    let iterm_candidates = ["/Applications/iTerm.app", "/Applications/iTerm2.app"];
    if let Some(path) = iterm_candidates
        .iter()
        .copied()
        .find(|candidate| path_exists(candidate))
    {
        options.push(TerminalOption {
            id: "iterm2".to_string(),
            label: "iTerm2".to_string(),
            path: path.to_string(),
        });
    }

    options
}

#[cfg(target_os = "windows")]
pub(crate) fn resolve_windows_terminals(
    exists: impl Fn(&str) -> bool,
    path: impl Fn(&str) -> Option<String>,
) -> Vec<TerminalOption> {
    let mut options = Vec::<TerminalOption>::new();
    if exists("powershell") {
        options.push(TerminalOption {
            id: "powershell".to_string(),
            label: "PowerShell".to_string(),
            path: path("powershell").unwrap_or_else(|| "powershell.exe".to_string()),
        });
    }
    if exists("pwsh") {
        options.push(TerminalOption {
            id: "pwsh".to_string(),
            label: "PowerShell 7".to_string(),
            path: path("pwsh").unwrap_or_else(|| "pwsh.exe".to_string()),
        });
    }
    if exists("wt") {
        options.push(TerminalOption {
            id: "wt".to_string(),
            label: "Windows Terminal".to_string(),
            path: path("wt").unwrap_or_else(|| "wt.exe".to_string()),
        });
    }
    if exists("cmd") {
        options.push(TerminalOption {
            id: "cmd".to_string(),
            label: "命令提示符 (CMD)".to_string(),
            path: path("cmd").unwrap_or_else(|| "cmd.exe".to_string()),
        });
    }
    if options.is_empty() {
        options.push(TerminalOption {
            id: "powershell".to_string(),
            label: "PowerShell".to_string(),
            path: "powershell.exe".to_string(),
        });
    }
    options
}

#[cfg(target_os = "windows")]
fn find_terminal_option<'a>(
    terminal_id: &str,
    options: &'a [TerminalOption],
) -> Result<&'a TerminalOption, TerminalExecutionError> {
    options
        .iter()
        .find(|option| option.id == terminal_id)
        .ok_or_else(|| {
            TerminalExecutionError::new(
                "invalid-request",
                format!("Unknown terminal id: {}", terminal_id),
            )
        })
}

#[cfg(target_os = "windows")]
pub(crate) fn resolve_windows_terminal_program_from_options(
    terminal_id: &str,
    options: &[TerminalOption],
) -> Result<windows_routing::ResolvedTerminalProgram, TerminalExecutionError> {
    let option = find_terminal_option(terminal_id, options)?;

    Ok(windows_routing::ResolvedTerminalProgram {
        id: option.id.clone(),
        executable_path: PathBuf::from(option.path.as_str()),
        supports_reuse: option.id == "wt",
    })
}

#[cfg(all(unix, not(target_os = "macos")))]
pub(crate) fn resolve_linux_terminals(
    exists: impl Fn(&str) -> bool,
    path: impl Fn(&str) -> Option<String>,
) -> Vec<TerminalOption> {
    let mut options = Vec::<TerminalOption>::new();
    if exists("x-terminal-emulator") {
        options.push(TerminalOption {
            id: "x-terminal-emulator".to_string(),
            label: "System Terminal".to_string(),
            path: path("x-terminal-emulator").unwrap_or_else(|| "x-terminal-emulator".to_string()),
        });
    }
    if exists("gnome-terminal") {
        options.push(TerminalOption {
            id: "gnome-terminal".to_string(),
            label: "GNOME Terminal".to_string(),
            path: path("gnome-terminal").unwrap_or_else(|| "gnome-terminal".to_string()),
        });
    }
    if exists("konsole") {
        options.push(TerminalOption {
            id: "konsole".to_string(),
            label: "Konsole".to_string(),
            path: path("konsole").unwrap_or_else(|| "konsole".to_string()),
        });
    }
    if exists("alacritty") {
        options.push(TerminalOption {
            id: "alacritty".to_string(),
            label: "Alacritty".to_string(),
            path: path("alacritty").unwrap_or_else(|| "alacritty".to_string()),
        });
    }
    if options.is_empty() {
        options.push(TerminalOption {
            id: "x-terminal-emulator".to_string(),
            label: "System Terminal".to_string(),
            path: "x-terminal-emulator".to_string(),
        });
    }
    options
}

#[cfg(target_os = "windows")]
pub(crate) fn detect_available_terminals() -> Vec<TerminalOption> {
    resolve_windows_terminals(command_exists, command_path)
}

#[cfg(target_os = "macos")]
pub(crate) fn detect_available_terminals() -> Vec<TerminalOption> {
    resolve_macos_terminals(|path| Path::new(path).exists())
}

#[cfg(all(unix, not(target_os = "macos")))]
pub(crate) fn detect_available_terminals() -> Vec<TerminalOption> {
    resolve_linux_terminals(command_exists, command_path)
}

#[cfg(not(any(target_os = "windows", target_os = "macos", unix)))]
pub(crate) fn detect_available_terminals() -> Vec<TerminalOption> {
    vec![TerminalOption {
        id: "default".to_string(),
        label: "System Terminal".to_string(),
        path: "system-terminal".to_string(),
    }]
}
