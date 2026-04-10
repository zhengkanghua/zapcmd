use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use super::TerminalOption;

pub(crate) const TERMINAL_DISCOVERY_CACHE_FILE_NAME: &str = "terminal-discovery-cache.json";
pub(crate) const TERMINAL_DISCOVERY_CACHE_TTL_MS: u64 =
    60 * 60 * 1000;

pub(crate) fn should_persist_terminal_discovery_snapshot(exit_requested: bool) -> bool {
    !exit_requested
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub(crate) struct TerminalDiscoverySnapshot {
    pub checked_at_ms: u64,
    pub options: Vec<TerminalOption>,
}

pub(crate) fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn is_snapshot_fresh(snapshot: &TerminalDiscoverySnapshot, now_ms: u64) -> bool {
    now_ms.saturating_sub(snapshot.checked_at_ms) <= TERMINAL_DISCOVERY_CACHE_TTL_MS
}

pub(crate) fn pick_cached_terminal_snapshot(
    memory: Option<&TerminalDiscoverySnapshot>,
    persisted: Option<&TerminalDiscoverySnapshot>,
    now_ms: u64,
) -> Option<TerminalDiscoverySnapshot> {
    if let Some(snapshot) = memory.filter(|snapshot| is_snapshot_fresh(snapshot, now_ms)) {
        return Some(snapshot.clone());
    }

    persisted
        .filter(|snapshot| is_snapshot_fresh(snapshot, now_ms))
        .cloned()
}

fn looks_like_explicit_path(value: &str) -> bool {
    let trimmed = value.trim();
    trimmed.contains('/') || trimmed.contains('\\') || Path::new(trimmed).is_absolute()
}

pub(crate) fn cached_terminal_option_requires_refresh(
    option: &TerminalOption,
    path_exists: impl Fn(&str) -> bool,
    command_exists: impl Fn(&str) -> bool,
) -> bool {
    let path = option.path.trim();
    if path.is_empty() {
        return true;
    }

    if looks_like_explicit_path(path) {
        return !path_exists(path);
    }

    !(command_exists(path) || command_exists(option.id.as_str()))
}

pub(crate) fn read_persisted_terminal_snapshot(path: &Path) -> Option<TerminalDiscoverySnapshot> {
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str::<TerminalDiscoverySnapshot>(&raw).ok()
}

pub(crate) fn write_persisted_terminal_snapshot(
    path: &Path,
    snapshot: &TerminalDiscoverySnapshot,
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create terminal cache dir: {}", error))?;
    }

    let payload = serde_json::to_string(snapshot)
        .map_err(|error| format!("Failed to serialize terminal cache: {}", error))?;
    fs::write(path, payload).map_err(|error| format!("Failed to write terminal cache: {}", error))
}

pub(crate) fn remove_persisted_terminal_snapshot(path: &Path) {
    if !path.exists() {
        return;
    }

    let _ = fs::remove_file(path);
}
