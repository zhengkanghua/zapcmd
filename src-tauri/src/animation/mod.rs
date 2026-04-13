use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Duration;

use tauri::LogicalSize;
use tauri::{Manager, State, WebviewWindow};
use tokio::sync::Notify;

#[cfg(desktop)]
use crate::app_state::AppState;
#[cfg(test)]
pub(crate) use scheduler::should_block_until_animation_complete;
pub(crate) use scheduler::{ResizeScheduler, ResizeTarget};
use size_cache::WindowSizeCache;

mod scheduler;
mod size_cache;

/// 缓动动画总时长（ms）
const ANIMATION_DURATION_MS: u64 = 120;
/// 帧间隔 ≈60fps
const ANIMATION_FRAME_MS: u64 = 16;
/// 收缩延迟（ms）
const SHRINK_DELAY_MS: u64 = 300;
/// 窗口最小宽度
const MIN_WIDTH: f64 = 320.0;
/// 窗口最小高度
const MIN_HEIGHT: f64 = 124.0;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum ResizeCommandMode {
    Animated,
    Reveal,
}

/// 窗口动画控制器 -- 通过 Tauri managed state 注册
pub(crate) struct AnimationController {
    /// 当前窗口实际尺寸（每帧更新）
    pub current_size: WindowSizeCache,
    /// latest-target / shrink-timer / 单实例动画的纯调度状态
    pub scheduler: Mutex<ResizeScheduler>,
    /// 唤醒单实例 shrink timer worker，以便重置延迟或响应取消。
    pub shrink_timer_notify: Arc<Notify>,
}

impl AnimationController {
    pub fn new() -> Self {
        Self {
            current_size: WindowSizeCache::new(),
            scheduler: Mutex::new(ResizeScheduler::new()),
            shrink_timer_notify: Arc::new(Notify::new()),
        }
    }

    /// 同步外部立即 resize 结果，并取消旧动画 / shrink timer。
    pub(crate) fn sync_current_size(&self, width: f64, height: f64) {
        self.current_size.write_or_recover(width, height);
        lock_scheduler(&self.scheduler).sync_current(ResizeTarget::new(width, height));
        self.shrink_timer_notify.notify_one();
    }
}

/// ease-out-cubic 缓动函数：f(t)=1-(1-t)^3
pub(crate) fn ease_out_cubic(t: f64) -> f64 {
    1.0 - (1.0 - t).powi(3)
}

fn lock_scheduler(scheduler: &Mutex<ResizeScheduler>) -> MutexGuard<'_, ResizeScheduler> {
    scheduler
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

async fn run_resize_main_window_command(
    window: WebviewWindow,
    state: State<'_, AnimationController>,
    width: f64,
    height: f64,
    mode: ResizeCommandMode,
) -> Result<(), String> {
    let target = ResizeTarget::new(width.max(MIN_WIDTH), height.max(MIN_HEIGHT));
    let (current_w, current_h) = state.current_size.read_or_recover();
    let current = ResizeTarget::new(current_w, current_h);

    // 首次调用 — current_size 为零，即时设置并记录
    if current_w == 0.0 && current_h == 0.0 {
        set_size_with_position_guard(&window, target.width, target.height);
        state.sync_current_size(target.width, target.height);
        return Ok(());
    }

    let plan = lock_scheduler(&state.scheduler).request(current, target, mode);
    let app = window.app_handle().clone();

    if plan.start_shrink_timer {
        let win = window.clone();
        let app = app.clone();
        tokio::spawn(async move {
            run_shrink_timer_loop(&win, &app).await;
        });
    } else if plan.wake_shrink_timer {
        state.shrink_timer_notify.notify_one();
    }

    if plan.start_animation {
        if plan.wait_for_completion {
            run_animation_loop(&window, &app).await;
        } else {
            let win = window.clone();
            tokio::spawn(async move {
                run_animation_loop(&win, &app).await;
            });
        }
    } else if plan.wait_for_completion {
        wait_for_animation_idle(&app).await;
    }

    Ok(())
}

#[tauri::command]
pub(crate) async fn animate_main_window_size(
    window: WebviewWindow,
    state: State<'_, AnimationController>,
    width: f64,
    height: f64,
) -> Result<(), String> {
    run_resize_main_window_command(window, state, width, height, ResizeCommandMode::Animated).await
}

#[tauri::command]
pub(crate) async fn resize_main_window_for_reveal(
    window: WebviewWindow,
    state: State<'_, AnimationController>,
    width: f64,
    height: f64,
) -> Result<(), String> {
    run_resize_main_window_command(window, state, width, height, ResizeCommandMode::Reveal).await
}

