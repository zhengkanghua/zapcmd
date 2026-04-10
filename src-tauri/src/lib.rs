mod animation;
mod app_state;
mod autostart;
mod bounds;
mod command_catalog;
mod hotkeys;
mod startup;
mod terminal;
mod windowing;

use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

use bounds::handle_main_window_event;
use command_catalog::{
    get_user_commands_dir,
    probe_command_prerequisites,
    read_user_command_files,
};
use hotkeys::{get_launcher_hotkey, update_launcher_hotkey};
use terminal::{
    get_available_terminals, get_runtime_platform, mark_terminal_discovery_exit_requested,
    refresh_available_terminals,
    run_command_in_terminal,
};
use windowing::{
    hide_main_window,
    open_settings_window,
    ping,
    set_main_window_size,
    show_settings_window_when_ready,
};
use animation::{animate_main_window_size, resize_main_window_for_reveal, AnimationController};
use autostart::{get_autostart_enabled, set_autostart_enabled};

pub fn run() {
    let context = tauri::generate_context!();
    let app = tauri::Builder::default()
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
                startup::preheat_available_terminals_best_effort(app);
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
            resize_main_window_for_reveal,
            get_launcher_hotkey,
            update_launcher_hotkey,
            open_settings_window,
            show_settings_window_when_ready,
            hide_main_window,
            get_available_terminals,
            refresh_available_terminals,
            get_runtime_platform,
            run_command_in_terminal,
            get_user_commands_dir,
            read_user_command_files,
            probe_command_prerequisites,
            get_autostart_enabled,
            set_autostart_enabled
        ])
        .build(context)
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(desktop)]
        if matches!(event, RunEvent::Exit) {
            // 正常退出时删除磁盘缓存（best-effort）。
            if let Some(state) = app_handle.try_state::<crate::app_state::AppState>() {
                mark_terminal_discovery_exit_requested(&state);
                crate::terminal::clear_terminal_discovery_cache(app_handle, &state);
            }
        }
    });
}
