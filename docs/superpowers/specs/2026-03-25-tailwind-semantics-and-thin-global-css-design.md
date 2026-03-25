# Tailwind 语义化与全局 CSS 瘦身设计稿（Phase 6+）

> **日期**：2026-03-25  
> **状态**：Draft（已讨论通过，待落盘实现计划后执行）  
> **范围**：仅在开发分支试验（不直接合并到 `main`）  
> **分支**：`feat/tailwind-primitives-migration`

## 0. 背景（Why）

当前分支已完成“窗口级 CSS 清理”（Settings/Launcher/animations/shared 等旧 CSS 已删除）并收敛到极简白名单：

- `reset/themes/tokens`：多主题与语义 token（设计系统层）
- `tailwind.css`：Tailwind 入口 + 少量全局例外（行为/兼容/无障碍）
- 组件 `<style>`：仅保留 `SSlider` 的伪元素 thumb（技术例外）

迁移后最大的维护问题从“CSS 文件杂乱”转为：

1) 模板里存在较多 `animate-[...]` / `grid-rows-[...]` / `place-items-[...]` 等 **arbitrary**，可读性与一致性不足。  
2) `src/styles/tailwind.css` 仍包含大量 `@keyframes` 与少量过渡选择器（例如 `.nav-slide-*`），全局 CSS 仍可进一步变薄。

本设计稿目标是在不破坏“tokens 多主题体系”的前提下，把 Tailwind 的“框架感”补齐：**更语义、更可读、更少全局 CSS**。

---

## 1. 目标与非目标（Goals / Non-goals）

### 1.1 目标（Goals）

1) **动画语义化**：将现有 `@keyframes`/`animate-[...]` 收口为可读的语义类（例如 `animate-toast-slide-down`），减少模板中的长串 arbitrary。  
2) **全局 CSS 更薄**：`tailwind.css` 尽量只保留“全局行为/极少例外”，减少“可被配置/可被模板表达”的内容。  
3) **布局 arbitrary 收口（高价值优先）**：将关键 layout template（`grid-rows/cols`）通过 Tailwind config 命名化；能用标准 utilities 替代的 arbitrary 直接替代。  
4) **维持现有主题框架**：保留 `themes/* + tokens.css`；组件仍只消费 `--ui-*`（不引入第二套 palette）。  
5) **视觉零差异**：不借机做 UI 重设计，所有改动以现有门禁为验收口径。

### 1.2 非目标（Non-goals）

- 不启用 Tailwind preflight（保持 `corePlugins.preflight = false`）。
- 不追求消灭所有 arbitrary（例如大量 `p-[12px_16px]`），只收口“高复用/高风险/高噪音”的部分。
- 不新增第二套主题或颜色系统；仍由 `themes/*` 定义源值，`tokens.css` 负责语义映射。

---

## 2. 方案对比（Approaches）

### 方案 1（推荐）：把“可配置的”迁到 `tailwind.config.cjs`

- `@keyframes` → `theme.extend.keyframes`
- `animation` → `theme.extend.animation`
- 关键 `gridTemplateRows/Columns` → `theme.extend.gridTemplateRows/Columns`
- 模板改用具名 class（`animate-*` / `grid-rows-*` / `grid-cols-*`）

优点：全局 CSS 变薄；模板更语义；能做统一命名与治理。  
缺点：`tailwind.config.cjs` 会变大，需要控制命名规模与抽象边界。

### 方案 2：继续保留 `tailwind.css` 的 keyframes，但提供语义 utilities

优点：配置文件更轻。  
缺点：`tailwind.css` 仍偏厚，长期容易变成“新 shared.css”。

### 方案 3：抽更多 Vue 原语组件承载 class 组合

优点：模板更干净，语义更强。  
缺点：改动面大、迭代成本高，本轮不需要。

**结论：采用方案 1。**

---

## 3. 设计（Design）

### 3.1 A：动画语义化（先做）

#### 3.1.1 迁移动机

当前模板存在多处 `animate-[<keyframes>_<duration>_<easing>_both]`，可读性差且不利于统一 reduced-motion 策略。  
我们把动画“从字符串”升级为“命名能力”，让维护更像框架，而不是拼装。

#### 3.1.2 迁移范围

