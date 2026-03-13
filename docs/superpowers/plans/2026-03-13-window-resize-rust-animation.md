# 窗口尺寸调整 Rust 端缓动动画 — 实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将窗口尺寸调整从"前端计算 + Rust 即时 set_size"改为"前端计算 + Rust 端缓动动画"，实现平滑扩展/收缩过渡。

**Architecture:** 前端只传目标尺寸，Rust 端 spawn 异步 tokio 任务，以 ease_out_cubic 缓动函数分帧插值（~60fps × 120ms）。智能防抖策略：扩展即时启动动画，收缩延迟 300ms 再启动。使用代纪计数器（generation counter）实现无竞态的动画中断。

**Tech Stack:** Rust (Tauri 2.x, tokio), TypeScript (Vue 3 composables), Vitest

**设计文档:** `docs/superpowers/specs/2026-03-13-window-resize-rust-animation-design.md`

---

## 文件结构

### 新建

| 文件 | 职责 |
|---|---|
| `src-tauri/src/animation.rs` | AnimationController 结构体 + ease_out_cubic + 帧循环 + animate 命令 |
| `src-tauri/src/animation/tests_logic.rs` | Rust 单元测试（缓动函数、防抖方向判断） |

### 修改

| 文件 | 变更摘要 |
|---|---|
| `src-tauri/Cargo.toml:18` | 新增 `tokio = { version = "1", features = ["rt", "time"] }` |
| `src-tauri/src/lib.rs:1-17,42-55` | 新增 `mod animation;`，注册 managed state 和命令 |
| `src-tauri/src/windowing.rs:17-44` | `set_main_window_size` 尾部同步 `AnimationController.current_size` |
| `src/services/tauriBridge.ts:40-42` | 新增 `requestAnimateMainWindowSize` 桥接函数 |
| `src/composables/app/useAppCompositionRoot/ports.ts:11-14,25-43,46-76` | ports 接口 + 工厂新增桥接 |
| `src/composables/launcher/useWindowSizing/model.ts:15-30,32-51` | 接口新增 `requestAnimateMainWindowSize`，删除 `windowResizeDebounceMs` |
| `src/composables/launcher/useLauncherLayoutMetrics.ts:29,48` | 删除 `WINDOW_RESIZE_DEBOUNCE_MS` 常量 |
| `src/composables/launcher/useWindowSizing/controller.ts` | 移除 debounce，拆分 immediate/animated 双路径 |
| `src/composables/launcher/useLauncherWatchers.ts:20-47` | 移除 staging guard + 简化 watcher |
| `src/composables/launcher/useLauncherWatcherBindings.ts:5-8,25-40` | 移除 `syncWindowSizeImmediate` 透传 |
| `src/composables/app/useAppCompositionRoot/runtime.ts:184-203` | 注入 `requestAnimateMainWindowSize` |
| `src/__tests__/app.failure-events.test.ts` | P0 测试回归 |
| `src/composables/__tests__/launcher/useLauncherWatchers.test.ts` | P1 测试回归 |
| `src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts` | P1 测试回归 |
| `src/services/__tests__/tauriBridge.test.ts` | 新增桥接测试 |
| `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts` | P2 mock 修复 |

---

## Chunk 1: Rust 动画引擎

### Task 1: 添加 tokio 依赖 + mod 声明

**Files:**
- Modify: `src-tauri/Cargo.toml:18`
- Modify: `src-tauri/src/lib.rs:1-8`

- [ ] **Step 1: 在 Cargo.toml 新增 tokio 依赖**

在 `[dependencies]` 区块（第 18 行 `tauri` 之后）新增：

```toml
tokio = { version = "1", features = ["time"] }
```

> `time` 用于 `tokio::time::sleep`。Tauri 2.x 内部的 tokio runtime 已提供 `tokio::spawn` 支持，无需额外声明 `rt` feature。若 cargo check 报 `tokio::spawn` 未找到，再补 `features = ["rt", "time"]`。

- [ ] **Step 2: 在 lib.rs 声明 animation 模块**

在 `lib.rs` 第 1 行（`mod app_state;` 之前）新增：

```rust
mod animation;
```

- [ ] **Step 3: 创建最小骨架文件确保可编译**

创建 `src-tauri/src/animation.rs`，内容仅为空的 AnimationController 占位（使 `mod animation;` 能通过编译）：

```rust
// 窗口缓动动画模块 — 将在 Task 2 中填充完整实现
```

- [ ] **Step 4: 验证 cargo check 通过**

Run: `cd src-tauri && cargo check 2>&1 | tail -5`
Expected: 编译成功（骨架文件存在，模块可解析）

- [ ] **Step 5: 提交**

