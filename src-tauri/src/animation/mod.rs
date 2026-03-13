use std::sync::atomic::AtomicU64;
use std::sync::Mutex;

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

#[cfg(test)]
mod tests_logic;
