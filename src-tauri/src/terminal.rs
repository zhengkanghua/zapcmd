use std::process::Command as ProcessCommand;
#[cfg(target_os = "macos")]
use std::path::Path;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
pub(crate) const ZAPCMD_WT_WINDOW_ID: &str = "zapcmd-main-terminal";

#[derive(serde::Serialize)]
pub(crate) struct TerminalOption {
    id: String,
    label: String,
    path: String,
}

#[cfg(target_os = "windows")]
pub(crate) struct WindowsLaunchPlan {
    pub program: String,
    pub args: Vec<String>,
    pub creation_flags: u32,
}

fn sanitize_command(command: &str) -> Result<String, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Command cannot be empty.".to_string());
    }
    Ok(trimmed.to_string())
}

fn spawn_and_forget(cmd: &mut ProcessCommand) -> Result<(), String> {
    cmd.spawn().map(|_| ()).map_err(|err| err.to_string())
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

#[cfg(target_os = "windows")]
fn build_command_windows(terminal_id: &str, command: &str) -> ProcessCommand {
    match terminal_id {
        "wt" => {
            let mut process = ProcessCommand::new("wt");
            process.args(["new-tab", "cmd", "/K", command]);
            process
        }
        "cmd" => {
            let mut process = ProcessCommand::new("cmd");
            process.args(["/K", command]);
            process
        }
        "pwsh" => {
            let mut process = ProcessCommand::new("pwsh");
            process.args(["-NoExit", "-Command", command]);
            process
        }
        _ => {
            let mut process = ProcessCommand::new("powershell");
            process.args(["-NoExit", "-Command", command]);
            process
        }
    }
}

#[cfg(target_os = "windows")]
fn build_windows_launch_plan(_terminal_id: &str, _command: &str) -> WindowsLaunchPlan {
    todo!("implemented in Task 2")
}

#[cfg(target_os = "windows")]
fn run_command_windows(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = build_command_windows(terminal_id, command);

    spawn_and_forget(&mut cmd)
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
pub(crate) fn run_command_in_terminal(terminal_id: String, command: String) -> Result<(), String> {
    let command = sanitize_command(&command)?;

    #[cfg(target_os = "windows")]
    {
        return run_command_windows(terminal_id.as_str(), command.as_str());
    }

    #[cfg(target_os = "macos")]
    {
        return run_command_macos(terminal_id.as_str(), command.as_str());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return run_command_linux(terminal_id.as_str(), command.as_str());
    }

    #[allow(unreachable_code)]
    Err("Running commands is not supported on this platform.".to_string())
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