迁移前必须先做一次 **使用清单（inventory）**，避免把“未使用/遗留”的 keyframes 搬进 config 导致膨胀：

- 先用 `rg -n "animate-\\[" src` 列出模板侧所有 `animate-[...]` 实际引用。
- 再用 `rg -n "@keyframes" src/styles/tailwind.css` 列出 `tailwind.css` 当前 keyframes 定义。
- 对“计划删除的 keyframes 名称”额外做一次全仓检索（例如 `rg -n "<keyframe-name>" src`），避免遗漏非 `animate-[...]` 的引用路径。
- **只迁移“被引用”的 keyframes**；未被引用的 keyframes 视为疑似 dead code：不迁移到 config，优先在同一批次中删除（以门禁验证无回归）。

本批次的目标是：**`tailwind.css` 不再持有任何 `@keyframes`**（全部由 `tailwind.config.cjs` 生成，或被确认未使用并删除）。

把 `src/styles/tailwind.css` 中“被引用”的 keyframes 迁到 `tailwind.config.cjs`（见下表）：

- `toast-slide-down`
- `staged-feedback`
- `review-overlay-*`（scrim/panel in/out）
- `staging-panel-enter / staging-panel-exit`
- `fade-in`
- `dialog-scale-in`

并在 config 中为每个 **“使用变体”（duration/easing/fill-mode）** 定义对应 `animation` 名称，模板改用具名 class：

- 新 class 命名约定：`animate-launcher-<keyframe-or-scenario>`（为未来 Settings/其他窗口预留命名空间）。

**零差异硬约束（必须）**：

- 每个 `animation` 的 `duration/easing/fill-mode` 必须与当前 `animate-[...]` 完全一致。  
- 如果同一个 keyframe 在代码中存在多组参数：必须拆成多个语义 animation 名称，**禁止**为了“统一”而改动参数（例如强行补 `both`）。

#### 3.1.2.1 动画迁移对照表（基于当前代码实际引用）

> 说明：该表是 Phase A 的执行基线；实现时以 `rg -n "animate-\\[" src` 的结果为准更新。

| 场景 | 当前引用位置 | 现有 `animate-[...]` | 参数（保持不变） | 新语义 class（建议） | reduced-motion（建议） | 验证 |
| --- | --- | --- | --- | --- | --- | --- |
| 执行反馈 Toast 下滑 | `src/components/launcher/parts/LauncherCommandPanel.vue`、`LauncherSearchPanel.vue`、`LauncherFlowPanel.vue` | `animate-[toast-slide-down_350ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]` | `350ms` + `cubic-bezier(0.175,0.885,0.32,1.15)` + `both` | `animate-launcher-toast-slide-down` | `motion-reduce:animate-none` | `npm run test:flow:launcher` |
| 搜索结果 staged feedback | `src/components/launcher/parts/LauncherSearchPanel.vue` | `animate-[staged-feedback_220ms_ease]` | `220ms` + `ease` + **无 fill-mode** | `animate-launcher-staged-feedback` | `motion-reduce:animate-none` | `npm run test:flow:launcher` |
| StagingPanel 入场 | `src/components/launcher/parts/LauncherStagingPanel.vue` | `animate-[staging-panel-enter_300ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]` | `300ms` + `cubic-bezier(0.175,0.885,0.32,1.15)` + `both` | `animate-launcher-staging-panel-enter` | `motion-reduce:animate-none` | `npm run test:contract:styles` |
| StagingPanel 退场 | `src/components/launcher/parts/LauncherStagingPanel.vue` | `animate-[staging-panel-exit_200ms_ease-in_both]` | `200ms` + `ease-in` + `both` | `animate-launcher-staging-panel-exit` | `motion-reduce:animate-none` | `npm run test:contract:styles` |
| SafetyOverlay 遮罩淡入 | `src/components/launcher/parts/LauncherSafetyOverlay.vue` | `animate-[fade-in_200ms_ease-out_both]` | `200ms` + `ease-out` + `both` | `animate-launcher-fade-in` | `motion-reduce:animate-none` | `npm run test:flow:launcher` |
| SafetyDialog 弹窗缩放进入 | `src/components/launcher/parts/LauncherSafetyOverlay.vue` | `animate-[dialog-scale-in_300ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]` | `300ms` + `cubic-bezier(0.175,0.885,0.32,1.15)` + `both` | `animate-launcher-dialog-scale-in` | `motion-reduce:animate-none` | `npm run test:flow:launcher` |
| ReviewOverlay scrim in/out | `src/components/launcher/parts/LauncherFlowPanel.vue` | `animate-[review-overlay-scrim-in_200ms_ease-out_both]` / `animate-[review-overlay-scrim-out_200ms_ease-in_both]` | `200ms` + `ease-out/ease-in` + `both` | `animate-launcher-review-overlay-scrim-in` / `animate-launcher-review-overlay-scrim-out` | `motion-reduce:animate-none` | `npm run test:flow:launcher` |
| ReviewOverlay panel in/out | `src/components/launcher/parts/LauncherFlowPanel.vue` | `animate-[review-overlay-panel-in_300ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]` / `animate-[review-overlay-panel-out_200ms_ease-in_both]` | `300ms/200ms` + `cubic-bezier/ease-in` + `both` | `animate-launcher-review-overlay-panel-in` / `animate-launcher-review-overlay-panel-out` | `motion-reduce:animate-none` | `npm run test:flow:launcher` |

