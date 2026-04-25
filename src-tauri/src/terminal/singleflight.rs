use std::panic::{AssertUnwindSafe, catch_unwind, resume_unwind};
use std::sync::{Arc, Condvar, LockResult, Mutex, MutexGuard};

use super::TerminalOption;

/// 终端探测的并发合并器。
/// 同一时刻只允许一个真实探测执行，其余调用直接等待并复用该次结果。
pub(crate) struct TerminalDiscoverySingleflight {
    current: Mutex<Option<Arc<InFlightTerminalDiscovery>>>,
}

struct InFlightTerminalDiscovery {
    result: Mutex<Option<Vec<TerminalOption>>>,
    ready: Condvar,
}

enum FlightRole {
    Leader(Arc<InFlightTerminalDiscovery>),
    Follower(Arc<InFlightTerminalDiscovery>),
}

impl TerminalDiscoverySingleflight {
    pub(crate) fn new() -> Self {
        Self {
            current: Mutex::new(None),
        }
    }

    /// 合并同一轮并发探测，避免启动预热和主动刷新同时重复扫描系统终端。
    pub(crate) fn run(&self, task: impl FnOnce() -> Vec<TerminalOption>) -> Vec<TerminalOption> {
        match self.acquire_flight() {
            FlightRole::Leader(flight) => self.run_as_leader(flight, task),
            FlightRole::Follower(flight) => flight.wait_result(),
        }
    }

    fn acquire_flight(&self) -> FlightRole {
        let mut guard = recover_lock(self.current.lock());
        if let Some(existing) = guard.clone() {
            return FlightRole::Follower(existing);
        }

        let flight = Arc::new(InFlightTerminalDiscovery::new());
        *guard = Some(flight.clone());
        FlightRole::Leader(flight)
    }

    fn run_as_leader(
        &self,
        flight: Arc<InFlightTerminalDiscovery>,
        task: impl FnOnce() -> Vec<TerminalOption>,
    ) -> Vec<TerminalOption> {
        let outcome = catch_unwind(AssertUnwindSafe(task));

        match outcome {
            Ok(result) => {
                flight.finish(result.clone());
                self.clear_current_flight(&flight);
                result
            }
            Err(payload) => {
                // 失败时也要唤醒等待者，避免其它线程永久阻塞在旧 flight 上。
                flight.finish(Vec::new());
                self.clear_current_flight(&flight);
                resume_unwind(payload);
            }
        }
    }

    fn clear_current_flight(&self, flight: &Arc<InFlightTerminalDiscovery>) {
        let mut guard = recover_lock(self.current.lock());
        if guard
            .as_ref()
            .is_some_and(|current| Arc::ptr_eq(current, flight))
        {
            *guard = None;
        }
    }
}

impl InFlightTerminalDiscovery {
    fn new() -> Self {
        Self {
            result: Mutex::new(None),
            ready: Condvar::new(),
        }
    }

    fn finish(&self, result: Vec<TerminalOption>) {
        let mut guard = recover_lock(self.result.lock());
        *guard = Some(result);
        self.ready.notify_all();
    }

    fn wait_result(&self) -> Vec<TerminalOption> {
        let mut guard = recover_lock(self.result.lock());
        while guard.is_none() {
            guard = recover_lock(self.ready.wait(guard));
        }
        guard.clone().unwrap_or_default()
    }
}

fn recover_lock<T>(result: LockResult<MutexGuard<'_, T>>) -> MutexGuard<'_, T> {
    result.unwrap_or_else(|poisoned| poisoned.into_inner())
}
