use std::time::Duration;
use std::{fs, path::PathBuf};

#[cfg(desktop)]
use std::sync::atomic::Ordering;

use tauri::{
    AppHandle, Manager, PhysicalPosition, PhysicalSize, Position, Runtime, WebviewWindow, Window,
    WindowEvent,
};

#[cfg(desktop)]
use crate::app_state::AppState;

#[derive(serde::Serialize, serde::Deserialize)]
struct MainWindowBounds {
    x: i32,
    y: i32,
    #[serde(default)]
    display_name: Option<String>,
}

#[derive(Clone, Debug)]
struct MonitorInfo {
    name: Option<String>,
    position: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
}

fn main_window_bounds_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Failed to resolve app data path: {}", err))?;
    fs::create_dir_all(&app_data).map_err(|err| format!("Failed to create app data dir: {}", err))?;
    Ok(app_data.join("main-window-bounds.json"))
}

fn load_main_window_bounds<R: Runtime>(app: &AppHandle<R>) -> Option<MainWindowBounds> {
    let path = main_window_bounds_path(app).ok()?;
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str::<MainWindowBounds>(&raw).ok()
}

fn save_main_window_bounds<R: Runtime>(
    app: &AppHandle<R>,
    window: &Window<R>,
    position: PhysicalPosition<i32>,
) -> Result<(), String> {
    let display_name = window
        .current_monitor()
        .ok()
        .flatten()
        .and_then(|monitor| monitor.name().map(|name| name.to_string()));
    let path = main_window_bounds_path(app)?;
    let payload = serde_json::to_string(&MainWindowBounds {
        x: position.x,
        y: position.y,
        display_name,
    })
    .map_err(|err| format!("Failed to serialize window bounds: {}", err))?;
    fs::write(path, payload).map_err(|err| format!("Failed to write window bounds: {}", err))
}

fn point_in_monitor(
    point: PhysicalPosition<i32>,
    monitor_pos: PhysicalPosition<i32>,
    monitor_size: PhysicalSize<u32>,
) -> bool {
    let left = monitor_pos.x;
    let top = monitor_pos.y;
    let right = left + monitor_size.width as i32;
    let bottom = top + monitor_size.height as i32;
    point.x >= left && point.x < right && point.y >= top && point.y < bottom
}

fn clamp_to_monitor(
    point: PhysicalPosition<i32>,
    window_size: PhysicalSize<u32>,
    monitor_pos: PhysicalPosition<i32>,
    monitor_size: PhysicalSize<u32>,
) -> PhysicalPosition<i32> {
    let max_x = monitor_pos.x + monitor_size.width as i32 - window_size.width as i32;
    let max_y = monitor_pos.y + monitor_size.height as i32 - window_size.height as i32;
    PhysicalPosition::new(
        point.x.clamp(monitor_pos.x, max_x.max(monitor_pos.x)),
        point.y.clamp(monitor_pos.y, max_y.max(monitor_pos.y)),
    )
}

fn center_in_monitor(
    window_size: PhysicalSize<u32>,
    monitor_pos: PhysicalPosition<i32>,
    monitor_size: PhysicalSize<u32>,
) -> PhysicalPosition<i32> {
    let x = monitor_pos.x + ((monitor_size.width as i32 - window_size.width as i32) / 2);
    let y = monitor_pos.y + ((monitor_size.height as i32 - window_size.height as i32) / 2);
    clamp_to_monitor(
        PhysicalPosition::new(x, y),
        window_size,
        monitor_pos,
        monitor_size,
    )
}

fn resolve_restored_window_position_with(
    saved: &MainWindowBounds,
    window_size: PhysicalSize<u32>,
    monitors: &[MonitorInfo],
    primary: Option<&MonitorInfo>,
) -> PhysicalPosition<i32> {
    let desired = PhysicalPosition::new(saved.x, saved.y);
    if monitors.is_empty() {
        return desired;
    }

    if let Some(display_name) = saved.display_name.as_deref() {
        if let Some(monitor) = monitors
            .iter()
            .find(|item| item.name.as_deref() == Some(display_name))
        {
            return clamp_to_monitor(desired, window_size, monitor.position, monitor.size);
        }
    }

    if let Some(monitor) = monitors
        .iter()
        .find(|item| point_in_monitor(desired, item.position, item.size))
    {
        return clamp_to_monitor(desired, window_size, monitor.position, monitor.size);
    }

    let fallback_monitor = primary.or_else(|| monitors.first());
    fallback_monitor.map_or(desired, |monitor| {
        center_in_monitor(window_size, monitor.position, monitor.size)
    })
}

fn resolve_restored_window_position<R: Runtime>(
    window: &WebviewWindow<R>,
    saved: &MainWindowBounds,
) -> Option<PhysicalPosition<i32>> {
    let window_size = window.outer_size().ok()?;
    let monitors = window.available_monitors().ok()?;
    let monitors = monitors
        .into_iter()
        .map(|monitor| MonitorInfo {
            name: monitor.name().map(|name| name.to_string()),
            position: *monitor.position(),
            size: *monitor.size(),
        })
        .collect::<Vec<_>>();
    let primary = window.primary_monitor().ok().flatten().map(|monitor| MonitorInfo {
        name: monitor.name().map(|name| name.to_string()),
        position: *monitor.position(),
        size: *monitor.size(),
    });

    Some(resolve_restored_window_position_with(
        saved,
        window_size,
        &monitors,
        primary.as_ref(),
    ))
}