#### 3.1.3 reduced-motion 策略

优先在动画触发点增加 `motion-reduce:animate-none`（必要时 `motion-reduce:transition-none`），降低对全局选择器的依赖。  
若存在“仅靠状态类才能覆盖”的历史行为，再考虑保留最小全局兜底（仍集中在 `tailwind.css`）。

#### 3.1.4 验收口径

- `src/**` 中不再出现 `animate-[`（grep 为 0）。
- `src/styles/tailwind.css` 不再包含任何 `@keyframes` 定义（只保留 Tailwind 指令与少量全局行为/工具类）。
- 建议加入可量化门禁：
  - `rg "animate-\\[" src` 结果为 0
  - `rg "@keyframes" src/styles/tailwind.css` 结果为 0

---

### 3.2 A2：Transition `nav-slide` 去全局 CSS（仍属于 A）

当前 `LauncherWindow` 使用 `<Transition name="nav-slide">`，因此必须在全局 CSS 中保留 `.nav-slide-*`。  
改为显式 class：

- `enter-active-class` / `enter-from-class` / `enter-to-class`
- `leave-active-class` / `leave-from-class` / `leave-to-class`

#### 3.2.1 零差异参数约束（必须）

现有 CSS 的零差异口径如下（来自 `src/styles/tailwind.css`）：

- enter：`transition: transform 250ms cubic-bezier(0.175,0.885,0.32,1.15)`
- leave：`transition: transform 200ms ease-in`
- enter-from / leave-to：`transform: translateX(100%)`

#### 3.2.2 落地方式（定案：扩展 Tailwind config，避免 arbitrary）

为避免再次引入 `duration-[250ms]`/`ease-[cubic-bezier(...)]` 的 arbitrary，建议在 `tailwind.config.cjs` 扩展：

- `theme.extend.transitionDuration`：补齐 `250: "250ms"`（`duration-250`）
- `theme.extend.transitionTimingFunction`：补齐 `nav-slide: "cubic-bezier(0.175,0.885,0.32,1.15)"`（`ease-nav-slide`）

然后在 `LauncherWindow` 的 `<Transition>` 上显式声明 6 个 class，并在 active-class 中加入 reduced-motion 兜底（建议写入 `enter-active-class/leave-active-class`）：

- enter active：`transition-transform duration-250 ease-nav-slide motion-reduce:transition-none`
- enter from/to：`translate-x-full` → `translate-x-0`
- leave active：`transition-transform duration-200 ease-in motion-reduce:transition-none`
- leave from/to：`translate-x-0` → `translate-x-full`

从而可以删掉 `tailwind.css` 中 `.nav-slide-*` 与其 reduced-motion 分支。

验收口径：
- `src/styles/tailwind.css` 中不再出现 `.nav-slide-*`。
- Launcher 过渡仍保持零差异（以既有 flow/contract 门禁验证）。
- 建议加入可量化门禁：
  - `rg "nav-slide-" src/styles/tailwind.css` 结果为 0

---

### 3.3 B：布局 arbitrary 收口（后做，且只做高价值部分）

#### 3.3.1 直接替代（不需要 config）

