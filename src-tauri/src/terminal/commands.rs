#[cfg(target_os = "windows")]
use std::path::Path;

#[cfg(desktop)]
use crate::app_state::AppState;
#[cfg(target_os = "windows")]
use crate::terminal::windows_routing;

use super::TerminalExecutionError;
use super::TerminalExecutionStep;
use super::TerminalOption;
use super::cache::{discover_available_terminals, refresh_available_terminals_impl};
#[cfg(target_os = "windows")]
use super::cache::cached_terminal_option_requires_refresh;
#[cfg(target_os = "windows")]
use super::discovery::{command_exists, resolve_windows_terminal_program_from_options};
#[cfg(not(target_os = "windows"))]
use super::execution::build_posix_host_command;
#[cfg(target_os = "windows")]
use super::execution::build_windows_host_command;
#[cfg(all(unix, not(target_os = "macos")))]
use super::launch_posix::run_command_linux;
#[cfg(target_os = "macos")]
use super::launch_posix::run_command_macos;
use super::launch_posix::terminal_launch_failed;
#[cfg(target_os = "windows")]
use super::windows_launch::run_command_windows;

#[cfg(target_os = "windows")]
fn resolve_windows_terminal_program(
    app: &tauri::AppHandle,
    state: &AppState,
    terminal_id: &str,
) -> Result<windows_routing::ResolvedTerminalProgram, TerminalExecutionError> {
    let options = discover_available_terminals(app, state);
    let cached_option = options
        .iter()
        .find(|option| option.id == terminal_id)
        .ok_or_else(|| {
            TerminalExecutionError::new(
                "invalid-request",
                format!("Unknown terminal id: {}", terminal_id),
            )
        })?;

    if cached_terminal_option_requires_refresh(
        cached_option,
        |path| Path::new(path).exists(),
        command_exists,
    ) {
        let refreshed_options = refresh_available_terminals_impl(app, state);
        return resolve_windows_terminal_program_from_options(
            terminal_id,
            refreshed_options.as_slice(),
        );
    }

    resolve_windows_terminal_program_from_options(terminal_id, options.as_slice())
}

#[cfg(target_os = "windows")]
fn parse_terminal_reuse_policy(
    value: Option<&str>,
) -> windows_routing::TerminalReusePolicy {
    // 当前产品边界只在 Windows 路由层消费复用策略；前端即使跨平台透传，这里也只做 Windows 解释。
    match value {
        Some("normal-only") => windows_routing::TerminalReusePolicy::NormalOnly,
        Some("normal-and-elevated") => {
            windows_routing::TerminalReusePolicy::NormalAndElevated
        }
        _ => windows_routing::TerminalReusePolicy::Never,
    }
}

#[tauri::command]
pub(crate) fn get_available_terminals(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<TerminalOption>, String> {
    Ok(discover_available_terminals(&app, &state))
}

#[tauri::command]
pub(crate) fn refresh_available_terminals(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<TerminalOption>, String> {
    Ok(refresh_available_terminals_impl(&app, &state))
}

#[tauri::command]
pub(crate) fn run_command_in_terminal(
    app: tauri::AppHandle,
    terminal_id: String,
    steps: Vec<TerminalExecutionStep>,
    requires_elevation: Option<bool>,
    always_elevated: Option<bool>,
    terminal_reuse_policy: Option<String>,
) -> Result<(), TerminalExecutionError> {
    #[cfg(target_os = "windows")]
    {
        let command = build_windows_host_command(terminal_id.as_str(), steps.as_slice())?;
        let state = app.state::<AppState>();
        let reusable_session_state = state
            .windows_reusable_session_state
            .lock()
            .map_err(|_| {
                TerminalExecutionError::new(
                    "state-unavailable",
                    "terminal session state lock failed",
                )
            })?
            .clone();
        let terminal_program = resolve_windows_terminal_program(&app, &state, terminal_id.as_str())?;
        let terminal_reuse_policy =
            parse_terminal_reuse_policy(terminal_reuse_policy.as_deref());
        let result = run_command_windows(
            reusable_session_state,
            terminal_program,
            command.as_str(),
            requires_elevation.unwrap_or(false),
            always_elevated.unwrap_or(false),
            terminal_reuse_policy,
        );
        if let Ok(decision) = &result {
            if windows_routing::should_track_windows_reusable_session(decision) {
                let mut reusable_session_state = state
                    .windows_reusable_session_state
                    .lock()
                    .map_err(|_| {
                        TerminalExecutionError::new(
                            "state-unavailable",
                            "terminal session state lock failed",
                        )
                    })?;
                let update_result: Result<(), TerminalExecutionError> = Ok(());
                windows_routing::update_windows_reusable_session_state(
                    &mut reusable_session_state,
                    decision.target_session_kind,
                    decision.terminal_program_id.as_str(),
                    &update_result,
                );
            }
            return Ok(());
        }
        return result.map(|_| ());
    }

    #[cfg(not(target_os = "windows"))]
    // 当前阶段非 Windows 显式忽略 terminal_reuse_policy；这是已确认的产品边界，不是遗漏实现。
    let _ = (
        app,
        requires_elevation,
        always_elevated,
        terminal_reuse_policy,
    );

    #[cfg(not(target_os = "windows"))]
    let command = build_posix_host_command(steps.as_slice())?;

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
