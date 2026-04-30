#[cfg(not(target_os = "windows"))]
use std::process::Child;
use std::process::Command as ProcessCommand;
#[cfg(not(target_os = "windows"))]
use std::thread;

use super::TerminalExecutionError;

#[cfg(not(target_os = "windows"))]
pub(crate) fn spawn_with_reaper<F>(cmd: &mut ProcessCommand, reaper: F) -> Result<(), String>
where
    F: FnOnce(Child),
{
    let child = cmd.spawn().map_err(|err| err.to_string())?;
    reaper(child);
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn reap_spawned_child_in_background(child: Child) {
    // 每个终端子进程独立回收，避免前一个长生命周期窗口阻塞后续 child 的 wait。
    thread::spawn(move || {
        let mut child = child;
        let _ = child.wait();
    });
}

pub(crate) fn spawn_and_forget(cmd: &mut ProcessCommand) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return cmd.spawn().map(|_| ()).map_err(|err| err.to_string());
    }

    #[cfg(not(target_os = "windows"))]
    {
        return spawn_with_reaper(cmd, reap_spawned_child_in_background);
    }
}

pub(crate) fn terminal_launch_failed(message: impl Into<String>) -> TerminalExecutionError {
    TerminalExecutionError::new("terminal-launch-failed", message)
}

#[cfg(any(target_os = "macos", test))]
pub(crate) fn build_macos_osascript_args(terminal_id: &str, command: &str) -> Vec<String> {
    let script = match terminal_id {
        "iterm2" => {
            r#"on run argv
  tell application "iTerm" to create window with default profile command (item 1 of argv)
end run"#
        }
        _ => {
            r#"on run argv
  tell application "Terminal" to do script (item 1 of argv)
end run"#
        }
    };
    vec!["-e".to_string(), script.to_string(), command.to_string()]
}

#[cfg(target_os = "macos")]
pub(crate) fn build_command_macos(terminal_id: &str, command: &str) -> ProcessCommand {
    let mut process = ProcessCommand::new("osascript");
    process.args(build_macos_osascript_args(terminal_id, command));
    process
}

#[cfg(target_os = "macos")]
pub(crate) fn run_command_macos(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = build_command_macos(terminal_id, command);
    spawn_and_forget(&mut cmd)
}

#[cfg(all(unix, not(target_os = "macos")))]
pub(crate) fn build_command_linux(terminal_id: &str, command: &str) -> ProcessCommand {
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
pub(crate) fn run_command_linux(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = build_command_linux(terminal_id, command);
    spawn_and_forget(&mut cmd)
}
