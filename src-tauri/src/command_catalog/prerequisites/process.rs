use std::env;
use std::process::Command;
use std::time::Duration;

use super::types::ProbeBinaryStatus;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;
const PROBE_PROCESS_TIMEOUT_MS: u64 = 1_500;

#[cfg(target_os = "windows")]
fn create_hidden_process(program: &str) -> Command {
    let mut process = Command::new(program);
    process.creation_flags(CREATE_NO_WINDOW);
    process
}

pub(super) fn command_exists(command: &str) -> ProbeBinaryStatus {
    #[cfg(target_os = "windows")]
    {
        return run_probe_process_with_timeout(create_hidden_process("where").arg(command));
    }

    #[cfg(not(target_os = "windows"))]
    {
        return run_probe_process_with_timeout(Command::new("which").arg(command));
    }
}

fn run_probe_process_with_timeout(command: &mut Command) -> ProbeBinaryStatus {
    let Ok(mut child) = command.spawn() else {
        return ProbeBinaryStatus::Missing;
    };
    let timeout = Duration::from_millis(PROBE_PROCESS_TIMEOUT_MS);
    let start = std::time::Instant::now();

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                return if status.success() {
                    ProbeBinaryStatus::Present
                } else {
                    ProbeBinaryStatus::Missing
                };
            }
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return ProbeBinaryStatus::TimedOut;
                }
                std::thread::sleep(Duration::from_millis(20));
            }
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return ProbeBinaryStatus::TimedOut;
            }
        }
    }
}

pub(super) fn read_env_value(key: &str) -> Option<String> {
    env::var_os(key).and_then(|value| {
        let normalized = value.to_string_lossy().trim().to_string();
        if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        }
    })
}
