use std::sync::atomic::{AtomicBool, Ordering};

use super::claim_background_terminal_refresh;

#[test]
fn background_terminal_refresh_claim_is_single_flight() {
    let inflight = AtomicBool::new(false);

    assert!(claim_background_terminal_refresh(&inflight));
    assert!(!claim_background_terminal_refresh(&inflight));

    inflight.store(false, Ordering::SeqCst);

    assert!(claim_background_terminal_refresh(&inflight));
}
