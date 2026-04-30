#[cfg(not(target_os = "windows"))]
use std::process::Child;
use std::process::Command as ProcessCommand;
#[cfg(not(target_os = "windows"))]
use std::sync::{mpsc, OnceLock};
#[cfg(not(target_os = "windows"))]
use std::thread;
#[cfg(all(test, not(target_os = "windows")))]
use std::sync::atomic::{AtomicUsize, Ordering};
#[cfg(not(target_os = "windows"))]
use std::time::Duration;

use super::TerminalExecutionError;

#[cfg(not(target_os = "windows"))]
static POSIX_CHILD_REAPER: OnceLock<mpsc::Sender<Child>> = OnceLock::new();
#[cfg(all(test, not(target_os = "windows")))]
static POSIX_REAPER_WORKER_START_COUNT: AtomicUsize = AtomicUsize::new(0);
#[cfg(all(test, not(target_os = "windows")))]
static POSIX_REAPER_PENDING_CHILD_COUNT: AtomicUsize = AtomicUsize::new(0);

#[cfg(all(test, not(target_os = "windows")))]
fn increment_pending_child_count_for_test() {
    POSIX_REAPER_PENDING_CHILD_COUNT.fetch_add(1, Ordering::SeqCst);
}

#[cfg(not(all(test, not(target_os = "windows"))))]
fn increment_pending_child_count_for_test() {}

#[cfg(all(test, not(target_os = "windows")))]
fn decrement_pending_child_count_for_test() {
    POSIX_REAPER_PENDING_CHILD_COUNT.fetch_sub(1, Ordering::SeqCst);
}

#[cfg(not(all(test, not(target_os = "windows"))))]
fn decrement_pending_child_count_for_test() {}

#[cfg(not(target_os = "windows"))]
fn reap_ready_children(children: &mut Vec<Child>) {
    let mut index = 0usize;
    while index < children.len() {
        match children[index].try_wait() {
            Ok(Some(_)) | Err(_) => {
                let mut child = children.swap_remove(index);
                let _ = child.wait();
                decrement_pending_child_count_for_test();
            }
            Ok(None) => {
                index += 1;
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn shared_child_reaper() -> mpsc::Sender<Child> {
    POSIX_CHILD_REAPER
        .get_or_init(|| {
            #[cfg(test)]
            POSIX_REAPER_WORKER_START_COUNT.fetch_add(1, Ordering::SeqCst);

            let (tx, rx) = mpsc::channel::<Child>();
            thread::spawn(move || {
                let mut children = Vec::<Child>::new();
                loop {
                    if children.is_empty() {
                        match rx.recv() {
                            Ok(child) => children.push(child),
                            Err(_) => return,
                        }
                    }

                    while let Ok(child) = rx.try_recv() {
                        children.push(child);
                    }

                    reap_ready_children(&mut children);

                    if let Ok(child) = rx.recv_timeout(Duration::from_millis(20)) {
                        children.push(child);
                    }
                }
            });
            tx
        })
        .clone()
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
    increment_pending_child_count_for_test();
    if let Err(error) = shared_child_reaper().send(child) {
        let mut child = error.0;
        let _ = child.wait();
        decrement_pending_child_count_for_test();
    }
}

#[cfg(all(test, not(target_os = "windows")))]
pub(crate) fn reaper_worker_start_count_for_test() -> usize {
    POSIX_REAPER_WORKER_START_COUNT.load(Ordering::SeqCst)
}

#[cfg(all(test, not(target_os = "windows")))]
pub(crate) fn reaper_pending_child_count_for_test() -> usize {
    POSIX_REAPER_PENDING_CHILD_COUNT.load(Ordering::SeqCst)
}

#[cfg(all(test, not(target_os = "windows")))]
pub(crate) fn wait_for_reaper_pending_child_count_for_test(
    expected: usize,
    timeout: Duration,
) -> bool {
    let start = std::time::Instant::now();
    while start.elapsed() < timeout {
        if reaper_pending_child_count_for_test() == expected {
            return true;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    reaper_pending_child_count_for_test() == expected
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
