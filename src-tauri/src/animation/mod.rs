use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use tauri::LogicalSize;
use tauri::{Manager, State, WebviewWindow};

#[cfg(desktop)]
use crate::app_state::AppState;

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

/// 窗口动画控制器 -- 通过 Tauri managed state 注册
pub(crate) struct AnimationController {
    /// 动画代纪计数器：每次启动新动画时递增，旧动画检测到代纪变化自动退出
    pub animation_gen: AtomicU64,
    /// 收缩延迟代纪计数器：每次取消收缩延迟时递增
    pub shrink_delay_gen: AtomicU64,
    /// 当前窗口实际尺寸（每帧更新）
    pub current_size: Mutex<(f64, f64)>,
}

impl AnimationController {
    pub fn new() -> Self {
        Self {
            animation_gen: AtomicU64::new(0),
            shrink_delay_gen: AtomicU64::new(0),
            current_size: Mutex::new((0.0, 0.0)),
        }
    }
}

/// ease-out-cubic 缓动函数: f(t) = 1 - (1 - t)^3
pub(crate) fn ease_out_cubic(t: f64) -> f64 {
    1.0 - (1.0 - t).powi(3)
}

#[tauri::command]
pub(crate) async fn animate_main_window_size(
    window: WebviewWindow,
    state: State<'_, AnimationController>,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let target_w = width.max(MIN_WIDTH);
    let target_h = height.max(MIN_HEIGHT);
    let (current_w, current_h) = *state.current_size.lock().unwrap();

    // 首次调用 — current_size 为零，即时设置并记录
    if current_w == 0.0 && current_h == 0.0 {
        set_size_with_position_guard(&window, target_w, target_h);
        *state.current_size.lock().unwrap() = (target_w, target_h);
        return Ok(());
    }

    // 目标与当前一致 — 跳过
    if (target_w - current_w).abs() < 0.5 && (target_h - current_h).abs() < 0.5 {
        return Ok(());
    }

    // 等高时走扩展路径（即时动画），避免纯宽度变化等 300ms
    let is_expand = target_h >= current_h;

    if is_expand {
        // 扩展或等高：取消收缩延迟 + 立即启动动画
        state.shrink_delay_gen.fetch_add(1, Ordering::SeqCst);
        let gen = state.animation_gen.fetch_add(1, Ordering::SeqCst) + 1;
        let win = window.clone();
        let app = window.app_handle().clone();
        tokio::spawn(async move {
            run_animation(&win, &app, gen, target_w, target_h).await;
        });
    } else {
        // 收缩：取消当前动画 + 300ms 延迟后启动
        state.animation_gen.fetch_add(1, Ordering::SeqCst);
        let delay_gen = state.shrink_delay_gen.fetch_add(1, Ordering::SeqCst) + 1;
        let win = window.clone();
        let app = window.app_handle().clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(SHRINK_DELAY_MS)).await;
            let ctrl = app.state::<AnimationController>();
            if ctrl.shrink_delay_gen.load(Ordering::SeqCst) != delay_gen {
                return; // 延迟期间被取消
            }
            let gen = ctrl.animation_gen.fetch_add(1, Ordering::SeqCst) + 1;
            run_animation(&win, &app, gen, target_w, target_h).await;
        });
    }

    Ok(())
}

/// 帧步进动画循环
async fn run_animation(
    window: &WebviewWindow,
    app: &tauri::AppHandle,
    gen: u64,
    target_w: f64,
    target_h: f64,
) {
    let ctrl = app.state::<AnimationController>();
    let (start_w, start_h) = *ctrl.current_size.lock().unwrap();
    let total_frames = ANIMATION_DURATION_MS / ANIMATION_FRAME_MS;

    for frame in 1..=total_frames {
        if ctrl.animation_gen.load(Ordering::SeqCst) != gen {
            return; // 被更新的动画取消
        }
        let t = frame as f64 / total_frames as f64;
        let eased = ease_out_cubic(t);
        let w = start_w + (target_w - start_w) * eased;
        let h = start_h + (target_h - start_h) * eased;

        set_size_with_position_guard(window, w, h);
        *ctrl.current_size.lock().unwrap() = (w, h);

        // 最后一帧不 sleep — 避免多等 16ms
        if frame < total_frames {
            tokio::time::sleep(Duration::from_millis(ANIMATION_FRAME_MS)).await;
        }
    }

    // 最终精确设置目标尺寸（消除浮点误差）
    if ctrl.animation_gen.load(Ordering::SeqCst) != gen {
        return;
    }
    set_size_with_position_guard(window, target_w, target_h);
    *ctrl.current_size.lock().unwrap() = (target_w, target_h);
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
