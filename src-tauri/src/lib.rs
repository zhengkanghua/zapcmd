mod animation;
mod app_state;
mod autostart;
mod bounds;
mod command_catalog;
mod hotkeys;
mod startup;
mod terminal;
mod windowing;

use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

use bounds::handle_main_window_event;
use command_catalog::{get_user_commands_dir, read_user_command_files};
use hotkeys::{get_launcher_hotkey, update_launcher_hotkey};
use terminal::{get_available_terminals, get_runtime_platform, run_command_in_terminal};
use windowing::{hide_main_window, open_settings_window, ping, set_main_window_size};
use animation::{animate_main_window_size, AnimationController};
use autostart::{get_autostart_enabled, set_autostart_enabled};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            startup::initialize_state(app);
            app.manage(AnimationController::new());
            startup::initialize_main_window(app);

            #[cfg(desktop)]
            {
                startup::setup_global_shortcut(app);
                startup::setup_tray(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::Moved(_) | WindowEvent::Focused(_)) {
                handle_main_window_event(window, event);
            }
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            set_main_window_size,
            animate_main_window_size,
            get_launcher_hotkey,
            update_launcher_hotkey,
            open_settings_window,
            hide_main_window,
            get_available_terminals,
            get_runtime_platform,
            run_command_in_terminal,
            get_user_commands_dir,
            read_user_command_files,
            get_autostart_enabled,
            set_autostart_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
