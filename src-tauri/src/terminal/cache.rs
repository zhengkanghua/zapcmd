use std::path::{Path, PathBuf};
#[cfg(desktop)]
use std::sync::atomic::Ordering;

#[cfg(desktop)]
use crate::app_state::AppState;
use tauri::Manager;

use super::TerminalOption;
use super::discovery::{command_exists, detect_available_terminals};
pub(crate) use super::discovery_cache::TERMINAL_DISCOVERY_CACHE_FILE_NAME;
pub(crate) use super::discovery_cache::TerminalDiscoverySnapshot;
pub(crate) use super::discovery_cache::cached_terminal_option_requires_refresh;
use super::discovery_cache::{
    now_ms,
    pick_cached_terminal_snapshot,
    read_persisted_terminal_snapshot,
    remove_persisted_terminal_snapshot,
    should_persist_terminal_discovery_snapshot,
    write_persisted_terminal_snapshot,
};

fn resolve_terminal_cache_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data dir: {}", error))?;
    Ok(app_data.join(TERMINAL_DISCOVERY_CACHE_FILE_NAME))
}

fn read_memory_terminal_snapshot(
    state: &AppState,
) -> Result<Option<TerminalDiscoverySnapshot>, String> {
    state
        .terminal_discovery_cache
        .lock()
        .map(|snapshot| snapshot.clone())
        .map_err(|_| "terminal discovery cache lock failed".to_string())
}

fn write_memory_terminal_snapshot(
    state: &AppState,
    snapshot: Option<TerminalDiscoverySnapshot>,
) -> Result<(), String> {
    let mut guard = state
        .terminal_discovery_cache
        .lock()
        .map_err(|_| "terminal discovery cache lock failed".to_string())?;
    *guard = snapshot;
    Ok(())
}

pub(crate) fn clear_terminal_discovery_cache(app: &tauri::AppHandle, state: &AppState) {
    let _io_guard = match state.terminal_discovery_cache_io_lock.lock() {
        Ok(guard) => guard,
        Err(_) => {
            eprintln!("[zapcmd] failed to lock terminal cache io guard while clearing");
            return;
        }
    };

    if let Err(error) = write_memory_terminal_snapshot(state, None) {
        eprintln!("[zapcmd] failed to clear terminal memory cache: {}", error);
    }

    match resolve_terminal_cache_path(app) {
        Ok(path) => remove_persisted_terminal_snapshot(path.as_path()),
        Err(error) => {
            eprintln!("[zapcmd] failed to resolve terminal cache path while clearing: {}", error);
        }
    }
}

pub(crate) fn mark_terminal_discovery_exit_requested(state: &AppState) {
    state
        .terminal_discovery_exit_requested
        .store(true, Ordering::Relaxed);
}

fn persist_terminal_discovery_snapshot(
    app: &tauri::AppHandle,
    state: &AppState,
    options: &[TerminalOption],
) {
    let _io_guard = match state.terminal_discovery_cache_io_lock.lock() {
        Ok(guard) => guard,
        Err(_) => {
            eprintln!("[zapcmd] failed to lock terminal cache io guard while persisting");
            return;
        }
    };

    // 正常退出后不再允许后台刷新线程回写缓存，避免把刚清掉的磁盘快照重新写回来。
    if !should_persist_terminal_discovery_snapshot(
        state
            .terminal_discovery_exit_requested
            .load(Ordering::Relaxed),
    ) {
        return;
    }

    let snapshot = TerminalDiscoverySnapshot {
        checked_at_ms: now_ms(),
        options: options.to_vec(),
    };

    if let Err(error) = write_memory_terminal_snapshot(state, Some(snapshot.clone())) {
        eprintln!("[zapcmd] failed to write terminal memory cache: {}", error);
    }

    match resolve_terminal_cache_path(app) {
        Ok(path) => {
            if let Err(error) = write_persisted_terminal_snapshot(path.as_path(), &snapshot) {
                eprintln!("[zapcmd] failed to write terminal cache file: {}", error);
            }
        }
        Err(error) => {
            eprintln!("[zapcmd] failed to resolve terminal cache path: {}", error);
        }
    }
}

fn load_cached_terminal_snapshot(
    app: &tauri::AppHandle,
    state: &AppState,
) -> Option<TerminalDiscoverySnapshot> {
    let now = now_ms();
    let memory = read_memory_terminal_snapshot(state).ok().flatten();
    let cache_path = resolve_terminal_cache_path(app).ok();
    let persisted = cache_path
        .as_ref()
        .and_then(|path| read_persisted_terminal_snapshot(path.as_path()));

    let selected = pick_cached_terminal_snapshot(memory.as_ref(), persisted.as_ref(), now);
    if let Some(snapshot) = selected.clone() {
        let _ = write_memory_terminal_snapshot(state, Some(snapshot.clone()));
        return Some(snapshot);
    }

    if memory.is_some() {
        let _ = write_memory_terminal_snapshot(state, None);
    }

    if cache_path.is_some() && persisted.is_some() {
        remove_persisted_terminal_snapshot(cache_path.as_ref()?.as_path());
    }

    None
}

fn cached_terminal_snapshot_requires_refresh(options: &[TerminalOption]) -> bool {
    options.iter().any(|option| {
        cached_terminal_option_requires_refresh(
            option,
            |path| Path::new(path).exists(),
            command_exists,
        )
    })
}

pub(crate) fn discover_available_terminals(
    app: &tauri::AppHandle,
    state: &AppState,
) -> Vec<TerminalOption> {
    if let Some(snapshot) = load_cached_terminal_snapshot(app, state) {
        if !cached_terminal_snapshot_requires_refresh(snapshot.options.as_slice()) {
            return snapshot.options;
        }

        clear_terminal_discovery_cache(app, state);
    }

    let options = detect_available_terminals();
    persist_terminal_discovery_snapshot(app, state, options.as_slice());
    options
}

/// 强制走一次完整探测，清理缓存后重新发现终端并持久化结果。
pub(crate) fn refresh_available_terminals_impl(
    app: &tauri::AppHandle,
    state: &AppState,
) -> Vec<TerminalOption> {
    clear_terminal_discovery_cache(app, state);
    let options = detect_available_terminals();
    persist_terminal_discovery_snapshot(app, state, options.as_slice());
    options
}