```bash
git add src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/src/animation.rs
git commit -m "$(cat <<'EOF'
chore(tauri): 新增 tokio 依赖并声明 animation 模块

为窗口缓动动画准备 tokio 的 time 特性。
EOF
)"
```

---

### Task 2: 创建 animation.rs — ease_out_cubic + 单元测试（TDD）

**Files:**
- Create: `src-tauri/src/animation.rs`
- Create: `src-tauri/src/animation/tests_logic.rs`

- [ ] **Step 1: 创建测试文件（先写失败测试）**

创建 `src-tauri/src/animation/tests_logic.rs`：

```rust
use super::ease_out_cubic;

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
```

- [ ] **Step 2: 覆写 animation.rs 骨架 + 缓动函数**

覆写 `src-tauri/src/animation.rs`（替换 Task 1 的占位内容）：

```rust
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

/// 窗口动画控制器 — 通过 Tauri managed state 注册
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
```

- [ ] **Step 3: 运行测试验证通过**

Run: `cd src-tauri && cargo test tests_logic -- --nocapture 2>&1`
Expected: 5 tests passed

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/animation.rs src-tauri/src/animation/tests_logic.rs
git commit -m "$(cat <<'EOF'
feat(animation): 新增 ease_out_cubic 缓动函数与 AnimationController 结构体

TDD：5 项单元测试覆盖边界值、单调性和值域。
EOF
)"
```

---

### Task 3: animate_main_window_size 命令 + 帧循环 + 智能防抖

**Files:**
- Modify: `src-tauri/src/animation.rs`

> **设计偏差说明：** 设计文档使用 `AtomicBool` 作为取消令牌，此处改用 `AtomicU64` 代纪计数器。优势：无需 sleep-then-reset 的时序技巧，天然无竞态，多个连续目标场景更健壮。行为完全符合设计文档的取消语义。

- [ ] **Step 1: 在 animation.rs 添加 animate_main_window_size 命令**

在 `ease_out_cubic` 函数之后、`#[cfg(test)]` 之前添加：

```rust
use std::sync::atomic::Ordering;
use std::time::Duration;
use tauri::LogicalSize;
use tauri::{Manager, State, WebviewWindow};

use crate::app_state::AppState;

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
```

- [ ] **Step 2: 确保文件顶部 use 声明完整**

完整的 `animation.rs` 顶部 imports 应为：

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use tauri::LogicalSize;
use tauri::{Manager, State, WebviewWindow};

#[cfg(desktop)]
use crate::app_state::AppState;
```

- [ ] **Step 3: cargo check 验证编译通过**

Run: `cd src-tauri && cargo check 2>&1 | tail -10`
Expected: 编译成功（命令尚未注册，但模块可编译）

- [ ] **Step 4: 运行已有测试确认不受影响**

Run: `cd src-tauri && cargo test 2>&1 | tail -5`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/animation.rs
git commit -m "$(cat <<'EOF'
feat(animation): 实现 animate_main_window_size 命令与帧步进循环

智能防抖：扩展即时动画，收缩延迟 300ms。
代纪计数器替代 AtomicBool 取消令牌，消除竞态。
EOF
)"
```

---

### Task 4: 注册 managed state + 命令 (lib.rs)

**Files:**
- Modify: `src-tauri/src/lib.rs:1-17,20-56`

- [ ] **Step 1: 添加 animation 模块的 use 声明**

在 `lib.rs` 的 use 声明区（第 13-18 行之后）新增：

```rust
use animation::{animate_main_window_size, AnimationController};
```

- [ ] **Step 2: 在 setup 闭包注册 managed state**

在 `startup::initialize_state(app);` 之后（约第 27 行）新增：

```rust
app.manage(AnimationController::new());
```

- [ ] **Step 3: 在 generate_handler! 注册新命令**

在 `set_main_window_size,` 之后新增 `animate_main_window_size,`：

```rust
.invoke_handler(tauri::generate_handler![
    ping,
    set_main_window_size,
    animate_main_window_size,
    // ... 其余命令不变
])
```

- [ ] **Step 4: cargo check 验证**

Run: `cd src-tauri && cargo check 2>&1 | tail -5`
Expected: 编译成功

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/lib.rs
git commit -m "$(cat <<'EOF'
feat(animation): 注册 AnimationController managed state 与 animate 命令
EOF
)"
```

---

### Task 5: windowing.rs 同步 AnimationController.current_size

**Files:**
- Modify: `src-tauri/src/windowing.rs:17-44`

> **为什么需要此步：** `syncWindowSizeImmediate`（聚焦校准）仍调用旧的 `set_main_window_size` 命令。该命令不经过 AnimationController，执行后 `current_size` 会过期。下一次 animate 调用时从过期的 current_size 出发会产生跳变。

- [ ] **Step 1: 在 set_main_window_size 尾部同步 current_size**

在 `windowing.rs` 的 `set_main_window_size` 函数中，`Ok(())` 返回之前（约第 43 行），新增：

```rust
    // 同步 AnimationController.current_size，避免 immediate resize 后动画起点过期
    if let Some(ctrl) = window.try_app_handle().and_then(|h| h.try_state::<crate::animation::AnimationController>()) {
        *ctrl.current_size.lock().unwrap() = (width, height);
    }