优先把“可分解为标准 utilities”的 arbitrary 改掉，例如：

- `place-items-[start_center]` → `items-start justify-items-center`

#### 3.3.2 关键 template 命名化（通过 config）

对高复用、且容易影响结构/滚动 contract 的 template，落到 `tailwind.config.cjs`：

- `grid-rows-launcher-panel`：`auto minmax(0, 1fr) auto`（用于 CommandPanel/FlowPanel）
- `grid-rows-settings-window`：`52px minmax(0, 1fr)`（用于 SettingsWindow）
- `grid-rows-launcher-panel-header`：`auto auto`（用于 panel header）
- （可选）`grid-rows-launcher-shell`：`var(--ui-top-align-offset) auto`
- （可选）`grid-cols-launcher-shell`：`var(--search-main-width) var(--staging-collapsed-width)`

并同步更新 `src/styles/__tests__/launcher-style-contract.test.ts` 的 class contract 断言，使其从 `grid-rows-[...]` 转为 `grid-rows-launcher-panel` / `grid-rows-settings-window` 等语义类。

验收口径：
- 关键文件中 `grid-rows-[auto_minmax(0,1fr)_auto]` 等高噪音 arbitrary 减少/消失。
- contract tests 仍能表达“结构约束”，且更可读。

---

### 3.4 `tailwind.css` 职责白名单与禁止项（DoD）

为了避免 `tailwind.css` 再次膨胀为“新 shared.css”，定义其职责边界（以可验证为准）：

#### 3.4.1 允许（Allowed）

- Tailwind 入口与扫描声明（`@source` / `@tailwind`）。
- **无法由模板 class 表达的全局行为选择器**：例如 `[data-tauri-drag-region]`（窗口拖拽行为）。
- 极少量“工具类原语”（`@layer utilities`）：例如 `.scrollbar-none`、`.rounded-control` 等。

#### 3.4.2 禁止（Banned，Phase A 完成后生效）

- `@keyframes`（必须为 0；动画由 `tailwind.config.cjs` 生成或确认未使用并删除）。
- 任何 `*.nav-slide-*` 或其他 Transition 选择器（Transition 一律用 `<Transition ...-class>` 落到模板）。

#### 3.4.3 可量化检查（建议写入 Plan 的验证步骤）

- `rg "@keyframes" src/styles/tailwind.css` 结果为 0
- `rg "nav-slide-" src/styles/tailwind.css` 结果为 0
- （可选）`rg "-enter-active|-leave-active|-enter-from|-leave-to" src/styles/tailwind.css` 结果为 0（或仅匹配白名单）

## 4. 风险与对策（Risks）

1) **Tailwind 扫描漏抓（动态 class 拼接）**  
   - 对策：animation/layout 统一改成静态 class；保持 class 字符串字面量可被扫描。

2) **配置膨胀**  
   - 对策：只迁移“被引用”的动画（inventory 约束）；只命名“高价值/高复用/契约关键”的模板与动画；不把所有 spacing/typography 都配置化。

3) **reduced-motion 回归**  
   - 对策：将 `motion-reduce:*` 放到动画/过渡触发点；必要时保留最小全局兜底并写明原因。

---

## 5. 验收门禁（Acceptance Criteria）

每个批次必须满足：

1) `npm run check:all` 全绿（包含 `check:style-guard`）。  
2) 至少跑一条 focused 验证全绿：  
   - `npm run test:flow:launcher` 或 `npm run test:contract:styles`  
   - `npm run test:visual:ui`（如涉及 Settings/视觉基线）  
3) `src/styles/tailwind.css` 的职责进一步变薄（不包含可被 config/模板表达的大块 keyframes/过渡选择器）。

建议补充“硬门禁”到 plan 的验证步骤（避免主观判断）：

- `rg "animate-\\[" src` 为 0
- `rg "@keyframes" src/styles/tailwind.css` 为 0
- `rg "nav-slide-" src/styles/tailwind.css` 为 0

---

## 6. 下一步（Next）

1) 基于本设计稿编写实现计划（Plan），按 **A（动画/Transition）→ B（布局）** 拆成可验证的小任务。  
2) 每个任务完成后补充 `docs/active_context.md`（只追加 ≤200 字），并保留可回滚 checkpoint。
