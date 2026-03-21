use std::sync::Mutex;

pub(crate) struct WindowSizeCache {
    inner: Mutex<(f64, f64)>,
}

impl WindowSizeCache {
    pub const fn new() -> Self {
        Self {
            inner: Mutex::new((0.0, 0.0)),
        }
    }

    pub fn read_or_recover(&self) -> (f64, f64) {
        match self.inner.lock() {
            Ok(guard) => *guard,
            Err(poisoned) => *poisoned.into_inner(),
        }
    }

    pub fn write_or_recover(&self, width: f64, height: f64) {
        match self.inner.lock() {
            Ok(mut guard) => {
                *guard = (width, height);
            }
            Err(mut poisoned) => {
                let guard = poisoned.get_mut();
                **guard = (width, height);
            }
        }
    }

    #[cfg(test)]
    pub fn poison_for_test(&self) {
        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = self.inner.lock().unwrap();
            panic!("poison window size cache");
        }));
    }
}
