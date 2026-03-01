use tauri::WebviewWindow;
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub(crate) fn get_autostart_enabled(window: WebviewWindow) -> Result<bool, String> {
    window
        .autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn set_autostart_enabled(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    let manager = window.autolaunch();
    if enabled {
        manager.enable().map_err(|error| error.to_string())
    } else {
        manager.disable().map_err(|error| error.to_string())
    }
}