```

> 使用 `try_state` 而非 `state` — 在测试或 AnimationController 未注册时不 panic。

- [ ] **Step 2: cargo check + cargo test 验证**

Run: `cd src-tauri && cargo check && cargo test 2>&1 | tail -10`
Expected: 编译和所有测试通过

- [ ] **Step 3: cargo clippy 检查**

Run: `cd src-tauri && cargo clippy 2>&1 | tail -10`
Expected: 无 warning 或仅已有 warning

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/windowing.rs
git commit -m "$(cat <<'EOF'
fix(windowing): set_main_window_size 同步 AnimationController.current_size

避免 immediate resize 后动画起点过期导致跳变。
EOF
)"
```

---

## Chunk 2: 前端改造

### Task 6: tauriBridge.ts — 新增桥接函数

**Files:**
- Modify: `src/services/tauriBridge.ts:40-42`

- [ ] **Step 1: 在 requestSetMainWindowSize 之后新增 requestAnimateMainWindowSize**

在 `tauriBridge.ts` 第 42 行（`requestSetMainWindowSize` 函数结束）之后新增：

```typescript
export async function requestAnimateMainWindowSize(width: number, height: number): Promise<void> {
  await invoke("animate_main_window_size", { width, height });
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/tauriBridge.ts
git commit -m "$(cat <<'EOF'
feat(bridge): 新增 requestAnimateMainWindowSize 桥接函数
EOF
)"
```

---

### Task 7: ports.ts — 更新 Ports 接口 + 工厂

**Files:**
- Modify: `src/composables/app/useAppCompositionRoot/ports.ts:4-14,25-43,45-76`

- [ ] **Step 1: 在 import 中新增 requestAnimateMainWindowSize**

在 `ports.ts` 第 4-14 行的 import 列表中新增 `requestAnimateMainWindowSize`：

```typescript
import {
  readAutoStartEnabled,
  readAvailableTerminals,
  readLauncherHotkey,
  readRuntimePlatform,
  readUserCommandFiles,
  requestAnimateMainWindowSize,
  requestHideMainWindow,
  requestSetMainWindowSize,
  writeAutoStartEnabled,
  writeLauncherHotkey
} from "../../../services/tauriBridge";
```

- [ ] **Step 2: 在 AppCompositionRootPorts 接口新增字段**

在 `requestSetMainWindowSize` 字段（第 40 行）之后新增：

```typescript
  requestAnimateMainWindowSize: typeof requestAnimateMainWindowSize;
```

- [ ] **Step 3: 在 createDefaultAppCompositionRootPorts 工厂新增实现**

在 `requestSetMainWindowSize,`（第 69 行）之后新增：

```typescript
    requestAnimateMainWindowSize,
```

- [ ] **Step 4: 提交**

```bash
git add src/composables/app/useAppCompositionRoot/ports.ts
git commit -m "$(cat <<'EOF'
feat(ports): Ports 接口与工厂新增 requestAnimateMainWindowSize
EOF
)"
```

---

### Task 8: model.ts — 接口更新

**Files:**
- Modify: `src/composables/launcher/useWindowSizing/model.ts:15-30,32-51`

- [ ] **Step 1: 在 UseWindowSizingOptions 接口新增 requestAnimateMainWindowSize**

在 `requestSetMainWindowSize` 字段（第 37 行）之后新增：

```typescript
  requestAnimateMainWindowSize: (width: number, height: number) => Promise<void>;
```

- [ ] **Step 2: 在 WindowSizingConstants 删除 windowResizeDebounceMs**

删除 `model.ts` 第 29 行：

```typescript
  windowResizeDebounceMs: number;
```

- [ ] **Step 3: 提交**

```bash
git add src/composables/launcher/useWindowSizing/model.ts
git commit -m "$(cat <<'EOF'
refactor(model): UseWindowSizingOptions 新增 animate 桥接，删除 debounce 常量

防抖逻辑已迁移到 Rust 端，前端不再需要 windowResizeDebounceMs。
EOF
)"
```

---

### Task 9: useLauncherLayoutMetrics.ts — 删除 debounce 常量

