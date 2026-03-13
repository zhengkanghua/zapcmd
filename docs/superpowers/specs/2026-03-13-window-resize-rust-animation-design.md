# 窗口尺寸调整优化 — Rust 端缓动动画

> 日期：2026-03-13
> 状态：设计已确认，待实现

## 背景与问题

当前项目的窗口尺寸调整已经通过 Rust `set_main_window_size` 命令实现（非 CSS resize），但存在以下视觉问题：

1. **内容先于窗口渲染** — 搜索结果出来了但窗口还没扩大，产生裁切
2. **频繁伸缩抖动** — 抽屉开关、搜索结果变化导致窗口不停变大变小
3. **延迟感** — 内容变化到窗口跟上有可感知的滞后

根因：前端在 Vue 响应式更新触发时，走 `nextTick → DOM 测量 → Rust set_size` 的流程，中间至少差 1-2 帧，导致内容已渲染但窗口尚未跟上。

## 方案选择

评估了 3 种方案后选择 **方案 A：Rust 端帧步进动画**：

| 方案 | 思路 | 结论 |
|---|---|---|
| A. Rust 端帧步进动画 | 前端只传目标尺寸，Rust spawn 异步任务分帧 ease-out 缓动 | **采用** — 动画在原生线程，不受 JS 主线程影响 |
| B. 时序修正 + 即时 resize | 修正"先渲染后扩窗"的时序，无动画 | 否决 — 不满足平滑过渡需求 |
| C. 混合方案 | Rust 动画 + CSS clip-path 预扩展 | 否决 — 过度工程化 |

## 架构设计

### 1. Rust 端动画引擎

#### 1.1 动画状态管理（Tauri Managed State）

新增 `src-tauri/src/animation.rs`，包含：

```rust
pub struct AnimationController {
    cancel_token: AtomicBool,       // 取消正在进行的动画
    shrink_cancel: AtomicBool,      // 取消收缩延迟计时器
    current_size: Mutex<(f64, f64)>, // 当前窗口实际尺寸（每帧更新）
}
```

通过 `app.manage(AnimationController::new())` 注册到 Tauri managed state。

#### 1.2 新 Tauri 命令

```rust
#[tauri::command]
async fn animate_main_window_size(
    window: WebviewWindow,
    state: State<'_, AnimationController>,
    width: f64,
    height: f64,
) -> Result<(), String>
```

#### 1.3 帧调度

- 帧间隔 ~16ms（≈60fps），使用 `std::thread::sleep` 或 `tokio::time::interval`
- 总时长 120ms，约 7-8 帧
- 缓动函数：`ease_out_cubic(t) = 1 - (1 - t)^3`
- 每帧计算插值尺寸后调用 `window.set_size(LogicalSize)`
- 动画结束后精确设置最终目标尺寸（消除浮点误差）

#### 1.4 动画中断

- 每帧检查 `cancel_token: AtomicBool`，为 true 则退出循环
- 新目标到达时从当前实际尺寸启动新动画，取消旧动画几乎零开销

### 2. 智能防抖策略：扩展即时，收缩延迟

**核心原则**：窗口变大立即响应，窗口变小等 300ms 再动。

决策逻辑（每次前端调用 `animate_main_window_size` 时）：

```
新目标到达:
  ├─ 目标高度 > 当前高度 (扩展)?
  │   ├─ 取消收缩延迟计时器（如果有）
  │   ├─ 取消正在进行的动画（如果有）
  │   └─ 从 current_size 立即启动新动画 → 目标
  │
  └─ 目标高度 < 当前高度 (收缩)?
      ├─ 取消正在进行的动画（如果有，记录停止位置为 current_size）
      └─ 启动/重置 300ms 收缩延迟计时器
          └─ 300ms 后仍无新目标 → 从 current_size 启动收缩动画
```

快速输入场景推演：

```
用户输入 "test":

t=0ms   输入 "t" → 8条结果 → 扩展! 立即动画 124→476px
t=80ms  输入 "te" → 3条结果 → 收缩? 启动300ms计时器
          (动画仍在进行中, 当前约 320px, 取消动画, 记录 320px)
t=150ms 输入 "tes" → 5条结果 → 扩展! 目标(344px) > 当前(320px)
          取消收缩计时器, 从 320px 动画到 344px
t=220ms 输入 "test" → 2条结果 → 收缩? 启动300ms计时器
          (动画可能还在, 当前约 338px, 取消动画, 记录 338px)
t=520ms 计时器到期, 用户已停止输入 → 从 338px 平滑收缩到 212px
```

### 3. 前端改造

#### 3.1 tauriBridge.ts — 新增桥接

```typescript
export async function requestAnimateMainWindowSize(
  width: number, height: number
): Promise<void> {
  await invoke("animate_main_window_size", { width, height });
}
// 旧的 requestSetMainWindowSize 保留，用于初始化/聚焦校准等即时跳转场景
```

#### 3.2 controller.ts — 简化

- `syncWindowSize` 中改调 `requestAnimateMainWindowSize`
- 移除前端侧 72ms debounce（`WINDOW_RESIZE_DEBOUNCE_MS`），防抖已在 Rust 端
- `scheduleWindowSync` 改为直接调用 `syncWindowSize`
- `syncWindowSizeImmediate` 保持不变，仍调用旧的 `requestSetMainWindowSize`

#### 3.3 useLauncherWatchers.ts — 简化

