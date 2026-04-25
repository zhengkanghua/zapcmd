use std::time::Duration;

#[cfg(desktop)]
use std::sync::atomic::{AtomicBool, AtomicU64};
#[cfg(desktop)]
use std::sync::Mutex;

#[cfg(desktop)]
use tauri::menu::MenuBuilder;
use tauri::{App, Manager, Runtime};
#[cfg(desktop)]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
#[cfg(desktop)]
use tauri_plugin_global_shortcut::ShortcutState;

#[cfg(desktop)]
use crate::app_state::{AppState, DEFAULT_LAUNCHER_HOTKEY};
use crate::bounds::restore_main_window_bounds;
#[cfg(desktop)]
use crate::hotkeys::register_launcher_hotkey;
#[cfg(desktop)]
use crate::terminal::refresh_available_terminals_impl;
#[cfg(desktop)]
use crate::terminal::singleflight::TerminalDiscoverySingleflight;
use crate::windowing::toggle_main_window;
#[cfg(desktop)]
use crate::windowing::open_or_focus_settings_window;

pub(crate) fn initialize_state<R: Runtime>(app: &mut App<R>) {
    #[cfg(desktop)]
    app.manage(AppState {
        launcher_hotkey: Mutex::new(DEFAULT_LAUNCHER_HOTKEY.to_string()),
        move_save_inflight: AtomicBool::new(false),
        move_save_token: AtomicU64::new(0),
        terminal_discovery_exit_requested: AtomicBool::new(false),
        terminal_discovery_cache: Mutex::new(None),
        terminal_discovery_cache_io_lock: Mutex::new(()),
        terminal_discovery_singleflight: TerminalDiscoverySingleflight::new(),
        #[cfg(target_os = "windows")]
        windows_reusable_session_state: Mutex::new(
            crate::terminal::windows_routing::WindowsReusableSessionState::default(),
        ),
    });
}

pub(crate) fn initialize_main_window<R: Runtime>(app: &mut App<R>) {
    restore_main_window_bounds(&app.handle());

    if let Some(window) = app.get_webview_window("main") {
        let render_stabilize_window = window.clone();
        std::thread::spawn(move || {
            let _ = render_stabilize_window.set_always_on_top(true);
            std::thread::sleep(Duration::from_millis(150));
            let _ = render_stabilize_window.set_always_on_top(false);
        });

        #[cfg(target_os = "windows")]
        {
            let _ = window.set_shadow(false);
        }
    }
}

/// 启动时做一次尽力而为的终端探测预热。
/// 失败只记录日志，不阻断启动。
#[cfg(desktop)]
pub(crate) fn preheat_available_terminals_best_effort(app: &App) {
    let app_handle = app.handle().clone();
    std::thread::spawn(move || {
        let state = app_handle.state::<AppState>();
        let _ = refresh_available_terminals_impl(&app_handle, &state);
    });
}

#[cfg(desktop)]
pub(crate) fn setup_global_shortcut<R: Runtime>(app: &mut App<R>) {
    let shortcut_plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                toggle_main_window(app);
            }
        })
        .build();
    if let Err(error) = app.handle().plugin(shortcut_plugin) {
        eprintln!("[zapcmd] failed to register global shortcut plugin: {}", error);
    }
    if let Err(error) = register_launcher_hotkey(&app.handle(), DEFAULT_LAUNCHER_HOTKEY) {
        eprintln!(
            "[zapcmd] failed to register launcher hotkey ({}): {}",
            DEFAULT_LAUNCHER_HOTKEY,
            error
        );
    }
}

#[cfg(desktop)]
pub(crate) fn setup_tray(app: &mut App) -> tauri::Result<()> {
    let tray_menu = MenuBuilder::new(app)
        .text("toggle_window", "Show/Hide")
        .text("open_settings", "Settings")
        .text("rescan_terminals", "Rescan terminals")
        .separator()
        .text("quit_app", "Quit")
        .build()?;

    let mut tray_builder = TrayIconBuilder::with_id("main-tray")
        .menu(&tray_menu)
        .tooltip("ZapCmd")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle_window" => toggle_main_window(app),
            "open_settings" => {
                if let Err(error) = open_or_focus_settings_window(app) {
                    eprintln!("[zapcmd] open settings window failed: {}", error);
                }
            }
            "rescan_terminals" => {
                // best-effort: 刷新失败不阻断交互，只记日志
                let app_handle = app.clone();
                std::thread::spawn(move || {
                    let state = app_handle.state::<AppState>();
                    let _ = refresh_available_terminals_impl(&app_handle, &state);
                });
            }
            "quit_app" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }

    let _ = tray_builder.build(app)?;
    Ok(())
}