**Files:**
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts:29,34-49`

- [ ] **Step 1: 删除 WINDOW_RESIZE_DEBOUNCE_MS 常量声明**

删除第 29 行：

```typescript
const WINDOW_RESIZE_DEBOUNCE_MS = 72;
```

- [ ] **Step 2: 删除 WINDOW_SIZING_CONSTANTS 中的 windowResizeDebounceMs 字段**

删除第 48 行：

```typescript
  windowResizeDebounceMs: WINDOW_RESIZE_DEBOUNCE_MS
```

> 注意：删除后确保 `as const` 前最后一个字段的逗号正确。

- [ ] **Step 3: 提交**

```bash
git add src/composables/launcher/useLauncherLayoutMetrics.ts
git commit -m "$(cat <<'EOF'
refactor(layout): 删除 WINDOW_RESIZE_DEBOUNCE_MS 常量

防抖逻辑已迁移到 Rust 端。
EOF
)"
```

---

### Task 10: controller.ts — 移除 debounce、拆分双路径

**Files:**
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`

> **核心改动：**
> 1. `syncWindowSize` 改调 `requestAnimateMainWindowSize`
> 2. `scheduleWindowSync` 改为直接调用 `syncWindowSize`（无 setTimeout）
> 3. `syncWindowSizeImmediate` 独立实现，调 `requestSetMainWindowSize`
> 4. 移除 `resizeTimer` 相关状态
> 5. `clearResizeTimer` 保留为空函数（外部仍调用）

- [ ] **Step 1: 重写 controller.ts**

完整替换 `controller.ts` 为以下内容：

```typescript
import { LogicalSize } from "@tauri-apps/api/window";
import { nextTick } from "vue";
import { resolveWindowSize, shouldSkipResize } from "./calculation";
import type { UseWindowSizingOptions, WindowSize } from "./model";

interface WindowSizingState {
  lastWindowSize: WindowSize | null;
  syncingWindowSize: boolean;
  queuedWindowSync: boolean;
}

function createWindowSizingState(): WindowSizingState {
  return {
    lastWindowSize: null,
    syncingWindowSize: false,
    queuedWindowSync: false
  };
}

export function createWindowSizingController(options: UseWindowSizingOptions) {
  const state = createWindowSizingState();

  /**
   * 核心同步逻辑 — 通过指定的 bridge 函数设置窗口尺寸
   * @param bridge 实际的 IPC 调用函数（animate 或 immediate）
   */
  async function syncWindowSizeCore(
    bridge: (width: number, height: number) => Promise<void>
  ): Promise<void> {
    if (options.isSettingsWindow.value) {
      return;
    }
    if (state.syncingWindowSize) {
      state.queuedWindowSync = true;
      return;
    }

    state.syncingWindowSize = true;
    await nextTick();
    try {
      const size = resolveWindowSize(options);
      const appWindow = options.resolveAppWindow();
      if (shouldSkipResize(state.lastWindowSize, size, options.constants.windowSizeEpsilon)) {
        return;
      }
      state.lastWindowSize = size;
      if (!options.isTauriRuntime()) {
        return;
      }

      try {
        await bridge(size.width, size.height);
      } catch (error) {
        console.warn("window command resize failed", error);
        try {
          if (appWindow) {
            await appWindow.setSize(new LogicalSize(size.width, size.height));
          }
        } catch (fallbackError) {
          console.warn("window webview resize failed", fallbackError);
        }
      }
    } finally {
      state.syncingWindowSize = false;
      if (state.queuedWindowSync) {
        state.queuedWindowSync = false;
        scheduleWindowSync();
      }
    }
  }

  /** 缓动动画路径 — 用于 watcher 触发的响应式更新 */
  async function syncWindowSize(): Promise<void> {
    return syncWindowSizeCore(options.requestAnimateMainWindowSize);
  }

  /** 即时跳转路径 — 用于聚焦校准等无动画场景 */
  function syncWindowSizeImmediate(): void {
    void syncWindowSizeCore(options.requestSetMainWindowSize);
  }

  /** 调度窗口同步 — 防抖已在 Rust 端，此处直接调用 */
  function scheduleWindowSync(): void {
    void syncWindowSize();
  }

  function onViewportResize(): void {
    scheduleWindowSync();
  }

  function onAppFocused(): void {
    if (options.isSettingsWindow.value) {
      return;
    }
    options.loadSettings();
    syncWindowSizeImmediate();
    options.scheduleSearchInputFocus(true);
  }

  /** 清理 resize 定时器 — debounce 已移除，保留为空函数兼容外部调用 */
  function clearResizeTimer(): void {
    // 前端 debounce 已移除（防抖在 Rust 端），此处为 no-op
  }

  return {
    onViewportResize,
    onAppFocused,
    scheduleWindowSync,
    syncWindowSize,
    syncWindowSizeImmediate,
    clearResizeTimer
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/composables/launcher/useWindowSizing/controller.ts
git commit -m "$(cat <<'EOF'
refactor(controller): 移除前端 debounce，拆分 animate/immediate 双路径

syncWindowSize 走 requestAnimateMainWindowSize（缓动动画），
syncWindowSizeImmediate 走 requestSetMainWindowSize（即时跳转）。
scheduleWindowSync 改为直接调用，防抖逻辑已在 Rust 端。
EOF
)"
```

