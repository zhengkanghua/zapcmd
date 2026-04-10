#[cfg(target_os = "windows")]
use tauri::Theme;
use tauri::{AppHandle, Manager, Position, Runtime, WebviewWindow};
use tauri::{LogicalSize, PhysicalPosition};

use std::sync::atomic::Ordering;

#[cfg(desktop)]
use crate::app_state::{AppState, SETTINGS_WINDOW_LABEL};
use crate::bounds::reposition_to_cursor_monitor;

#[tauri::command]
pub(crate) fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
pub(crate) fn set_main_window_size(
    window: WebviewWindow,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let width = width.max(320.0);
    let height = height.max(124.0);
    #[cfg(desktop)]
    let move_save_token = {
        let state = window.app_handle().state::<AppState>();
        state.move_save_token.load(Ordering::SeqCst)
    };
    let prev_pos: Option<PhysicalPosition<i32>> = window.outer_position().ok();
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|err| err.to_string())?;
    #[cfg(desktop)]
    {
        let state = window.app_handle().state::<AppState>();
        let latest_token = state.move_save_token.load(Ordering::SeqCst);
        if latest_token != move_save_token {
            return Ok(());
        }
    }
    if let Some(pos) = prev_pos {
        let _ = window.set_position(Position::Physical(pos));
    }
    // 同步 AnimationController.current_size 并取消待执行的动画/延迟，
    // 避免 immediate resize 后旧的收缩延迟意外触发。
    if let Some(ctrl) = window
        .app_handle()
        .try_state::<crate::animation::AnimationController>()
    {
        ctrl.sync_current_size(width, height);
    }
    Ok(())
}

pub(crate) fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        reposition_to_cursor_monitor(&window);
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub(crate) fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = window.hide();
        } else {
            show_main_window(app);
        }
    }
}

#[cfg(desktop)]
pub(crate) fn open_or_focus_settings_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return Ok(());
    }

    let builder = tauri::WebviewWindowBuilder::new(
        app,
        SETTINGS_WINDOW_LABEL,
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("ZapCmd Settings")
    .inner_size(980.0, 700.0)
    .min_inner_size(760.0, 560.0)
    .resizable(true)
    .decorations(true)
    .maximizable(true)
    .visible(false)
    .focused(false);

    #[cfg(target_os = "windows")]
    let builder = builder.theme(Some(Theme::Dark));

    builder
        .build()
        .map_err(|err| format!("Failed to create settings window: {}", err))?;

    Ok(())
}

#[tauri::command]
pub(crate) fn open_settings_window(window: WebviewWindow) -> Result<(), String> {
    #[cfg(desktop)]
    {
        return open_or_focus_settings_window(&window.app_handle());
    }
    #[allow(unreachable_code)]
    Ok(())
}

#[tauri::command]
pub(crate) fn show_settings_window_when_ready(window: WebviewWindow) -> Result<(), String> {
    #[cfg(desktop)]
    {
        if window.label() != SETTINGS_WINDOW_LABEL {
            return Ok(());
        }
        window.show().map_err(|err| err.to_string())?;
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub(crate) fn hide_main_window(window: WebviewWindow) -> Result<(), String> {
    let app = window.app_handle();
    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found.".to_string())?;
    main.hide().map_err(|err| err.to_string())
}
