use std::process::Command as ProcessCommand;
#[cfg(target_os = "macos")]
use std::path::Path;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(serde::Serialize)]
pub(crate) struct TerminalOption {
    id: String,
    label: String,
    path: String,
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
    raw.lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty())
        .map(|line| line.to_string())
}

#[cfg(not(target_os = "windows"))]
fn command_path(command: &str) -> Option<String> {
    let output = ProcessCommand::new("which").arg(command).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8_lossy(&output.stdout);
    raw.lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty())
        .map(|line| line.to_string())
}

#[cfg(target_os = "windows")]
fn create_hidden_process(program: &str) -> ProcessCommand {
    let mut process = ProcessCommand::new(program);
    process.creation_flags(CREATE_NO_WINDOW);
    process
}

#[cfg(target_os = "macos")]
fn first_existing_path(candidates: &[&str]) -> Option<String> {
    candidates
        .iter()
        .find_map(|path| Path::new(path).exists().then(|| (*path).to_string()))
}

#[tauri::command]
pub(crate) fn get_available_terminals() -> Result<Vec<TerminalOption>, String> {
    #[cfg(target_os = "windows")]
    {
        let mut options = Vec::<TerminalOption>::new();
        if command_exists("powershell") {
            options.push(TerminalOption {
                id: "powershell".to_string(),
                label: "PowerShell".to_string(),
                path: command_path("powershell").unwrap_or_else(|| "powershell.exe".to_string()),
            });
        }
        if command_exists("pwsh") {
            options.push(TerminalOption {
                id: "pwsh".to_string(),
                label: "PowerShell 7".to_string(),
                path: command_path("pwsh").unwrap_or_else(|| "pwsh.exe".to_string()),
            });
        }
        if command_exists("wt") {
            options.push(TerminalOption {
                id: "wt".to_string(),
                label: "Windows Terminal".to_string(),
                path: command_path("wt").unwrap_or_else(|| "wt.exe".to_string()),
            });
        }
        if command_exists("cmd") {
            options.push(TerminalOption {
                id: "cmd".to_string(),
                label: "命令提示符 (CMD)".to_string(),
                path: command_path("cmd").unwrap_or_else(|| "cmd.exe".to_string()),
            });
        }
        if options.is_empty() {
            options.push(TerminalOption {
                id: "powershell".to_string(),
                label: "PowerShell".to_string(),
                path: "powershell.exe".to_string(),
            });
        }
        return Ok(options);
    }

    #[cfg(target_os = "macos")]
    {
        let mut options = Vec::<TerminalOption>::new();
        options.push(TerminalOption {
            id: "terminal".to_string(),
            label: "Terminal".to_string(),
            path: "/System/Applications/Utilities/Terminal.app".to_string(),
        });
        if let Some(path) =
            first_existing_path(&["/Applications/iTerm.app", "/Applications/iTerm2.app"])
        {
            options.push(TerminalOption {
                id: "iterm2".to_string(),
                label: "iTerm2".to_string(),
                path,
            });
        }
        return Ok(options);
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let mut options = Vec::<TerminalOption>::new();
        if command_exists("x-terminal-emulator") {
            options.push(TerminalOption {
                id: "x-terminal-emulator".to_string(),
                label: "System Terminal".to_string(),
                path: command_path("x-terminal-emulator")
                    .unwrap_or_else(|| "x-terminal-emulator".to_string()),
            });
        }
        if command_exists("gnome-terminal") {
            options.push(TerminalOption {
                id: "gnome-terminal".to_string(),
                label: "GNOME Terminal".to_string(),
                path: command_path("gnome-terminal")
                    .unwrap_or_else(|| "gnome-terminal".to_string()),
            });
        }
        if command_exists("konsole") {
            options.push(TerminalOption {
                id: "konsole".to_string(),
                label: "Konsole".to_string(),
                path: command_path("konsole").unwrap_or_else(|| "konsole".to_string()),
            });
        }
        if command_exists("alacritty") {
            options.push(TerminalOption {
                id: "alacritty".to_string(),
                label: "Alacritty".to_string(),
                path: command_path("alacritty").unwrap_or_else(|| "alacritty".to_string()),
            });
        }
        if options.is_empty() {
            options.push(TerminalOption {
                id: "x-terminal-emulator".to_string(),
                label: "System Terminal".to_string(),
                path: "x-terminal-emulator".to_string(),
            });
        }
        return Ok(options);
    }

    #[allow(unreachable_code)]
    Ok(vec![TerminalOption {
        id: "default".to_string(),
        label: "System Terminal".to_string(),
        path: "system-terminal".to_string(),
    }])
}

#[cfg(target_os = "windows")]
fn run_command_windows(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = match terminal_id {
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
    };

    cmd.spawn().map_err(|err| err.to_string())?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn run_command_macos(terminal_id: &str, command: &str) -> Result<(), String> {
    let escaped = command.replace('\\', "\\\\").replace('\"', "\\\"");
    match terminal_id {
        "iterm2" => {
            let script = format!(
                "tell application \"iTerm\" to create window with default profile command \"{}\"",
                escaped
            );
            ProcessCommand::new("osascript")
                .args(["-e", &script])
                .spawn()
                .map_err(|err| err.to_string())?;
        }
        _ => {
            let script = format!("tell application \"Terminal\" to do script \"{}\"", escaped);
            ProcessCommand::new("osascript")
                .args(["-e", &script])
                .spawn()
                .map_err(|err| err.to_string())?;
        }
    }
    Ok(())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn run_command_linux(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = match terminal_id {
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
    };

    cmd.spawn().map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn run_command_in_terminal(terminal_id: String, command: String) -> Result<(), String> {
    let command = command.trim();
    if command.is_empty() {
        return Err("Command cannot be empty.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        return run_command_windows(terminal_id.as_str(), command);
    }

    #[cfg(target_os = "macos")]
    {
        return run_command_macos(terminal_id.as_str(), command);
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return run_command_linux(terminal_id.as_str(), command);
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