---

### Task 11: useLauncherWatchers.ts + useLauncherWatcherBindings.ts — 简化

**Files:**
- Modify: `src/composables/launcher/useLauncherWatchers.ts:4-47`
- Modify: `src/composables/launcher/useLauncherWatcherBindings.ts:5-8,25-40`

> **变更逻辑：**
> 1. 第一个 watcher 移除 `opening`/`closing` guard — Rust 端智能防抖自动合并连续目标
> 2. 第二个 watcher 简化为统一调用 `scheduleWindowSync` — 不再区分 `syncWindowSizeImmediate`
> 3. `UseLauncherWatchersOptions` 和 bindings adapter 移除 `syncWindowSizeImmediate`

- [ ] **Step 1: 重写 useLauncherWatchers.ts**

将 `UseLauncherWatchersOptions` 接口中删除 `syncWindowSizeImmediate`（第 11 行），
将 `bindLayoutWatchers` 中的第一个 watcher 移除 staging guard（第 29-34 行），
将第二个 watcher 简化（第 39-47 行）：

```typescript
import { nextTick, watch, type Ref } from "vue";
import type { StagingDrawerState } from "./useStagingQueue";

interface UseLauncherWatchersOptions {
  drawerOpen: Ref<boolean>;
  drawerVisibleRows: Ref<number>;
  stagingVisibleRows: Ref<number>;
  pendingCommand: Ref<unknown>;
  stagingDrawerState: Ref<StagingDrawerState>;
  scheduleWindowSync: () => void;
  filteredResults: Ref<unknown[]>;
  resultButtons: Ref<Array<HTMLElement | null>>;
  activeIndex: Ref<number>;
  drawerRef: Ref<HTMLElement | null>;
  ensureActiveResultVisible: () => void;
  paramInputRef: Ref<HTMLInputElement | null>;
}

function bindLayoutWatchers(options: UseLauncherWatchersOptions): void {
  watch(
    [
      options.drawerOpen,
      options.drawerVisibleRows,
      options.stagingVisibleRows,
      options.pendingCommand
    ],
    () => {
      options.scheduleWindowSync();
    }
  );

  watch(options.stagingDrawerState, () => {
    options.scheduleWindowSync();
  });
}

function bindResultWatcher(options: UseLauncherWatchersOptions): void {
  watch(
    () => options.filteredResults.value.length,
    () => {
      options.resultButtons.value = [];
      options.activeIndex.value = 0;
      if (options.drawerRef.value) {
        options.drawerRef.value.scrollTop = 0;
      }
      void nextTick(() => options.ensureActiveResultVisible());
    }
  );
}

function bindPendingCommandWatcher(options: UseLauncherWatchersOptions): void {
  watch(options.pendingCommand, async (value) => {
    if (!value) {
      return;
    }
    await nextTick();
    options.paramInputRef.value?.focus();
    options.paramInputRef.value?.select();
  });
}

export function useLauncherWatchers(options: UseLauncherWatchersOptions): void {
  bindLayoutWatchers(options);
  bindResultWatcher(options);
  bindPendingCommandWatcher(options);
}
```

- [ ] **Step 2: 更新 useLauncherWatcherBindings.ts**

移除 `syncWindowSizeImmediate` 的透传：

```typescript
import type { Ref } from "vue";
import { useLauncherWatchers } from "./useLauncherWatchers";
import type { StagingDrawerState } from "./useStagingQueue";

interface WindowSizingWatcherModule {
  scheduleWindowSync: () => void;
}

interface UseLauncherWatcherBindingsOptions {
  drawerOpen: Ref<boolean>;
  drawerVisibleRows: Ref<number>;
  stagingVisibleRows: Ref<number>;
  pendingCommand: Ref<unknown>;
  stagingDrawerState: Ref<StagingDrawerState>;
  filteredResults: Ref<unknown[]>;
  resultButtons: Ref<Array<HTMLElement | null>>;
  activeIndex: Ref<number>;
  drawerRef: Ref<HTMLElement | null>;
  ensureActiveResultVisible: () => void;
  paramInputRef: Ref<HTMLInputElement | null>;
  windowSizing: WindowSizingWatcherModule;
}

export function useLauncherWatcherBindings(options: UseLauncherWatcherBindingsOptions): void {
  useLauncherWatchers({
    drawerOpen: options.drawerOpen,
    drawerVisibleRows: options.drawerVisibleRows,
    stagingVisibleRows: options.stagingVisibleRows,
    pendingCommand: options.pendingCommand,
    stagingDrawerState: options.stagingDrawerState,
    scheduleWindowSync: options.windowSizing.scheduleWindowSync,
    filteredResults: options.filteredResults,
    resultButtons: options.resultButtons,
    activeIndex: options.activeIndex,
    drawerRef: options.drawerRef,
    ensureActiveResultVisible: options.ensureActiveResultVisible,
    paramInputRef: options.paramInputRef
  });
}
```

