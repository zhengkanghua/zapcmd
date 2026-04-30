#[cfg(target_os = "windows")]
use std::path::Path;

#[cfg(desktop)]
use crate::app_state::AppState;
#[cfg(target_os = "windows")]
use crate::terminal::windows_routing;
#[cfg(target_os = "windows")]
use tauri::Manager;

use super::TerminalExecutionError;
use super::TerminalExecutionStep;
use super::TerminalOption;
use super::cache::{discover_available_terminals, refresh_available_terminals_impl};
use super::execution_common::validate_execution_safety_confirmation;
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
#[cfg(not(target_os = "windows"))]
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
    safety_confirmed: Option<bool>,
) -> Result<(), TerminalExecutionError> {
    validate_execution_safety_confirmation(
        steps.as_slice(),
        requires_elevation.unwrap_or(false),
        always_elevated.unwrap_or(false),
        safety_confirmed.unwrap_or(false),
    )?;

    #[cfg(target_os = "windows")]
    {
        let command = build_windows_host_command(terminal_id.as_str(), steps.as_slice())?;
        let state = app.state::<AppState>();
        let terminal_program = resolve_windows_terminal_program(&app, &state, terminal_id.as_str())?;
        return run_command_windows(
            terminal_program,
            command.as_str(),
            requires_elevation.unwrap_or(false),
            always_elevated.unwrap_or(false),
        ).map(|_| ());
    }

    #[cfg(not(target_os = "windows"))]
    let _ = (app, requires_elevation, always_elevated);

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
