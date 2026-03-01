#[cfg(desktop)]
use std::sync::atomic::AtomicU64;
#[cfg(desktop)]
use std::sync::Mutex;

#[cfg(desktop)]
pub(crate) const DEFAULT_LAUNCHER_HOTKEY: &str = "Alt+V";
#[cfg(desktop)]
pub(crate) const SETTINGS_WINDOW_LABEL: &str = "settings";

#[cfg(desktop)]
pub(crate) struct AppState {
    pub launcher_hotkey: Mutex<String>,
    pub move_save_token: AtomicU64,
}
