#[cfg(desktop)]
use std::str::FromStr;

use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

#[cfg(desktop)]
use crate::app_state::AppState;

#[cfg(desktop)]
fn parse_shortcut(value: &str) -> Result<Shortcut, String> {
    Shortcut::from_str(value).map_err(|err| format!("Invalid hotkey '{}': {}", value, err))
}

#[cfg(desktop)]
pub(crate) fn register_launcher_hotkey<R: Runtime>(
    app: &AppHandle<R>,
    hotkey: &str,
) -> Result<(), String> {
    let shortcut = parse_shortcut(hotkey)?;
    app.global_shortcut()
        .register(shortcut)
        .map_err(|err| format!("Failed to register '{}': {}", hotkey, err))
}

#[cfg(desktop)]
pub(crate) fn unregister_launcher_hotkey<R: Runtime>(
    app: &AppHandle<R>,
    hotkey: &str,
) -> Result<(), String> {
    let shortcut = parse_shortcut(hotkey)?;
    app.global_shortcut()
        .unregister(shortcut)
        .map_err(|err| format!("Failed to unregister '{}': {}", hotkey, err))
}

#[tauri::command]
pub(crate) fn get_launcher_hotkey(window: WebviewWindow) -> Result<String, String> {
    #[cfg(desktop)]
    {
        let app = window.app_handle();
        let state = app.state::<AppState>();
        let value = state
            .launcher_hotkey
            .lock()
            .map_err(|_| "launcher hotkey state lock failed".to_string())?
            .clone();
        return Ok(value);
    }
    #[allow(unreachable_code)]
    Ok("Alt+V".to_string())
}

#[tauri::command]
pub(crate) fn update_launcher_hotkey(window: WebviewWindow, hotkey: String) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let hotkey = hotkey.trim().to_string();
        if hotkey.is_empty() {
            return Err("Hotkey cannot be empty.".to_string());
        }

        let app = window.app_handle();
        let state = app.state::<AppState>();
        let current = state
            .launcher_hotkey
            .lock()
            .map_err(|_| "launcher hotkey state lock failed".to_string())?
            .clone();

        if hotkey.eq_ignore_ascii_case(&current) {
            return Ok(());
        }

        unregister_launcher_hotkey(&app, &current)?;
        if let Err(register_err) = register_launcher_hotkey(&app, &hotkey) {
            if let Err(rollback_err) = register_launcher_hotkey(&app, &current) {
                return Err(format!("{}; rollback failed: {}", register_err, rollback_err));
            }
            return Err(register_err);
        }

        match state.launcher_hotkey.lock() {
            Ok(mut guard) => {
                *guard = hotkey;
            }
            Err(_) => {
                let mut errors = vec!["launcher hotkey state lock failed".to_string()];
                if let Err(unregister_err) = unregister_launcher_hotkey(&app, &hotkey) {
                    errors.push(unregister_err);
                }
                if let Err(rollback_err) = register_launcher_hotkey(&app, &current) {
                    errors.push(format!("rollback failed: {}", rollback_err));
                }
                return Err(errors.join("; "));
            }
        }
        return Ok(());
    }
    #[allow(unreachable_code)]
    Ok(())
}
