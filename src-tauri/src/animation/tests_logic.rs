use super::{ease_out_cubic, size_cache::WindowSizeCache};

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
