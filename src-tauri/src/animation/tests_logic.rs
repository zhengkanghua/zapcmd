use super::{
    ease_out_cubic, should_block_until_animation_complete, size_cache::WindowSizeCache,
    validate_resize_target, ResizeCommandMode, ResizeScheduler, ResizeTarget,
};

#[test]
fn ease_out_cubic_at_zero() {
    assert!((ease_out_cubic(0.0) - 0.0).abs() < f64::EPSILON);
}

#[test]
fn ease_out_cubic_at_one() {
    assert!((ease_out_cubic(1.0) - 1.0).abs() < f64::EPSILON);
}

#[test]
fn ease_out_cubic_at_half() {
    // 1 - (1 - 0.5)^3 = 1 - 0.125 = 0.875
    assert!((ease_out_cubic(0.5) - 0.875).abs() < 1e-10);
}

#[test]
fn ease_out_cubic_is_monotonically_increasing() {
    let mut prev = 0.0;
    for i in 1..=100 {
        let t = i as f64 / 100.0;
        let v = ease_out_cubic(t);
        assert!(v >= prev, "非单调递增: t={t}, v={v}, prev={prev}");
        prev = v;
    }
}

#[test]
fn ease_out_cubic_stays_in_unit_range() {
    for i in 0..=100 {
        let t = i as f64 / 100.0;
        let v = ease_out_cubic(t);
        assert!((0.0..=1.0).contains(&v), "超出 [0,1] 范围: t={t}, v={v}");
    }
}

#[test]
fn window_size_cache_returns_default_before_first_write() {
    let cache = WindowSizeCache::new();

    assert_eq!(cache.read_or_recover(), (0.0, 0.0));
}

#[test]
fn window_size_cache_reads_back_latest_write() {
    let cache = WindowSizeCache::new();

    cache.write_or_recover(640.0, 480.0);

    assert_eq!(cache.read_or_recover(), (640.0, 480.0));
}

#[test]
fn window_size_cache_recovers_after_poison() {
    let cache = WindowSizeCache::new();
    cache.write_or_recover(320.0, 240.0);

    cache.poison_for_test();

    assert_eq!(cache.read_or_recover(), (320.0, 240.0));

    cache.write_or_recover(800.0, 600.0);

    assert_eq!(cache.read_or_recover(), (800.0, 600.0));
}

#[test]
fn validate_resize_target_rejects_non_finite_and_oversized_values() {
    assert!(validate_resize_target(f64::NAN, 240.0).is_err());
    assert!(validate_resize_target(640.0, f64::INFINITY).is_err());
    assert!(validate_resize_target(10_000.0, 240.0).is_err());
    assert!(validate_resize_target(640.0, 10_000.0).is_err());
}

#[test]
fn validate_resize_target_preserves_minimum_window_size_contract() {
    let target = validate_resize_target(12.0, 24.0).expect("small finite sizes should be clamped");

    assert_eq!(target, ResizeTarget::new(320.0, 124.0));
}

#[test]
fn reveal_resize_uses_blocking_mode() {
    assert!(should_block_until_animation_complete(
        ResizeCommandMode::Reveal
    ));
}

#[test]
fn normal_animate_resize_keeps_non_blocking_mode() {
    assert!(!should_block_until_animation_complete(
        ResizeCommandMode::Animated
    ));
}

#[test]
fn animated_resize_keeps_latest_target_when_multiple_updates_arrive() {
    let current = ResizeTarget::new(640.0, 420.0);
    let expand = ResizeTarget::new(640.0, 560.0);
    let shrink = ResizeTarget::new(640.0, 360.0);
    let latest = ResizeTarget::new(640.0, 620.0);
    let mut scheduler = ResizeScheduler::new();

    let first_plan = scheduler.request(current, expand, ResizeCommandMode::Animated);
    assert!(first_plan.start_animation);
    assert_eq!(scheduler.active_target(), Some(expand));
    assert_eq!(scheduler.latest_target(), Some(expand));

    let shrink_plan = scheduler.request(current, shrink, ResizeCommandMode::Animated);
    assert_eq!(shrink_plan.schedule_shrink_token, Some(1));
    assert_eq!(scheduler.active_target(), Some(expand));
    assert_eq!(scheduler.latest_target(), Some(shrink));

    let latest_plan = scheduler.request(current, latest, ResizeCommandMode::Animated);
    assert!(!latest_plan.start_animation);
    assert_eq!(latest_plan.schedule_shrink_token, None);
    assert_eq!(scheduler.pending_shrink_token(), None);
    assert_eq!(scheduler.active_target(), Some(latest));
    assert_eq!(scheduler.latest_target(), Some(latest));
}

#[test]
fn shrink_timer_is_replaced_instead_of_accumulated() {
    let current = ResizeTarget::new(640.0, 520.0);
    let first_target = ResizeTarget::new(640.0, 420.0);
    let second_target = ResizeTarget::new(640.0, 360.0);
    let mut scheduler = ResizeScheduler::new();

    let first_plan = scheduler.request(current, first_target, ResizeCommandMode::Animated);
    assert!(first_plan.start_shrink_timer);
    let first_token = first_plan
        .schedule_shrink_token
        .expect("first shrink token");

    let second_plan = scheduler.request(current, second_target, ResizeCommandMode::Animated);
    assert!(!second_plan.start_shrink_timer);
    let second_token = second_plan
        .schedule_shrink_token
        .expect("second shrink token");

    assert_ne!(first_token, second_token);
    assert_eq!(scheduler.pending_shrink_token(), Some(second_token));

    let stale_fire = scheduler.fire_shrink_timer(first_token);
    assert!(!stale_fire.start_animation);
    assert_eq!(scheduler.pending_shrink_token(), Some(second_token));

    let live_fire = scheduler.fire_shrink_timer(second_token);
    assert!(live_fire.start_animation);
    assert_eq!(scheduler.pending_shrink_token(), None);
    assert_eq!(scheduler.active_target(), Some(second_target));
}

#[test]
fn sync_current_keeps_single_animation_claim_until_running_loop_handles_update() {
    let current = ResizeTarget::new(640.0, 420.0);
    let first_target = ResizeTarget::new(640.0, 560.0);
    let latest_target = ResizeTarget::new(640.0, 620.0);
    let mut scheduler = ResizeScheduler::new();

    let first_plan = scheduler.request(current, first_target, ResizeCommandMode::Animated);
    assert!(first_plan.start_animation);

    scheduler.sync_current(current);

    let followup_plan = scheduler.request(current, latest_target, ResizeCommandMode::Animated);
    assert!(!followup_plan.start_animation);
    assert_eq!(scheduler.active_target(), Some(latest_target));
    assert_eq!(scheduler.latest_target(), Some(latest_target));
}

#[test]
fn reveal_request_updates_target_but_keeps_single_animation_instance() {
    let current = ResizeTarget::new(640.0, 420.0);
    let first_target = ResizeTarget::new(640.0, 560.0);
    let reveal_target = ResizeTarget::new(640.0, 620.0);
    let mut scheduler = ResizeScheduler::new();

    let first_plan = scheduler.request(current, first_target, ResizeCommandMode::Animated);
    assert!(first_plan.start_animation);

    let reveal_plan = scheduler.request(current, reveal_target, ResizeCommandMode::Reveal);
    assert!(!reveal_plan.start_animation);
    assert!(reveal_plan.wait_for_completion);
    assert_eq!(scheduler.pending_shrink_token(), None);
    assert_eq!(scheduler.active_target(), Some(reveal_target));
    assert_eq!(scheduler.latest_target(), Some(reveal_target));
}
