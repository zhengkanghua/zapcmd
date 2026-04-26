use super::{
    claim_focus_hide_worker, clamp_to_monitor, compute_reposition_to_cursor_monitor, point_in_monitor,
    resolve_restored_window_position_with, center_in_monitor, MainWindowBounds, MonitorInfo,
};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{PhysicalPosition, PhysicalSize};

fn monitor(
    name: Option<&str>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> MonitorInfo {
    MonitorInfo {
        name: name.map(|name| name.to_string()),
        position: PhysicalPosition::new(x, y),
        size: PhysicalSize::new(width, height),
    }
}

fn saved_bounds(x: i32, y: i32, display_name: Option<&str>) -> MainWindowBounds {
    MainWindowBounds {
        x,
        y,
        display_name: display_name.map(|name| name.to_string()),
    }
}

#[test]
fn point_in_monitor_boundary_contract() {
    let pos = PhysicalPosition::new(10, 20);
    let size = PhysicalSize::new(100, 50);

    // left/top inclusive
    assert!(point_in_monitor(PhysicalPosition::new(10, 20), pos, size));
    // right/bottom exclusive
    assert!(!point_in_monitor(PhysicalPosition::new(110, 20), pos, size));
    assert!(!point_in_monitor(PhysicalPosition::new(10, 70), pos, size));
    // just inside right/bottom
    assert!(point_in_monitor(PhysicalPosition::new(109, 69), pos, size));
}

#[test]
fn clamp_to_monitor_keeps_window_fully_visible() {
    let window_size = PhysicalSize::new(20, 20);
    let monitor_pos = PhysicalPosition::new(0, 0);
    let monitor_size = PhysicalSize::new(100, 100);

    assert_eq!(
        clamp_to_monitor(
            PhysicalPosition::new(-10, -10),
            window_size,
            monitor_pos,
            monitor_size
        ),
        PhysicalPosition::new(0, 0)
    );
    assert_eq!(
        clamp_to_monitor(
            PhysicalPosition::new(90, 90),
            window_size,
            monitor_pos,
            monitor_size
        ),
        PhysicalPosition::new(80, 80)
    );
}

#[test]
fn clamp_to_monitor_degenerates_when_window_is_larger_than_monitor() {
    let window_size = PhysicalSize::new(100, 100);
    let monitor_pos = PhysicalPosition::new(100, 200);
    let monitor_size = PhysicalSize::new(50, 50);

    assert_eq!(
        clamp_to_monitor(
            PhysicalPosition::new(120, 230),
            window_size,
            monitor_pos,
            monitor_size
        ),
        PhysicalPosition::new(100, 200)
    );
}

#[test]
fn restore_position_returns_desired_when_monitors_empty() {
    let saved = saved_bounds(123, -456, Some("B"));
    let window_size = PhysicalSize::new(200, 100);

    assert_eq!(
        resolve_restored_window_position_with(&saved, window_size, &[], None),
        PhysicalPosition::new(123, -456)
    );
}

#[test]
fn restore_position_prefers_display_name_match_even_when_desired_on_other_monitor() {
    let monitors = vec![
        monitor(Some("A"), 0, 0, 1000, 800),
        monitor(Some("B"), 1000, 0, 1000, 800),
    ];
    let saved = saved_bounds(50, 50, Some("B"));
    let desired = PhysicalPosition::new(saved.x, saved.y);
    let window_size = PhysicalSize::new(200, 200);

    let expected =
        clamp_to_monitor(desired, window_size, monitors[1].position, monitors[1].size);
    assert_eq!(
        resolve_restored_window_position_with(&saved, window_size, &monitors, None),
        expected
    );
}

#[test]
fn restore_position_falls_back_to_point_hit_when_display_name_not_found() {
    let monitors = vec![
        monitor(Some("A"), 0, 0, 1000, 800),
        monitor(Some("B"), 1000, 0, 1000, 800),
    ];
    let saved = saved_bounds(1100, 50, Some("C"));
    let desired = PhysicalPosition::new(saved.x, saved.y);
    let window_size = PhysicalSize::new(200, 200);

    let expected =
        clamp_to_monitor(desired, window_size, monitors[1].position, monitors[1].size);
    assert_eq!(
        resolve_restored_window_position_with(&saved, window_size, &monitors, None),
        expected
    );
}

#[test]
fn restore_position_centers_on_primary_when_desired_outside_all_monitors() {
    let monitors = vec![
        monitor(Some("A"), 0, 0, 1000, 800),
        monitor(Some("B"), 1000, 0, 1000, 800),
    ];
    let saved = saved_bounds(-500, -500, None);
    let window_size = PhysicalSize::new(200, 200);

    let expected = center_in_monitor(window_size, monitors[1].position, monitors[1].size);
    assert_eq!(
        resolve_restored_window_position_with(&saved, window_size, &monitors, Some(&monitors[1])),
        expected
    );
}

#[test]
fn restore_position_centers_on_first_when_no_primary_and_desired_outside_all_monitors() {
    let monitors = vec![
        monitor(Some("A"), 0, 0, 1000, 800),
        monitor(Some("B"), 1000, 0, 1000, 800),
    ];
    let saved = saved_bounds(-500, -500, None);
    let window_size = PhysicalSize::new(200, 200);

    let expected = center_in_monitor(window_size, monitors[0].position, monitors[0].size);
    assert_eq!(
        resolve_restored_window_position_with(&saved, window_size, &monitors, None),
        expected
    );
}

#[test]
fn reposition_rejects_when_monitors_empty() {
    let cursor = PhysicalPosition::new(10, 10);
    let window_pos = PhysicalPosition::new(20, 20);
    let window_size = Some(PhysicalSize::new(200, 200));

    assert_eq!(
        compute_reposition_to_cursor_monitor(cursor, window_pos, window_size, &[]),
        None
    );
}

#[test]
fn reposition_rejects_when_cursor_not_in_any_monitor() {
    let monitors = vec![monitor(Some("A"), 0, 0, 1000, 800)];
    let cursor = PhysicalPosition::new(-10, -10);
    let window_pos = PhysicalPosition::new(20, 20);

    assert_eq!(
        compute_reposition_to_cursor_monitor(cursor, window_pos, None, &monitors),
        None
    );
}

#[test]
fn reposition_does_nothing_when_cursor_and_window_on_same_monitor() {
    let monitors = vec![monitor(Some("A"), 0, 0, 1000, 800)];
    let cursor = PhysicalPosition::new(10, 10);
    let window_pos = PhysicalPosition::new(20, 20);

    assert_eq!(
        compute_reposition_to_cursor_monitor(cursor, window_pos, None, &monitors),
        None
    );
}

#[test]
fn reposition_centers_on_cursor_monitor_when_cross_monitor() {
    let monitors = vec![
        monitor(Some("A"), 0, 0, 1000, 800),
        monitor(Some("B"), 1000, 0, 1000, 800),
    ];
    let cursor = PhysicalPosition::new(1100, 10);
    let window_pos = PhysicalPosition::new(20, 20);
    let window_size = Some(PhysicalSize::new(200, 100));

    let expected = center_in_monitor(window_size.unwrap(), monitors[1].position, monitors[1].size);
    assert_eq!(
        compute_reposition_to_cursor_monitor(cursor, window_pos, window_size, &monitors),
        Some(expected)
    );
}

#[test]
fn reposition_centers_on_cursor_monitor_even_when_window_pos_outside_all_monitors() {
    let monitors = vec![
        monitor(Some("A"), 0, 0, 1000, 800),
        monitor(Some("B"), 1000, 0, 1000, 800),
    ];
    let cursor = PhysicalPosition::new(1100, 10);
    let window_pos = PhysicalPosition::new(-500, -500);
    let window_size = Some(PhysicalSize::new(200, 100));

    let expected = center_in_monitor(window_size.unwrap(), monitors[1].position, monitors[1].size);
    assert_eq!(
        compute_reposition_to_cursor_monitor(cursor, window_pos, window_size, &monitors),
        Some(expected)
    );
}

#[test]
fn reposition_uses_default_window_size_when_missing() {
    let monitors = vec![monitor(Some("A"), 0, 0, 1000, 800)];
    let cursor = PhysicalPosition::new(10, 10);
    let window_pos = PhysicalPosition::new(-500, -500);

    let expected = center_in_monitor(
        PhysicalSize::new(680, 124),
        monitors[0].position,
        monitors[0].size,
    );
    assert_eq!(
        compute_reposition_to_cursor_monitor(cursor, window_pos, None, &monitors),
        Some(expected)
    );
}

#[test]
fn focus_hide_worker_claim_is_single_flight() {
    let inflight = AtomicBool::new(false);

    assert!(claim_focus_hide_worker(&inflight));
    assert!(!claim_focus_hide_worker(&inflight));

    inflight.store(false, Ordering::SeqCst);

    assert!(claim_focus_hide_worker(&inflight));
}
