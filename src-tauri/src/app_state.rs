#[cfg(desktop)]
use std::sync::atomic::{AtomicBool, AtomicU64};
#[cfg(desktop)]
use std::sync::Mutex;
#[cfg(all(desktop, target_os = "windows"))]
use crate::terminal::windows_routing::WindowsReusableSessionState;
#[cfg(desktop)]
use crate::terminal::discovery_cache::TerminalDiscoverySnapshot;
#[cfg(desktop)]
use crate::terminal::singleflight::TerminalDiscoverySingleflight;

#[cfg(desktop)]
pub(crate) const DEFAULT_LAUNCHER_HOTKEY: &str = "Alt+V";
#[cfg(desktop)]
pub(crate) const SETTINGS_WINDOW_LABEL: &str = "settings";

#[cfg(desktop)]
pub(crate) struct AppState {
    pub launcher_hotkey: Mutex<String>,
    pub move_save_inflight: AtomicBool,
    pub move_save_token: AtomicU64,
    pub terminal_discovery_exit_requested: AtomicBool,
    pub terminal_discovery_cache: Mutex<Option<TerminalDiscoverySnapshot>>,
    pub terminal_discovery_cache_io_lock: Mutex<()>,
    pub terminal_discovery_singleflight: TerminalDiscoverySingleflight,
    #[cfg(target_os = "windows")]
    pub windows_reusable_session_state: Mutex<WindowsReusableSessionState>,
}
