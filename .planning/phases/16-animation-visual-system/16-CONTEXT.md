# Phase 16: 动画与视觉系统落地 - Context

**Gathered:** 2026-03-09  
**Status:** Ready for planning

<domain>
## Phase Boundary

本 Phase 交付：

- **主窗口（launcher）视觉系统落地**：在“已存在 logo、背景暗色已定”的前提下，落地颜色令牌与层级基线；品牌色与 success 色彻底分离，绿色不再作为品牌主色。
- **透明度与低噪音基线**：默认更“实”的专业桌面工具面板观感（壁纸只保留轻度氛围），并保持用户可在 settings 中调节透明度。
- **Review 开合动效**：按 B4 视觉规格落地克制动效（dim → 面板滑入；面板滑出 → dim 消失），时长约 `200ms`。
- **Windows resize 稳定性与降级策略**：优先追求“同步感”的开合体验；若 Windows 下出现动态 resize 抖动明显，则降级为“一次性 resize + 内部动画”，保持体验稳定可用。

本 Phase 不交付：

- `settings` 窗口的整体视觉重构或并入（仍保持独立窗口，不纳入本轮主窗口重构）
- 超出 ROADMAP 范围的新能力（搜索/队列/执行逻辑不扩展）
- 纯为风格统一而进行的“全仓库搬家式”样式重构（仅做与主窗口动效/令牌落地直接相关的最小改动）

</domain>

<decisions>
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

</decisions>

<specifics>
## Specific Ideas

- Logo 已有，无需新增或重做。
- 背景色已确定为暗色基线。
- 视觉与动效基线参考：
  - `docs/ui-redesign/04-design-system.md`
  - `docs/ui-redesign/11-b4-visual-spec.md`

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- 全局样式与现有 `--ui-*` 变量：`src/styles.css`
- 透明度设置与 CSS 变量绑定：`src/composables/app/useAppCompositionRoot/context.ts`（写入 `--ui-opacity`）
- 透明度默认值与范围：`src/stores/settings/defaults.ts`
- Review Overlay 结构与交互：`src/components/launcher/parts/LauncherReviewOverlay.vue`
- Search/Review 挂载与壳层：`src/components/launcher/LauncherWindow.vue`
- B4 视觉与令牌参考文档：`docs/ui-redesign/04-design-system.md`、`docs/ui-redesign/11-b4-visual-spec.md`

### Established Patterns

- 窗口 sizing 口径复用 CSS 变量（如 `--review-width`）：`src/composables/launcher/useWindowSizing/calculation.ts`
- resize 调度与 debounce：`src/composables/launcher/useWindowSizing/controller.ts`
- `stagingDrawerState` 已用于 opening/closing 动画类名（可作为 Review 动效落地的状态信号）

### Integration Points

- 主窗口透明窗口配置：`src-tauri/tauri.conf.json`（`transparent: true`）
- 主窗口 resize 指令：`src-tauri/src/windowing.rs`（`set_main_window_size`）

</code_context>

<deferred>
## Deferred Ideas

- 进一步把 `brand.primary` 与 logo 主色做最终对齐（需要先明确 logo 主色是否与 Beta 一致）。
- 提供显式的 Windows“强制降级动效”设置开关（如后续确有需求，再单开范围）。
- `settings` 窗口的视觉系统升级（独立专题，不纳入本 Phase）。

</deferred>

---

*Phase: 16-animation-visual-system*  
*Context gathered: 2026-03-09*
