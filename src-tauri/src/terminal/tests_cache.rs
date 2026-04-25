use crate::terminal::discovery_cache::{
    cached_terminal_option_requires_refresh,
    pick_cached_terminal_snapshot,
    should_persist_terminal_discovery_snapshot,
    TERMINAL_DISCOVERY_CACHE_TTL_MS,
};
use crate::terminal::cache::TerminalDiscoverySnapshot;
use crate::terminal::singleflight::TerminalDiscoverySingleflight;
use super::TerminalOption;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

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
fn terminal_discovery_persist_is_disabled_after_exit_signal() {
    assert!(should_persist_terminal_discovery_snapshot(false));
    assert!(!should_persist_terminal_discovery_snapshot(true));
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

#[test]
fn terminal_discovery_singleflight_coalesces_concurrent_runs() {
    let singleflight = Arc::new(TerminalDiscoverySingleflight::new());
    let execution_count = Arc::new(AtomicUsize::new(0));
    let (leader_started_tx, leader_started_rx) = mpsc::channel();
    let (release_leader_tx, release_leader_rx) = mpsc::channel();

    let worker_singleflight = singleflight.clone();
    let worker_count = execution_count.clone();
    let leader = thread::spawn(move || {
        worker_singleflight.run(|| {
            worker_count.fetch_add(1, Ordering::SeqCst);
            leader_started_tx
                .send(())
                .expect("leader start signal should send");
            release_leader_rx
                .recv()
                .expect("leader release signal should arrive");
            thread::sleep(Duration::from_millis(40));
            vec![TerminalOption {
                id: "wt".to_string(),
                label: "Windows Terminal".to_string(),
                path: "wt.exe".to_string(),
            }]
        })
    });

    leader_started_rx
        .recv()
        .expect("leader should report in-flight state");

    let follower_singleflight = singleflight.clone();
    let follower_count = execution_count.clone();
    let follower = thread::spawn(move || {
        follower_singleflight.run(|| {
            follower_count.fetch_add(1, Ordering::SeqCst);
            vec![TerminalOption {
                id: "powershell".to_string(),
                label: "PowerShell".to_string(),
                path: "powershell.exe".to_string(),
            }]
        })
    });

    thread::sleep(Duration::from_millis(20));
    release_leader_tx
        .send(())
        .expect("leader release signal should send");

    let leader_result = leader.join().expect("leader thread should finish");
    let follower_result = follower.join().expect("follower thread should finish");

    assert_eq!(execution_count.load(Ordering::SeqCst), 1);
    assert_eq!(leader_result, follower_result);
}

#[test]
fn terminal_discovery_singleflight_allows_next_round_after_completion() {
    let singleflight = TerminalDiscoverySingleflight::new();
    let execution_count = AtomicUsize::new(0);

    let first = singleflight.run(|| {
        execution_count.fetch_add(1, Ordering::SeqCst);
        vec![TerminalOption {
            id: "first".to_string(),
            label: "first".to_string(),
            path: "first".to_string(),
        }]
    });
    let second = singleflight.run(|| {
        execution_count.fetch_add(1, Ordering::SeqCst);
        vec![TerminalOption {
            id: "second".to_string(),
            label: "second".to_string(),
            path: "second".to_string(),
        }]
    });

    assert_eq!(execution_count.load(Ordering::SeqCst), 2);
    assert_eq!(first[0].id, "first");
    assert_eq!(second[0].id, "second");
}
