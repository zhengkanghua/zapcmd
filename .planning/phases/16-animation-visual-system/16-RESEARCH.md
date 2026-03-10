# Phase 16: 动画与视觉系统落地 - Research

**Researched:** 2026-03-10  
**Domain:** Launcher（Vue + Tauri）动效与视觉令牌（品牌/成功分离）+ Windows resize 稳定性  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

## Implementation Decisions

### 配色与令牌基线（品牌/状态分离）

- 主窗口配色基线采用 `docs/ui-redesign/04-design-system.md` 的 **方案 Beta：Graphite Cyan**（背景保持暗色）。
- Beta 关键令牌（用于落地时对齐）：`bg.app=#0A1015`、`bg.surface=#111922`、`brand.primary=#4CC9F0`、`brand.soft=rgba(76, 201, 240, 0.16)`、`danger=#FB7185`。
- `brand.primary`：先使用 Beta 方案的推荐值落地；与 logo 是否完全一致后续再微调（但品牌主色不允许回到绿色）。
- 交互激活态（搜索输入 focus / 结果选中 / Queue Summary Pill）**统一使用品牌色**，不使用 success 色。
- `success` 色值：**Claude’s Discretion**（选择“克制、低噪音、与品牌色区分”的 success 色即可）。

### Review 开合动效（克制、专业）

- 打开顺序：**dim 先出现 → Review 面板滑入**。
- 关闭顺序：**Review 面板先滑出 → dim 再消失**。
- 动效节奏：整体约 `200ms`；不做弹跳、不做夸张位移、不做 scale 抖动。

### Resize 同步感与 Windows 降级

- 体验目标：开合时尽量保持“resize 与动效同步感”（不做明显的“先变大/再滑入”分段感）。
- Windows 策略：先实现正常模式；若出现“抖动明显”（窗口边界在开合期间肉眼可见反复跳动/闪烁），则启用降级：
  - **一次性 resize 到目标尺寸 + 内部动画**（避免动画期间反复 resize）。

### 透明度与表面层级（低噪音）

- 主窗口默认透明度从 `0.92` 提升到 **`0.96`**，以降低背景噪音并更接近“专业面板”观感。
- 设置中透明度可调范围保持 **`0.2 ~ 1.0`**（不限制用户，只调整默认值与视觉基线）。
- 默认壁纸存在感：**尽量弱，只保留轻度氛围**。
- 层级差：**Review 面板高一阶**（更实/更有阴影/边框更强），Search 主面板更克制。

### Claude's Discretion

- `success` 具体色值（在不与品牌色混淆、且不回到“绿色=品牌”的前提下选择）。
- Review 开合 easing、位移幅度、dim 具体 alpha（需满足“克制、低噪音、层级清晰”）。
- Beta 方案未显式列出的 token（text/border/shadow 等）如何补齐与落位。

### Deferred Ideas (OUT OF SCOPE)

## Deferred Ideas

- 进一步把 `brand.primary` 与 logo 主色做最终对齐（需要先明确 logo 主色是否与 Beta 一致）。
- 提供显式的 Windows“强制降级动效”设置开关（如后续确有需求，再单开范围）。
- `settings` 窗口的视觉系统升级（独立专题，不纳入本 Phase）。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SIZE-03 | Review 打开/关闭涉及窗口 resize 时在 Windows 下稳定可用（允许采用“先稳定尺寸再动画”的策略，并保留降级路径） | 现有 resize 链路集中在 `src/composables/launcher/useWindowSizing/*`：`useLauncherWatchers.ts` 在 `stagingDrawerState=opening` 时触发 `syncWindowSizeImmediate()`，并在 opening/closing 阶段跳过布局触发的 resize（避免动画期间反复 resize）。动效需使用 CSS transform/opacity（避免布局抖动），并把 `STAGING_TRANSITION_MS` 与动画时长对齐（建议 ~200ms）。Window 侧最终落在 `src-tauri/src/windowing.rs#set_main_window_size`（保持 pos 不漂移）。 |
| VIS-01 | 主窗口采用新的颜色令牌：品牌色与成功色彻底分离，且绿色不再作为品牌主色 | 视觉 token 落点以 `src/styles.css` 为主：当前主窗口大量使用 `rgba(55, 204, 138, …)`（绿色）作为激活/选中/主按钮/焦点描边，需要统一替换为 `brand.primary=#4CC9F0`（Beta Graphite Cyan），并提供独立 `success`（仅用于成功/启用语义，如 `.execution-feedback--success`）。重点落点：`.queue-summary-pill`、`.result-item--active/:focus-visible`、`.btn-primary`、输入/按钮 focus ring 等。 |
| VIS-02 | 主窗口透明度与背景噪音降低，整体观感符合“专业桌面工具面板”气质（符合 `docs/ui-redesign/04`/`11` 基线） | 透明度默认值存于 `src/stores/settings/defaults.ts#DEFAULT_WINDOW_OPACITY`（目前为 0.92），并由 `src/composables/app/useAppCompositionRoot/context.ts` 写入 `--ui-opacity`。需把默认提升到 0.96 并保持范围 `0.2~1.0`；同时在 `src/styles.css` 对齐默认 `--ui-opacity`（避免启动瞬间 FOUC）。低噪音落位参照 `docs/ui-redesign/04-design-system.md` 与 `11-b4-visual-spec.md`：减少“壁纸可读性”、提升表面实度，并让 Review 面板使用更高层 surface（更实/更强边框/更强阴影）。 |
</phase_requirements>