- [ ] **Step 3: 提交**

```bash
git add src/composables/launcher/useLauncherWatchers.ts src/composables/launcher/useLauncherWatcherBindings.ts
git commit -m "$(cat <<'EOF'
refactor(watchers): 移除 staging guard 与 syncWindowSizeImmediate 透传

Rust 端智能防抖自动合并连续目标变更，前端不再需要 staging 状态守卫。
watcher 统一使用 scheduleWindowSync（走动画路径）。
EOF
)"
```

---

### Task 12: runtime.ts — 注入新桥接

**Files:**
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts:184-203`

- [ ] **Step 1: 在 useWindowSizing 选项中注入 requestAnimateMainWindowSize**

在 `runtime.ts` 第 189 行 `requestSetMainWindowSize: context.ports.requestSetMainWindowSize,` 之后新增：

```typescript
    requestAnimateMainWindowSize: context.ports.requestAnimateMainWindowSize,
```

- [ ] **Step 2: 确认 TypeScript 编译**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 可能有类型错误（测试文件 mock 尚未更新），但 runtime.ts 本身无错误

- [ ] **Step 3: 提交**

```bash
git add src/composables/app/useAppCompositionRoot/runtime.ts
git commit -m "$(cat <<'EOF'
feat(runtime): 注入 requestAnimateMainWindowSize 到 useWindowSizing
EOF
)"
```

---

## Chunk 3: 测试回归 + 最终验证

### Task 13: tauriBridge.test.ts — 新增桥接测试

**Files:**
- Modify: `src/services/__tests__/tauriBridge.test.ts`

- [ ] **Step 1: 在 import 中新增 requestAnimateMainWindowSize**

在测试文件的 import 列表中（约第 4-14 行），在 `requestSetMainWindowSize` 之后新增 `requestAnimateMainWindowSize`。

- [ ] **Step 2: 新增测试用例**

在现有 `requestSetMainWindowSize` 测试（约第 66 行 `});` 结束处）之后新增：

```typescript
  it("requests animated window resize through invoke bridge", async () => {
    await requestAnimateMainWindowSize(920, 540);
    expect(invoke).toHaveBeenCalledWith("animate_main_window_size", {
      width: 920,
      height: 540
    });
  });
```

- [ ] **Step 3: 运行测试验证**

Run: `npx vitest run src/services/__tests__/tauriBridge.test.ts 2>&1`
Expected: 全部通过

- [ ] **Step 4: 提交**

```bash
git add src/services/__tests__/tauriBridge.test.ts
git commit -m "$(cat <<'EOF'
test(bridge): 新增 requestAnimateMainWindowSize 桥接测试
EOF
)"
```

---

### Task 14: P0 测试更新 — app.failure-events.test.ts

**Files:**
- Modify: `src/__tests__/app.failure-events.test.ts`

> **3 个测试受影响：**
> 1. "falls back to webview setSize when set_main_window_size invoke fails" — 命令名变更
> 2. "skips duplicate window resize command when size has not changed" — 命令名变更
> 3. "schedules debounced sync when resize event fires" — debounce 已移除，需重写

- [ ] **Step 1: 更新 fallback 测试**

找到测试 `"falls back to webview setSize when set_main_window_size invoke fails"`（约第 633-659 行）：

1. 将 mock 中拦截的命令名从 `"set_main_window_size"` 改为 `"animate_main_window_size"`
2. 将断言中的 `getInvokeCommandCallCount("set_main_window_size")` 改为 `getInvokeCommandCallCount("animate_main_window_size")`
3. 更新测试描述为 `"falls back to webview setSize when animate_main_window_size invoke fails"`

> **路径说明：** 此测试通过 `mountApp()` 触发初始 resize，走 `syncWindowSize` → `requestAnimateMainWindowSize` → `animate_main_window_size`。fallback 测试只需覆盖动画路径。即时路径（`syncWindowSizeImmediate` → `set_main_window_size`）由 `onAppFocused` 触发，共享相同的 fallback 逻辑（`syncWindowSizeCore` 中的 catch），无需额外测试。

- [ ] **Step 2: 更新 skip-duplicate 测试**

找到测试 `"skips duplicate window resize command when size has not changed"`（约第 661-685 行）。

> **关键路径分析：**
> - 挂载时 `mountApp()` → `syncWindowSize()` → `requestAnimateMainWindowSize` → `animate_main_window_size`
> - 聚焦时 `window.dispatchEvent("focus")` → `onAppFocused()` → `syncWindowSizeImmediate()` → `requestSetMainWindowSize` → `set_main_window_size`
>
> 但 `syncWindowSizeCore` 中的 `shouldSkipResize` 检查在调用 bridge 之前执行。如果尺寸未变，两条路径**都不会**调用任何 invoke 命令。

更新策略：同时断言两个命令均未新增调用——

```typescript
const animateBefore = getInvokeCommandCallCount("animate_main_window_size");
const immediateBefore = getInvokeCommandCallCount("set_main_window_size");

