use std::ffi::OsStr;
use std::iter::once;
use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;

use windows_sys::Win32::Foundation::GetLastError;
use windows_sys::Win32::UI::Shell::ShellExecuteW;

use super::windows_routing::{
    decide_windows_route,
    WindowsLaunchPlan,
    WindowsRoutingDecision,
    WindowsRoutingInput,
    WindowsSessionKind,
};
use super::{spawn_and_forget, terminal_launch_failed, ProcessCommand, TerminalExecutionError};

/// 把纯数据启动计划转换成可执行进程，确保传统控制台仍沿用既有创建标志。
fn build_process_from_windows_launch_plan(plan: &WindowsLaunchPlan) -> ProcessCommand {
    let mut process = ProcessCommand::new(plan.program.as_str());
    process.args(plan.args.iter().map(|arg| arg.as_str()));
    if plan.creation_flags != 0 {
        process.creation_flags(plan.creation_flags);
    }
    process
}

pub(crate) fn to_wide(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(once(0)).collect()
}

fn quote_windows_argument(value: &str) -> String {
    if value.is_empty() {
        return "\"\"".to_string();
    }
    let needs_quotes = value
        .chars()
        .any(|character| character == ' ' || character == '\t' || character == '"');
    if !needs_quotes {
        return value.to_string();
    }

    let mut quoted = String::with_capacity(value.len() + 2);
    let mut pending_backslashes = 0usize;
    quoted.push('"');

    // `ShellExecuteW` 接收的是整段参数字符串，这里必须遵循 Windows 的 argv 规则：
    // 只有出现在引号前或结尾处的反斜杠需要翻倍，否则会把路径内容本身改写掉。
    for character in value.chars() {
        match character {
            '\\' => {
                pending_backslashes += 1;
            }
            '"' => {
                quoted.push_str(&"\\".repeat(pending_backslashes * 2 + 1));
                quoted.push('"');
                pending_backslashes = 0;
            }
            _ => {
                quoted.push_str(&"\\".repeat(pending_backslashes));
                quoted.push(character);
                pending_backslashes = 0;
            }
        }
    }

    quoted.push_str(&"\\".repeat(pending_backslashes * 2));
    quoted.push('"');
    quoted
}

pub(crate) fn join_windows_arguments(args: &[String]) -> String {
    args.iter()
        .map(|arg| quote_windows_argument(arg))
        .collect::<Vec<_>>()
        .join(" ")
}

pub(crate) fn map_windows_launch_error(code: u32) -> TerminalExecutionError {
    match code {
        1223 => TerminalExecutionError::new(
            "elevation-cancelled",
            "user cancelled elevation",
        ),
        _ => TerminalExecutionError::new(
            "elevation-launch-failed",
            format!("windows elevation launch failed: {}", code),
        ),
    }
}

pub(crate) fn should_update_last_session_kind(
    result: &Result<(), TerminalExecutionError>,
) -> bool {
    result.is_ok()
}

fn spawn_windows_launch_plan(plan: &WindowsLaunchPlan) -> Result<(), TerminalExecutionError> {
    let mut command = build_process_from_windows_launch_plan(plan);
    spawn_and_forget(&mut command).map_err(terminal_launch_failed)
}

fn spawn_windows_launch_plan_elevated(
    plan: &WindowsLaunchPlan,
) -> Result<(), TerminalExecutionError> {
    let verb = to_wide("runas");
    let file = to_wide(plan.program.as_str());
    let parameters = to_wide(join_windows_arguments(plan.args.as_slice()).as_str());
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            verb.as_ptr(),
            file.as_ptr(),
            parameters.as_ptr(),
            std::ptr::null(),
            1,
        )
    };
    if (result as usize) <= 32 {
        return Err(map_windows_launch_error(unsafe { GetLastError() }));
    }
    Ok(())
}

fn dispatch_windows_routing_decision(
    decision: &WindowsRoutingDecision,
) -> Result<(), TerminalExecutionError> {
    match decision.target_session_kind {
        WindowsSessionKind::Normal => spawn_windows_launch_plan(&decision.launch_plan),
        WindowsSessionKind::Elevated => spawn_windows_launch_plan_elevated(&decision.launch_plan),
    }
}

pub(super) fn run_command_windows(
    last_session_kind: Option<WindowsSessionKind>,
    terminal_id: &str,
    command: &str,
    requires_elevation: bool,
    always_elevated: bool,
) -> Result<WindowsSessionKind, TerminalExecutionError> {
    let decision = decide_windows_route(WindowsRoutingInput {
        terminal_id,
        command,
        requires_elevation,
        always_elevated,
        last_session_kind,
    });
    let result = dispatch_windows_routing_decision(&decision);

    if should_update_last_session_kind(&result) {
        return Ok(decision.target_session_kind);
    }
    result.map(|_| decision.target_session_kind)
}
