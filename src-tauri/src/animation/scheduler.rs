use super::ResizeCommandMode;

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct ResizeTarget {
    pub(crate) width: f64,
    pub(crate) height: f64,
}

impl ResizeTarget {
    pub(crate) fn new(width: f64, height: f64) -> Self {
        Self { width, height }
    }

    pub(crate) fn approx_eq(self, other: Self) -> bool {
        (self.width - other.width).abs() < 0.5 && (self.height - other.height).abs() < 0.5
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) struct ResizeDispatchPlan {
    pub(crate) start_animation: bool,
    pub(crate) wait_for_completion: bool,
    pub(crate) schedule_shrink_token: Option<u64>,
    pub(crate) start_shrink_timer: bool,
    pub(crate) wake_shrink_timer: bool,
}

#[derive(Debug)]
pub(crate) struct ResizeScheduler {
    latest_target: Option<ResizeTarget>,
    active_target: Option<ResizeTarget>,
    pub(crate) animation_running: bool,
    pending_shrink_token: Option<u64>,
    pub(crate) shrink_timer_running: bool,
    next_shrink_token: u64,
}

impl ResizeScheduler {
    pub(crate) fn new() -> Self {
        Self {
            latest_target: None,
            active_target: None,
            animation_running: false,
            pending_shrink_token: None,
            shrink_timer_running: false,
            next_shrink_token: 1,
        }
    }

    #[cfg(test)]
    pub(crate) fn latest_target(&self) -> Option<ResizeTarget> {
        self.latest_target
    }

    pub(crate) fn active_target(&self) -> Option<ResizeTarget> {
        self.active_target
    }

    #[cfg(test)]
    pub(crate) fn pending_shrink_token(&self) -> Option<u64> {
        self.pending_shrink_token
    }

    pub(crate) fn sync_current(&mut self, current: ResizeTarget) {
        self.latest_target = Some(current);
        self.active_target = Some(current);
        self.pending_shrink_token = None;
    }

    fn begin_animation(&mut self, wait_for_completion: bool) -> ResizeDispatchPlan {
        self.animation_running = true;
        ResizeDispatchPlan {
            start_animation: true,
            wait_for_completion,
            ..ResizeDispatchPlan::default()
        }
    }

    fn schedule_shrink(&mut self) -> ResizeDispatchPlan {
        let token = self.next_shrink_token;
        self.next_shrink_token += 1;
        self.pending_shrink_token = Some(token);
        let start_shrink_timer = !self.shrink_timer_running;
        self.shrink_timer_running = true;
        ResizeDispatchPlan {
            schedule_shrink_token: Some(token),
            start_shrink_timer,
            wake_shrink_timer: !start_shrink_timer,
            ..ResizeDispatchPlan::default()
        }
    }

    fn clear_pending_shrink_token(&mut self) -> bool {
        self.pending_shrink_token = None;
        self.shrink_timer_running
    }

    pub(crate) fn request(
        &mut self,
        current: ResizeTarget,
        target: ResizeTarget,
        mode: ResizeCommandMode,
    ) -> ResizeDispatchPlan {
        self.latest_target = Some(target);

        if target.approx_eq(current) {
            self.active_target = Some(target);
            let wake_shrink_timer = self.clear_pending_shrink_token();
            return ResizeDispatchPlan {
                wait_for_completion: should_block_until_animation_complete(mode)
                    && self.animation_running,
                wake_shrink_timer,
                ..ResizeDispatchPlan::default()
            };
        }

        if should_block_until_animation_complete(mode) {
            let wake_shrink_timer = self.clear_pending_shrink_token();
            self.active_target = Some(target);
            if self.animation_running {
                return ResizeDispatchPlan {
                    wait_for_completion: true,
                    wake_shrink_timer,
                    ..ResizeDispatchPlan::default()
                };
            }
            let mut plan = self.begin_animation(true);
            plan.wake_shrink_timer = wake_shrink_timer;
            return plan;
        }

        if target.height >= current.height {
            let wake_shrink_timer = self.clear_pending_shrink_token();
            self.active_target = Some(target);
            if self.animation_running {
                return ResizeDispatchPlan {
                    wake_shrink_timer,
                    ..ResizeDispatchPlan::default()
                };
            }
            let mut plan = self.begin_animation(false);
            plan.wake_shrink_timer = wake_shrink_timer;
            return plan;
        }

        self.schedule_shrink()
    }

    pub(crate) fn pending_shrink_wait_token(&mut self) -> Option<u64> {
        if self.pending_shrink_token.is_none() {
            self.shrink_timer_running = false;
        }
        self.pending_shrink_token
    }

    pub(crate) fn fire_shrink_timer(&mut self, token: u64) -> ResizeDispatchPlan {
        if self.pending_shrink_token != Some(token) {
            return ResizeDispatchPlan::default();
        }

        self.pending_shrink_token = None;
        self.shrink_timer_running = false;
        if let Some(latest) = self.latest_target {
            self.active_target = Some(latest);
        } else {
            return ResizeDispatchPlan::default();
        }

        if self.animation_running {
            return ResizeDispatchPlan::default();
        }

        self.begin_animation(false)
    }

    pub(crate) fn target_changed_since(&self, target: ResizeTarget) -> bool {
        self.active_target
            .map(|active| !active.approx_eq(target))
            .unwrap_or(true)
    }

    pub(crate) fn finish_animation(&mut self, current: ResizeTarget) -> bool {
        if self
            .active_target
            .map(|active| !active.approx_eq(current))
            .unwrap_or(false)
        {
            return true;
        }

        self.animation_running = false;
        false
    }
}

pub(crate) fn should_block_until_animation_complete(mode: ResizeCommandMode) -> bool {
    matches!(mode, ResizeCommandMode::Reveal)
}
