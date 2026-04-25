#[cfg(not(target_os = "windows"))]
use std::process::Child;
use std::process::Command as ProcessCommand;
#[cfg(not(target_os = "windows"))]
use std::sync::{OnceLock, mpsc};
#[cfg(not(target_os = "windows"))]
use std::thread;

use super::TerminalExecutionError;

#[cfg(not(target_os = "windows"))]
fn child_reaper_sender() -> &'static mpsc::Sender<Child> {
    static CHILD_REAPER_SENDER: OnceLock<mpsc::Sender<Child>> = OnceLock::new();
    CHILD_REAPER_SENDER.get_or_init(|| {
        let (sender, receiver) = mpsc::channel::<Child>();
        thread::spawn(move || {
            for mut child in receiver {
                let _ = child.wait();
            }
        });
        sender
    })
}

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
    // Unix/mac 若父进程从不 wait 已退出子进程，可能留下 zombie；这里统一交给单 worker 回收。
    if let Err(error) = child_reaper_sender().send(child) {
        let mut child = error.0;
        let _ = child.wait();
    }
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

#[cfg(target_os = "macos")]
pub(crate) fn build_command_macos(terminal_id: &str, command: &str) -> ProcessCommand {
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