移除 staging 动画期间跳过 sync 的 guard 逻辑（`opening`/`closing` 状态判断），Rust 端动画会自动合并快速连续的目标变更。

#### 3.4 不变的部分

- `calculation.ts` — 尺寸计算逻辑完全不变
- `useLauncherLayoutMetrics.ts` — 所有常量和计算属性不变
- `model.ts` — 接口定义仅新增 `requestAnimateMainWindowSize` 到 ports
- 现有 fallback（Tauri JS API）保留

### 4. 文件组织

```
src-tauri/src/
  ├── animation.rs    // 新增：AnimationController + 缓动函数 + 帧循环
  ├── windowing.rs    // 现有：保留 set_main_window_size，新增 animate 命令注册
  ├── bounds.rs       // 不变
  └── lib.rs          // 注册新命令 + managed state

src/
  ├── services/tauriBridge.ts           // 新增 requestAnimateMainWindowSize
  ├── composables/launcher/
  │   ├── useWindowSizing/controller.ts // 移除 debounce，改调新命令
  │   ├── useWindowSizing/model.ts      // 接口新增字段
  │   └── useLauncherWatchers.ts        // 移除 staging guard
  └── composables/app/
      └── useAppCompositionRoot/runtime.ts // 注入新桥接函数
```

## 边界情况与容错

| 场景 | 处理方式 |
|---|---|
| 动画中用户拖动窗口 | 动画开始时记录位置，过程中只改大小不管位置，结束后校准一次 |
| 窗口最小/最大尺寸 | 前端 `resolveWindowSize` 已做 clamp，Rust 保留 320x124 硬底线 |
| 高 DPI / 多显示器 | 使用 LogicalSize，不受 DPI 缩放影响 |
| 动画中应用退出 | Tokio runtime 自动终止任务，无资源泄漏 |
| IPC 调用失败 | 前端 fallback 到 `appWindow.setSize(new LogicalSize(...))` 即时跳转 |
| 1ms 内连续 10 个目标 | 每次取消旧动画，只有最后一个目标执行动画 |

## 测试策略

### Rust 端单元测试（新增）

- `ease_out_cubic(t)` 缓动函数：验证 t=0→0, t=1→1, t=0.5→预期值
- 扩展/收缩判断逻辑：验证走"立即动画"还是"300ms 延迟"分支
- 动画中断逻辑：模拟连续发送多个目标，验证只有最后一个生效

### 前端单元测试（更新现有）

- `resolveWindowSize` 计算结果不变，确保改造后仍被正确调用
- `syncWindowSize` 调用新的 `requestAnimateMainWindowSize`
- 移除 debounce 后 watch 触发时直接调用 sync

### 受影响的现有测试回归处理

#### P0 — 必须更新

| 文件 | 影响的用例 | 处理方式 |
|---|---|---|
| `src/__tests__/app.failure-events.test.ts` | "Rust 命令失败时 fallback" | 改为测试 `animate_main_window_size` 的 fallback |
| 同上 | "尺寸没变时不重复调用" | 调用函数名变更 |
| 同上 | "resize 事件触发 72ms debounce" | **删除或重写** — debounce 已移除 |
| `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts` | mock 对象 | 补充 `requestAnimateMainWindowSize` 字段 |

#### P1 — 很可能需要更新

| 文件 | 影响的用例 | 处理方式 |
|---|---|---|
| `src/services/__tests__/tauriBridge.test.ts` | — | 新增 `requestAnimateMainWindowSize` 调用测试 |
| `src/composables/__tests__/launcher/useLauncherWatchers.test.ts` | "staging 动画期间跳过 sync" | **删除** — 该逻辑已移除 |
| 同上 | "staging opening 时立即同步" | 保留，可能需调整预期 |
| `src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts` | 接口绑定验证 | 如方法名不变则不用改 |

#### P2 — 视接口变更而定

| 文件 | 条件 |
|---|---|
| `useAppLifecycle.test.ts` | `clearResizeTimer` 名称不变则不用改 |
| `useAppLifecycleBridge.test.ts` | `windowSizing` 接口不变则不用改 |
| `useLauncherLayoutMetrics.test.ts` | 常量和计算不变，不用改 |

#### P3 — 基本不用改

| 文件 | 原因 |
|---|---|
| `app.core-path-regression.test.ts` | 仅 mock 了 setSizeSpy，不直接测 resize |
| `bounds/tests_logic.rs` | 测试窗口位置非尺寸 |
| `scripts/e2e/desktop-smoke.cjs` | 冒烟测试不直接验证 resize |

### 手动验收测试

| 场景 | 预期效果 |
|---|---|
| 空搜索框 → 输入关键词出现结果 | 窗口平滑扩展，内容不被裁切 |
| 快速输入 "abcde" | 窗口只在必要时扩展，不频繁抖动 |
| 5 条结果 → 清空搜索框 | 等 300ms 后窗口平滑收缩回初始高度 |
| 打开抽屉 → 关闭抽屉 | 扩展即时平滑，收缩有延迟后平滑 |
| 动画进行中输入新内容 | 从当前位置平滑过渡到新目标，无跳变 |
| 125% / 150% DPI 缩放 | 动画效果与 100% 一致 |
| 拖动窗口期间触发 resize | 不与用户拖拽冲突 |

### 回归保护门禁

所有改动完成后必须通过 `npm run check:all`（lint → typecheck → test:coverage → build → check:rust）。
