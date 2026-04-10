use super::discovery_cache::{
    cached_terminal_option_requires_refresh,
    pick_cached_terminal_snapshot,
    TerminalDiscoverySnapshot,
    TERMINAL_DISCOVERY_CACHE_TTL_MS,
};
use super::TerminalOption;

fn create_snapshot(checked_at_ms: u64, ids: &[&str]) -> TerminalDiscoverySnapshot {
    TerminalDiscoverySnapshot {
        checked_at_ms,
        options: ids
            .iter()
            .map(|id| TerminalOption {
                id: (*id).to_string(),
                label: format!("{id}-label"),
                path: format!("{id}.exe"),
            })
            .collect(),
    }
}

#[test]
fn terminal_discovery_cache_ttl_is_one_hour() {
    assert_eq!(TERMINAL_DISCOVERY_CACHE_TTL_MS, 60 * 60 * 1000);
}

#[test]
fn pick_cached_terminal_snapshot_prefers_fresh_memory_cache() {
    let memory = create_snapshot(1_000, &["powershell"]);
    let persisted = create_snapshot(900, &["wt"]);

    let picked = pick_cached_terminal_snapshot(
        Some(&memory),
        Some(&persisted),
        1_000 + TERMINAL_DISCOVERY_CACHE_TTL_MS - 1,
    );

    assert_eq!(picked, Some(memory));
}

#[test]
fn pick_cached_terminal_snapshot_uses_persisted_cache_when_memory_is_missing() {
    let persisted = create_snapshot(1_000, &["wt"]);

    let picked = pick_cached_terminal_snapshot(
        None,
        Some(&persisted),
        1_000 + TERMINAL_DISCOVERY_CACHE_TTL_MS - 1,
    );

    assert_eq!(picked, Some(persisted));
}

#[test]
fn pick_cached_terminal_snapshot_returns_none_when_cache_is_expired() {
    let persisted = create_snapshot(1_000, &["wt"]);

    let picked = pick_cached_terminal_snapshot(
        None,
        Some(&persisted),
        1_000 + TERMINAL_DISCOVERY_CACHE_TTL_MS + 1,
    );

    assert_eq!(picked, None);
}

#[test]
fn pick_cached_terminal_snapshot_expires_after_one_hour() {
    let persisted = create_snapshot(1_000, &["wt"]);

    let picked = pick_cached_terminal_snapshot(None, Some(&persisted), 1_000 + 60 * 60 * 1000 + 1);

    assert_eq!(picked, None);
}

#[test]
fn cached_terminal_option_requires_refresh_when_a_cached_absolute_path_disappears() {
    let option = TerminalOption {
        id: "pwsh".to_string(),
        label: "PowerShell 7".to_string(),
        path: "/missing/pwsh".to_string(),
    };

    let should_refresh =
        cached_terminal_option_requires_refresh(&option, |_| false, |_| true);

    assert!(should_refresh);
}

#[test]
fn cached_terminal_option_does_not_require_refresh_for_command_alias_paths() {
    let option = TerminalOption {
        id: "powershell".to_string(),
        label: "PowerShell".to_string(),
        path: "powershell.exe".to_string(),
    };

    let should_refresh =
        cached_terminal_option_requires_refresh(&option, |_| false, |command| {
            command == "powershell.exe" || command == "powershell"
        });

    assert!(!should_refresh);
}