async fn wait_for_animation_idle(app: &tauri::AppHandle) {
    loop {
        let ctrl = app.state::<AnimationController>();
        if !lock_scheduler(&ctrl.scheduler).animation_running {
            return;
        }
        tokio::time::sleep(Duration::from_millis(ANIMATION_FRAME_MS)).await;
    }
}

async fn run_shrink_timer_loop(window: &WebviewWindow, app: &tauri::AppHandle) {
    loop {
        let token = {
            let ctrl = app.state::<AnimationController>();
            let mut scheduler = lock_scheduler(&ctrl.scheduler);
            let Some(token) = scheduler.pending_shrink_wait_token() else {
                return;
            };
            token
        };
        let notify = {
            let ctrl = app.state::<AnimationController>();
            ctrl.shrink_timer_notify.clone()
        };
        let sleep = tokio::time::sleep(Duration::from_millis(SHRINK_DELAY_MS));
        tokio::pin!(sleep);
        let notified = notify.notified();
        tokio::pin!(notified);
        tokio::select! {
            _ = &mut sleep => {
                let timer_plan = {
                    let ctrl = app.state::<AnimationController>();
                    let plan = lock_scheduler(&ctrl.scheduler).fire_shrink_timer(token);
                    plan
                };
                if timer_plan.start_animation {
                    run_animation_loop(window, app).await;
                }
            }
            _ = &mut notified => continue,
        }
        let ctrl = app.state::<AnimationController>();
        if !lock_scheduler(&ctrl.scheduler).shrink_timer_running {
            return;
        }
    }
}

/// 单实例动画循环：同一个 task 在 active_target 变化时原地重启，始终向最新目标收敛。
async fn run_animation_loop(window: &WebviewWindow, app: &tauri::AppHandle) {
    let ctrl = app.state::<AnimationController>();
    let total_frames = ANIMATION_DURATION_MS / ANIMATION_FRAME_MS;

    'retarget: loop {
        let (start_w, start_h) = ctrl.current_size.read_or_recover();
        let start = ResizeTarget::new(start_w, start_h);
        let target = {
            let scheduler = lock_scheduler(&ctrl.scheduler);
            scheduler.active_target()
        };

        let Some(target) = target else {
            lock_scheduler(&ctrl.scheduler).finish_animation(start);
            return;
        };

        if target.approx_eq(start) {
            if !lock_scheduler(&ctrl.scheduler).finish_animation(start) {
                return;
            }
            continue;
        }

        for frame in 1..=total_frames {
            if lock_scheduler(&ctrl.scheduler).target_changed_since(target) {
                continue 'retarget;
            }
            let t = frame as f64 / total_frames as f64;
            let eased = ease_out_cubic(t);
            let w = start.width + (target.width - start.width) * eased;
            let h = start.height + (target.height - start.height) * eased;

            set_size_with_position_guard(window, w, h);
            ctrl.current_size.write_or_recover(w, h);

            if frame < total_frames {
                tokio::time::sleep(Duration::from_millis(ANIMATION_FRAME_MS)).await;
            }
        }

        if lock_scheduler(&ctrl.scheduler).target_changed_since(target) {
            continue 'retarget;
        }

        set_size_with_position_guard(window, target.width, target.height);
        ctrl.current_size
            .write_or_recover(target.width, target.height);

        if !lock_scheduler(&ctrl.scheduler).finish_animation(target) {
            return;
        }
    }
}

/// 设置窗口尺寸并通过 move_save_token 保护位置不漂移
///
/// 逻辑与 windowing.rs 中 set_main_window_size 相同：
/// 记录 resize 前的位置和 token，resize 后若 token 未变则恢复位置。
fn set_size_with_position_guard(window: &WebviewWindow, w: f64, h: f64) {
    #[cfg(desktop)]
    let token_before = {
        let app_state = window.app_handle().state::<AppState>();
        app_state.move_save_token.load(Ordering::SeqCst)
    };
    let prev_pos = window.outer_position().ok();
    let _ = window.set_size(LogicalSize::new(w, h));
    #[cfg(desktop)]
    {
        let app_state = window.app_handle().state::<AppState>();
        if app_state.move_save_token.load(Ordering::SeqCst) != token_before {
            return;
        }
    }
    if let Some(pos) = prev_pos {
        let _ = window.set_position(tauri::Position::Physical(pos));
    }
}

#[cfg(test)]
mod tests_logic;