pub(crate) fn restore_main_window_bounds<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        if let Some(saved) = load_main_window_bounds(app) {
            if let Some(position) = resolve_restored_window_position(&window, &saved) {
                let _ = window.set_position(Position::Physical(position));
            }
        }
    }
}

fn compute_reposition_to_cursor_monitor(
    cursor: PhysicalPosition<i32>,
    window_pos: PhysicalPosition<i32>,
    window_size: Option<PhysicalSize<u32>>,
    monitors: &[MonitorInfo],
) -> Option<PhysicalPosition<i32>> {
    if monitors.is_empty() {
        return None;
    }

    let cursor_monitor_idx = monitors
        .iter()
        .position(|m| point_in_monitor(cursor, m.position, m.size));
    let window_monitor_idx = monitors
        .iter()
        .position(|m| point_in_monitor(window_pos, m.position, m.size));

    let should_reposition = match (cursor_monitor_idx, window_monitor_idx) {
        (Some(c), Some(w)) => c != w,
        (Some(_), None) => true,
        _ => false,
    };
    if !should_reposition {
        return None;
    }

    let idx = cursor_monitor_idx?;
    let monitor = &monitors[idx];
    let window_size = window_size.unwrap_or(PhysicalSize::new(680, 124));
    Some(center_in_monitor(window_size, monitor.position, monitor.size))
}

/// If the cursor is on a different monitor than the window, reposition the window
/// to the center of the cursor's monitor. This handles the case where the window
/// was persisted on a secondary monitor that is no longer visible.
pub(crate) fn reposition_to_cursor_monitor<R: Runtime>(window: &WebviewWindow<R>) {
    let cursor = match window.cursor_position() {
        Ok(pos) => PhysicalPosition::new(pos.x as i32, pos.y as i32),
        Err(_) => return,
    };
    let window_pos = match window.outer_position() {
        Ok(pos) => pos,
        Err(_) => return,
    };
    let monitors = match window.available_monitors() {
        Ok(m) => m,
        Err(_) => return,
    };
    if monitors.is_empty() {
        return;
    }
    let monitors = monitors
        .into_iter()
        .map(|monitor| MonitorInfo {
            name: monitor.name().map(|name| name.to_string()),
            position: *monitor.position(),
            size: *monitor.size(),
        })
        .collect::<Vec<_>>();
    let window_size = window.outer_size().ok();

    if let Some(position) =
        compute_reposition_to_cursor_monitor(cursor, window_pos, window_size, &monitors)
    {
        let _ = window.set_position(Position::Physical(position));
    }
}

pub(crate) fn handle_main_window_event<R: Runtime>(window: &Window<R>, event: &WindowEvent) {
    if window.label() != "main" {
        return;
    }

    match event {
        WindowEvent::Moved(_) => {
            #[cfg(desktop)]
            {
                let app = window.app_handle();
                let state = app.state::<AppState>();
                state.move_save_token.fetch_add(1, Ordering::SeqCst);
                if state
                    .move_save_inflight
                    .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
                    .is_err()
                {
                    return;
                }

                let app_handle = app.clone();
                let window = window.clone();
                std::thread::spawn(move || {
                    let state = app_handle.state::<AppState>();
                    let mut observed = state.move_save_token.load(Ordering::SeqCst);
                    loop {
                        std::thread::sleep(Duration::from_millis(500));
                        let latest = state.move_save_token.load(Ordering::SeqCst);
                        if latest != observed {
                            observed = latest;
                            continue;
                        }
                        if let Ok(position) = window.outer_position() {
                            if let Err(error) = save_main_window_bounds(&app_handle, &window, position) {
                                eprintln!("[zapcmd] save main window bounds failed: {}", error);
                            }
                        }

                        state.move_save_inflight.store(false, Ordering::SeqCst);
                        let final_token = state.move_save_token.load(Ordering::SeqCst);
                        if final_token != latest
                            && state
                                .move_save_inflight
                                .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
                                .is_ok()
                        {
                            observed = final_token;
                            continue;
                        }
                        break;
                    }
                });
            }
        }
        WindowEvent::Focused(focused) => {
            if !focused {
                #[cfg(desktop)]
                let (app_handle, move_save_token) = {
                    let app = window.app_handle();
                    let state = app.state::<AppState>();
                    (app.clone(), state.move_save_token.load(Ordering::SeqCst))
                };
                let window = window.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(220));
                    #[cfg(desktop)]
                    {
                        let state = app_handle.state::<AppState>();
                        let latest_token = state.move_save_token.load(Ordering::SeqCst);
                        if latest_token != move_save_token {
                            return;
                        }
                    }
                    let still_unfocused = !window.is_focused().unwrap_or(true);
                    let is_visible = window.is_visible().unwrap_or(false);
                    if still_unfocused && is_visible {
                        let _ = window.hide();
                    }
                });
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests_logic;