## Standard Stack (HIGH)

- Vue `3.5.22` + TypeScript `5.9.x`（组件/状态/props）
- Pinia `3.0.x`（设置与运行态）
- TailwindCSS `3.4.x` + 手写全局 CSS（`src/styles.css`）
- Vite `7.x`（构建）
- Vitest `3.x` + Vue Test Utils `2.4.0`（单测/回归）
- Tauri `2.8.x`（窗口层：透明、resize、拖拽区）

## Architecture Patterns (HIGH)

1. **视觉令牌集中在全局 CSS 变量**  
   - `src/styles.css` 的 `:root` 定义 `--ui-*` 变量；主窗口与 overlay 大量依赖这些变量。  
   - `src/composables/launcher/useLauncherLayoutMetrics.ts` 负责计算并注入 shell 层的 CSS 变量（如 `--review-width`、`--shell-gap`）。

2. **Review 开合状态机由 `StagingDrawerState` 驱动（CSS class 绑定）**  
   - 状态：`closed/opening/open/closing`（`src/composables/launcher/useStagingQueue/model.ts`）。  
   - 计时切换：`src/composables/launcher/useStagingQueue/drawer.ts` 以 `transitionMs` 为准。  
   - Overlay 已绑定 `review-overlay--${stagingDrawerState}`（`src/components/launcher/parts/LauncherReviewOverlay.vue`），适合直接用 CSS 动画实现“dim→滑入 / 滑出→去 dim”。

3. **窗口尺寸同步统一从 watcher → windowSizing 入口收口**  
   - `src/composables/launcher/useLauncherWatchers.ts`：opening 立即 sync；open/closed 触发 debounced sync；opening/closing 阶段跳过“布局变化触发 resize”。  
   - `src/composables/launcher/useWindowSizing/controller.ts`：`nextTick()` 后测量、debounce，并通过 Tauri command 进行 resize（失败才 fallback 到 `appWindow.setSize`）。  
   - `src-tauri/src/windowing.rs#set_main_window_size`：应用 size 后恢复之前 position（降低 resize 造成的跳位）。

## Don't Hand-Roll（优先复用/扩展现有能力）

- 不引入动画库：用现有的 `stagingDrawerState` + CSS keyframes/transition 实现即可。
- 不做“动画期间反复 resize”：按既有 watcher 策略，保持“一次性 resize + 内部动画”。
- 不新增 Windows 强制降级设置开关（已明确 deferred）。

## Common Pitfalls (MEDIUM)

1. **动画与 resize 时长不对齐**：`transitionMs` 与 CSS 动画时长不一致会导致“closing 时 overlay 提前卸载”或“open 时过早触发第二次 resize”。  
2. **用影响布局的属性做动效**：动效尽量只动 `opacity/transform`，避免 `width/left/right` 等导致布局重算，从而触发额外测量/resize。  
3. **忘记区分 brand 与 success**：交互激活态（focus/selected/pill）必须只用品牌色；success 只能用于成功/启用语义（如执行成功反馈）。  
4. **Review 层级未提升**：目前 `.search-main/.review-panel` 共用同一组 `background/border/shadow` 规则，需要把 Review 面板抬高一阶（更强 border/shadow）才能符合 B4 视觉规格。

## Code Examples (repo-local)

### 1) Review 状态切换与卸载时机

- `src/composables/launcher/useStagingQueue/drawer.ts`：`opening → open`、`closing → closed` 均由 `transitionMs` 定时完成。  
- `src/components/launcher/LauncherWindow.vue`：`v-if="stagingExpanded"`（opening/open/closing 都为 true）保证 closing 动画有时间播放。

### 2) Window resize 调度（避免动画期抖动的关键护栏）

- `src/composables/launcher/useLauncherWatchers.ts`：opening/closing 时跳过 layout watcher 的 `scheduleWindowSync()`；opening 时 `syncWindowSizeImmediate()`。  
- `src/composables/launcher/useWindowSizing/controller.ts`：debounce + `shouldSkipResize`（epsilon）减少重复 set_size。

### 3) 视觉令牌/激活态落点（当前大量绿色 hardcode 的聚集区）

- `src/styles.css`：`.queue-summary-pill`、`.result-item--active/:focus-visible`、`.btn-primary`、`@keyframes staged-feedback`。

## Sources (repo-local)

### Primary (HIGH confidence)
- `docs/ui-redesign/04-design-system.md`（品牌与状态分离 + Beta Graphite Cyan tokens）
- `docs/ui-redesign/11-b4-visual-spec.md`（dim/overlay/动效与层级基线）
- `src/styles.css`
- `src/components/launcher/parts/LauncherReviewOverlay.vue`
- `src/composables/launcher/useStagingQueue/*`
- `src/composables/launcher/useLauncherWatchers.ts`
- `src/composables/launcher/useWindowSizing/*`
- `src-tauri/src/windowing.rs`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH（版本与链路清晰）
- Architecture: HIGH（state → watcher → resize → tauri command 结构明确）
- Visual tuning: MEDIUM（主要风险在“token 落位范围”与“低噪音主观度”）
- Windows resize stability: MEDIUM（代码护栏存在，但仍需真实 UI smoke 观察是否有抖动）