// ... 触发 focus 事件 ...

const animateAfter = getInvokeCommandCallCount("animate_main_window_size");
const immediateAfter = getInvokeCommandCallCount("set_main_window_size");

expect(animateAfter).toBe(animateBefore);
expect(immediateAfter).toBe(immediateBefore);
```

- [ ] **Step 3: 重写 debounce 测试**

找到测试 `"schedules debounced sync when resize event fires"`（约第 687-711 行）。

此测试验证 72ms setTimeout — 该逻辑已移除。**重写为：**

```typescript
  it("calls sync directly when resize event fires (no debounce)", async () => {
    // ... setup 与之前相同 ...
    // 触发 resize 事件
    window.dispatchEvent(new Event("resize"));
    // 因为 scheduleWindowSync 现在直接调用 syncWindowSize（无 setTimeout），
    // 验证 sync 被直接触发而非 debounced
    await vi.waitFor(() => {
      // 验证 animate_main_window_size 被调用
      expect(getInvokeCommandCallCount("animate_main_window_size")).toBeGreaterThan(0);
    });
  });
```

> 具体实现需根据测试文件的 harness 和 helper 函数调整。关键是：不再断言 `setTimeout` 的调用和 delay 值。

- [ ] **Step 4: 运行受影响测试验证**

Run: `npx vitest run src/__tests__/app.failure-events.test.ts 2>&1`
Expected: 全部通过

- [ ] **Step 5: 提交**

```bash
git add src/__tests__/app.failure-events.test.ts
git commit -m "$(cat <<'EOF'
test(P0): 更新 failure-events 测试适配 animate 命令与移除 debounce
EOF
)"
```

---

### Task 15: P1 测试更新 — useLauncherWatchers.test.ts

**Files:**
- Modify: `src/composables/__tests__/launcher/useLauncherWatchers.test.ts`

> **受影响测试：**
> 1. "handles staging drawer transition watcher branches" — staging watcher 逻辑变化
> 2. "skips layout sync while staging drawer is animating" — **删除**（staging guard 已移除）

- [ ] **Step 1: 重写 staging drawer watcher 测试**

找到 `"handles staging drawer transition watcher branches"`（约第 77-93 行）。

重写为测试简化后的行为：所有 stagingDrawerState 变化都触发 `scheduleWindowSync`：

```typescript
  it("triggers sync on every staging drawer state change", async () => {
    stagingDrawerState.value = "opening";
    await flushPromises();
    expect(scheduleWindowSync).toHaveBeenCalledTimes(1);

    stagingDrawerState.value = "open";
    await flushPromises();
    expect(scheduleWindowSync).toHaveBeenCalledTimes(2);

    stagingDrawerState.value = "closing";
    await flushPromises();
    expect(scheduleWindowSync).toHaveBeenCalledTimes(3);

    stagingDrawerState.value = "closed";
    await flushPromises();
    expect(scheduleWindowSync).toHaveBeenCalledTimes(4);
  });
