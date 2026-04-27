use std::panic::{self, AssertUnwindSafe};
use std::sync::atomic::{AtomicBool, Ordering};

use super::{claim_background_terminal_refresh, run_claimed_background_terminal_refresh};

#[test]
fn background_terminal_refresh_claim_is_single_flight() {
    let inflight = AtomicBool::new(false);

    assert!(claim_background_terminal_refresh(&inflight));
    assert!(!claim_background_terminal_refresh(&inflight));

    inflight.store(false, Ordering::SeqCst);

    assert!(claim_background_terminal_refresh(&inflight));
}

#[test]
fn claimed_background_terminal_refresh_resets_inflight_after_success() {
    let inflight = AtomicBool::new(false);
    assert!(claim_background_terminal_refresh(&inflight));

    run_claimed_background_terminal_refresh(&inflight, || {});

    assert!(!inflight.load(Ordering::SeqCst));
}

#[test]
fn claimed_background_terminal_refresh_resets_inflight_after_panic() {
    let inflight = AtomicBool::new(false);
    assert!(claim_background_terminal_refresh(&inflight));

    let result = panic::catch_unwind(AssertUnwindSafe(|| {
        run_claimed_background_terminal_refresh(&inflight, || {
            panic!("boom");
        });
    }));

    assert!(result.is_err());
    assert!(!inflight.load(Ordering::SeqCst));
}
