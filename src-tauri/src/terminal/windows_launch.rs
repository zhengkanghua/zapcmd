use std::ffi::OsStr;
use std::iter::once;
use std::mem::size_of;
use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;

use windows_sys::Win32::Foundation::GetLastError;
use windows_sys::Win32::UI::Shell::{ShellExecuteExW, SHELLEXECUTEINFOW};

use super::windows_routing::{
    decide_windows_route,
    WindowsLaunchPlan,
    WindowsRoutingDecision,
    WindowsRoutingInput,
    WindowsSessionKind,
};
use super::{spawn_and_forget, terminal_launch_failed, ProcessCommand, TerminalExecutionError};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum WindowsLaunchMode {
    Direct,
    ElevatedViaRunas,
}

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

pub(crate) fn resolve_windows_launch_mode(
    decision: &WindowsRoutingDecision,
    last_session_kind: Option<WindowsSessionKind>,
    last_terminal_program: Option<&str>,
    allow_direct_wt_admin_reuse: bool,
) -> WindowsLaunchMode {
    if decision.target_session_kind == WindowsSessionKind::Normal {
        return WindowsLaunchMode::Direct;
    }

    // `wt` 的管理员窗口有稳定 window id，已有管理员窗口时应直接复用，
    // 但只有“上一次就是 `wt` 管理员会话”且本次不要求强制重新提权时，
    // 才能安全跳过 `runas`，否则会把其它终端的管理员态误判成可复用 `wt` 窗口。
    if decision.launch_plan.program == "wt"
        && last_session_kind == Some(WindowsSessionKind::Elevated)
        && last_terminal_program == Some("wt")
        && allow_direct_wt_admin_reuse
    {
        return WindowsLaunchMode::Direct;
    }

    WindowsLaunchMode::ElevatedViaRunas
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
    let joined_parameters = join_windows_arguments(plan.args.as_slice());
    let parameters = to_wide(joined_parameters.as_str());
    let mut execute_info = unsafe { std::mem::zeroed::<SHELLEXECUTEINFOW>() };
    execute_info.cbSize = size_of::<SHELLEXECUTEINFOW>() as u32;
    execute_info.lpVerb = verb.as_ptr();
    execute_info.lpFile = file.as_ptr();
    execute_info.lpParameters = parameters.as_ptr();
    execute_info.nShow = 1;

    if unsafe { ShellExecuteExW(&mut execute_info) } == 0 {
        return Err(map_windows_launch_error(unsafe { GetLastError() }));
    }
    Ok(())
}

fn dispatch_windows_routing_decision(
    decision: &WindowsRoutingDecision,
    last_session_kind: Option<WindowsSessionKind>,
    last_terminal_program: Option<&str>,
    allow_direct_wt_admin_reuse: bool,
) -> Result<(), TerminalExecutionError> {
    match resolve_windows_launch_mode(
        decision,
        last_session_kind,
        last_terminal_program,
        allow_direct_wt_admin_reuse,
    ) {
        WindowsLaunchMode::Direct => spawn_windows_launch_plan(&decision.launch_plan),
        WindowsLaunchMode::ElevatedViaRunas => {
            spawn_windows_launch_plan_elevated(&decision.launch_plan)
        }
    }
}

pub(super) fn run_command_windows(
    last_session_kind: Option<WindowsSessionKind>,
    last_terminal_program: Option<&str>,
    terminal_id: &str,
    command: &str,
    requires_elevation: bool,
    always_elevated: bool,
) -> Result<(WindowsSessionKind, String), TerminalExecutionError> {
    let decision = decide_windows_route(WindowsRoutingInput {
        terminal_id,
        command,
        requires_elevation,
        always_elevated,
        last_session_kind,
    });
    let allow_direct_wt_admin_reuse = decision.launch_plan.program == "wt"
        && decision.target_session_kind == WindowsSessionKind::Elevated
        && !requires_elevation
        && !always_elevated;
    let result = dispatch_windows_routing_decision(
        &decision,
        last_session_kind,
        last_terminal_program,
        allow_direct_wt_admin_reuse,
    );

    if should_update_last_session_kind(&result) {
        return Ok((
            decision.target_session_kind,
            decision.launch_plan.program.clone(),
        ));
    }
    result.map(|_| {
        (
            decision.target_session_kind,
            decision.launch_plan.program.clone(),
        )
    })
}
