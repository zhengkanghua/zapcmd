#[cfg(target_os = "macos")]
use std::path::Path;
use std::process::Command as ProcessCommand;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
use tauri::Manager;

#[cfg(target_os = "windows")]
use crate::app_state::AppState;
#[cfg(target_os = "windows")]
use self::windows_launch::run_command_windows;

#[cfg(target_os = "windows")]
pub(crate) mod windows_routing;
#[cfg(target_os = "windows")]
pub(crate) mod windows_launch;
#[cfg(all(test, target_os = "windows"))]
pub(crate) use self::windows_launch::{
    join_windows_arguments,
    map_windows_launch_error,
    resolve_windows_launch_mode,
    should_update_last_session_kind,
    to_wide,
    WindowsLaunchMode,
};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(serde::Serialize)]
pub(crate) struct TerminalOption {
    id: String,
    label: String,
    path: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub(crate) struct TerminalExecutionError {
    code: String,
    message: String,
}

impl TerminalExecutionError {
    fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
        }
    }
}

fn sanitize_command(command: &str) -> Result<String, TerminalExecutionError> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            "Command cannot be empty.",
        ));
    }
    Ok(trimmed.to_string())
}

fn spawn_and_forget(cmd: &mut ProcessCommand) -> Result<(), String> {
    cmd.spawn().map(|_| ()).map_err(|err| err.to_string())
}

pub(super) fn terminal_launch_failed(message: impl Into<String>) -> TerminalExecutionError {
    TerminalExecutionError::new("terminal-launch-failed", message)
}

fn parse_first_non_empty_line(raw: &str) -> Option<String> {
    raw.lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty())
        .map(|line| line.to_string())
}

#[cfg(target_os = "windows")]
fn command_exists(command: &str) -> bool {
    create_hidden_process("where")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "windows"))]
fn command_exists(command: &str) -> bool {
    ProcessCommand::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn command_path(command: &str) -> Option<String> {
    let output = create_hidden_process("where").arg(command).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8_lossy(&output.stdout);
    parse_first_non_empty_line(&raw)
}

#[cfg(not(target_os = "windows"))]
fn command_path(command: &str) -> Option<String> {
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
fn resolve_macos_terminals(path_exists: impl Fn(&str) -> bool) -> Vec<TerminalOption> {
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
fn resolve_windows_terminals(
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

#[cfg(all(unix, not(target_os = "macos")))]
fn resolve_linux_terminals(
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

#[tauri::command]
pub(crate) fn get_available_terminals() -> Result<Vec<TerminalOption>, String> {
    #[cfg(target_os = "windows")]
    {
        return Ok(resolve_windows_terminals(command_exists, command_path));
    }

    #[cfg(target_os = "macos")]
    {
        return Ok(resolve_macos_terminals(|path| Path::new(path).exists()));
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return Ok(resolve_linux_terminals(command_exists, command_path));
    }

    #[allow(unreachable_code)]
    Ok(vec![TerminalOption {
        id: "default".to_string(),
        label: "System Terminal".to_string(),
        path: "system-terminal".to_string(),
    }])
}

#[cfg(target_os = "macos")]
fn build_command_macos(terminal_id: &str, command: &str) -> ProcessCommand {
    let escaped = command.replace('\\', "\\\\").replace('\"', "\\\"");
    match terminal_id {
        "iterm2" => {
            let script = format!(
                "tell application \"iTerm\" to create window with default profile command \"{}\"",
                escaped
            );
            let mut process = ProcessCommand::new("osascript");
            process.args(["-e", &script]);
            process
        }
        _ => {
            let script = format!("tell application \"Terminal\" to do script \"{}\"", escaped);
            let mut process = ProcessCommand::new("osascript");
            process.args(["-e", &script]);
            process
        }
    }
}

#[cfg(target_os = "macos")]
fn run_command_macos(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = build_command_macos(terminal_id, command);
    spawn_and_forget(&mut cmd)
}

#[cfg(all(unix, not(target_os = "macos")))]
fn build_command_linux(terminal_id: &str, command: &str) -> ProcessCommand {
    match terminal_id {
        "gnome-terminal" => {
            let mut process = ProcessCommand::new("gnome-terminal");
            process.args(["--", "bash", "-lc", command]);
            process
        }
        "konsole" => {
            let mut process = ProcessCommand::new("konsole");
            process.args(["-e", "bash", "-lc", command]);
            process
        }
        "alacritty" => {
            let mut process = ProcessCommand::new("alacritty");
            process.args(["-e", "bash", "-lc", command]);
            process
        }
        _ => {
            let mut process = ProcessCommand::new("x-terminal-emulator");
            process.args(["-e", "bash", "-lc", command]);
            process
        }
    }
}

#[cfg(all(unix, not(target_os = "macos")))]
fn run_command_linux(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = build_command_linux(terminal_id, command);
    spawn_and_forget(&mut cmd)
}

#[tauri::command]
pub(crate) fn run_command_in_terminal(
    app: tauri::AppHandle,
    terminal_id: String,
    command: String,
    requires_elevation: Option<bool>,
    always_elevated: Option<bool>,
) -> Result<(), TerminalExecutionError> {
    let command = sanitize_command(&command)?;

    #[cfg(target_os = "windows")]
    {
        let state = app.state::<AppState>();
        let last_session_kind = *state
            .last_terminal_session_kind
            .lock()
            .map_err(|_| TerminalExecutionError::new("state-unavailable", "terminal session state lock failed"))?;
        let result = run_command_windows(
            last_session_kind,
            terminal_id.as_str(),
            command.as_str(),
            requires_elevation.unwrap_or(false),
            always_elevated.unwrap_or(false),
        );
        if let Ok(session_kind) = result {
            *state
                .last_terminal_session_kind
                .lock()
                .map_err(|_| {
                    TerminalExecutionError::new(
                        "state-unavailable",
                        "terminal session state lock failed",
                    )
                })? = Some(session_kind);
            return Ok(());
        }
        return result.map(|_| ());
    }

    #[cfg(not(target_os = "windows"))]
    let _ = (app, requires_elevation, always_elevated);

    #[cfg(target_os = "macos")]
    {
        return run_command_macos(terminal_id.as_str(), command.as_str()).map_err(terminal_launch_failed);
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return run_command_linux(terminal_id.as_str(), command.as_str()).map_err(terminal_launch_failed);
    }

    #[allow(unreachable_code)]
    Err(TerminalExecutionError::new(
        "terminal-launch-failed",
        "Running commands is not supported on this platform.",
    ))
}

#[tauri::command]
pub(crate) fn get_runtime_platform() -> String {
    #[cfg(target_os = "windows")]
    {
        return "win".to_string();
    }

    #[cfg(target_os = "macos")]
    {
        return "mac".to_string();
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return "linux".to_string();
    }

    #[allow(unreachable_code)]
    "all".to_string()
}

#[cfg(test)]
mod tests_exec;

#[cfg(test)]
mod tests_discovery;