```

- [ ] **Step 2: 删除 "skips layout sync while staging drawer is animating" 测试**

找到 `"skips layout sync while staging drawer is animating"`（约第 95-114 行）并删除。

- [ ] **Step 3: 移除 harness 中的 syncWindowSizeImmediate**

在测试文件的 harness/setup 中，移除 `syncWindowSizeImmediate` 的 mock 创建和传递（因为 `UseLauncherWatchersOptions` 不再包含此字段）。

> **注意：** Step 1 的重写已覆盖了所有 staging guard 相关的断言变更。现有的 layout watcher 测试如果有单独验证 `stagingDrawerState` 为 `"opening"`/`"closing"` 时跳过 sync 的断言，均应在 Step 1 和 Step 2 中一并处理。无需额外步骤。

- [ ] **Step 4: 运行测试验证**

Run: `npx vitest run src/composables/__tests__/launcher/useLauncherWatchers.test.ts 2>&1`
Expected: 全部通过

- [ ] **Step 5: 提交**

```bash
git add src/composables/__tests__/launcher/useLauncherWatchers.test.ts
git commit -m "$(cat <<'EOF'
test(P1): 更新 watcher 测试适配移除 staging guard 与 syncWindowSizeImmediate
EOF
)"
```

---

### Task 16: P1 测试更新 — useLauncherWatcherBindings.test.ts

**Files:**
- Modify: `src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts`

- [ ] **Step 1: 更新 WindowSizingWatcherModule mock**

找到 `windowSizing` mock 对象（约第 12-15 行），移除 `syncWindowSizeImmediate`：

```typescript
const windowSizing = {
  scheduleWindowSync: vi.fn()
};
```

- [ ] **Step 2: 更新断言**

移除断言 `syncWindowSizeImmediate` 被透传的检查。只保留 `scheduleWindowSync` 的透传验证。

同时移除 `useLauncherWatchers` 调用参数中对 `syncWindowSizeImmediate` 的断言。

- [ ] **Step 3: 运行测试验证**

Run: `npx vitest run src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts 2>&1`
Expected: 全部通过

- [ ] **Step 4: 提交**

```bash
git add src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts
git commit -m "$(cat <<'EOF'
test(P1): 更新 watcherBindings 测试移除 syncWindowSizeImmediate 透传断言
EOF
)"
```

---

### Task 17: P2 测试更新 — useWindowSizing.calculation.test.ts

**Files:**
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 在 createBaseOptions mock 中新增 requestAnimateMainWindowSize**

找到 `createBaseOptions` 函数（约第 42-66 行），在 `requestSetMainWindowSize: async () => {}` 之后新增：

```typescript
    requestAnimateMainWindowSize: async () => {},
```

- [ ] **Step 2: 确认 constants 无需手动修改**

`createBaseOptions` 中的 `constants` 使用的是导入的 `WINDOW_SIZING_CONSTANTS` 对象（非手动 mock）。`windowResizeDebounceMs` 的移除在 Task 9 中已由 `useLauncherLayoutMetrics.ts` 自动生效，此处无需额外操作。

- [ ] **Step 3: 运行测试验证**

Run: `npx vitest run src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts 2>&1`
Expected: 全部通过

- [ ] **Step 4: 提交**

```bash
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "$(cat <<'EOF'
test(P2): calculation test mock 新增 requestAnimateMainWindowSize 并移除 debounce
EOF
)"
```

---

### Task 18: 最终门禁 — npm run check:all

> **P2 文件确认无需修改：** `useAppLifecycle.test.ts` 和 `useAppLifecycleBridge.test.ts` 中 mock 的 `clearResizeTimer` / `windowSizing` 接口均未变化，经交叉验证确认不受影响。`useLauncherLayoutMetrics.test.ts` 中常量和计算不变，不用改。

- [ ] **Step 1: 运行完整门禁**

Run: `npm run check:all 2>&1`
Expected: lint → typecheck → test:coverage → build → check:rust 全部通过

- [ ] **Step 2: 如果有失败**

逐步排查：
1. `npm run lint` — 修复格式/import
2. `npm run typecheck` — 修复类型错误
3. `npm run test:coverage` — 定位失败测试
4. `npm run build` — 确认构建
5. `npm run check:rust` — 确认 Rust 编译 + 测试

- [ ] **Step 3: 全绿后提交（如有修复）**

先 `git status` 确认变更范围，只添加与修复相关的文件：

```bash
git status
git add <具体修复的文件路径>
git commit -m "$(cat <<'EOF'
fix: 修复 check:all 门禁发现的回归问题
EOF
)"
```

- [ ] **Step 4: 确认最终状态**

Run: `git log --oneline -10`
Expected: 看到本次所有提交历史

---

## 手动验收清单（check:all 通过后）

| 场景 | 预期效果 |
|---|---|
| 空搜索框 → 输入关键词出现结果 | 窗口平滑扩展，内容不被裁切 |
| 快速输入 "abcde" | 窗口只在必要时扩展，不频繁抖动 |
| 5 条结果 → 清空搜索框 | 等 300ms 后窗口平滑收缩回初始高度 |
| 打开抽屉 → 关闭抽屉 | 扩展即时平滑，收缩有延迟后平滑 |
| 动画进行中输入新内容 | 从当前位置平滑过渡到新目标，无跳变 |
| 125% / 150% DPI 缩放 | 动画效果与 100% 一致 |
| 拖动窗口期间触发 resize | 不与用户拖拽冲突 |
