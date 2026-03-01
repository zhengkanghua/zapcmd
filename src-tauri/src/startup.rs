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
use crate::windowing::toggle_main_window;
#[cfg(desktop)]
use crate::windowing::open_or_focus_settings_window;

pub(crate) fn initialize_state<R: Runtime>(app: &mut App<R>) {
    #[cfg(desktop)]
    app.manage(AppState {
        launcher_hotkey: Mutex::new(DEFAULT_LAUNCHER_HOTKEY.to_string()),
        move_save_inflight: AtomicBool::new(false),
        move_save_token: AtomicU64::new(0),
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
pub(crate) fn setup_tray<R: Runtime>(app: &mut App<R>) -> tauri::Result<()> {
    let tray_menu = MenuBuilder::new(app)
        .text("toggle_window", "Show/Hide")
        .text("open_settings", "Settings")
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
