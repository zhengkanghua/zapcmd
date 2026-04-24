#[cfg(test)]
pub(crate) use std::process::Command as ProcessCommand;

pub(crate) mod discovery_cache;
pub(crate) mod execution;
mod execution_common;
#[cfg(not(target_os = "windows"))]
mod execution_posix;
#[cfg(target_os = "windows")]
mod execution_windows;
pub(crate) mod discovery;
pub(crate) mod cache;
pub(crate) mod launch_posix;
pub(crate) mod commands;
#[cfg(target_os = "windows")]
pub(crate) mod windows_routing;
#[cfg(target_os = "windows")]
pub(crate) mod windows_launch;

pub(crate) use self::cache::{
    clear_terminal_discovery_cache,
    mark_terminal_discovery_exit_requested,
    refresh_available_terminals_impl,
};
pub(crate) use self::commands::{
    get_available_terminals,
    get_runtime_platform,
    refresh_available_terminals,
    run_command_in_terminal,
};
#[cfg(all(test, not(target_os = "windows")))]
pub(crate) use self::launch_posix::spawn_with_reaper;
#[cfg(test)]
pub(crate) use self::launch_posix::spawn_and_forget;
#[cfg(all(test, target_os = "windows"))]
pub(crate) use self::windows_launch::{
    join_windows_arguments,
    map_windows_launch_error,
    resolve_windows_launch_mode,
    to_wide,
    WindowsLaunchMode,
};
#[cfg(target_os = "windows")]
pub(crate) use self::discovery::resolve_windows_terminal_program_from_options;

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
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

#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub(crate) enum ExecutionSpec {
    Exec {
        program: String,
        #[serde(default)]
        args: Vec<String>,
        #[serde(rename = "stdinArgKey")]
        stdin_arg_key: Option<String>,
        stdin: Option<String>,
    },
    Script {
        runner: String,
        command: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TerminalExecutionStep {
    pub summary: String,
    pub execution: ExecutionSpec,
}

#[cfg(test)]
mod tests_exec;

#[cfg(test)]
mod tests_discovery;

#[cfg(test)]
mod tests_cache;
