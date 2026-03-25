# Tailwind 全量迁移（极简 CSS 例外）设计稿（Phase 5+）

> **日期**：2026-03-25  
> **状态**：Draft（讨论通过后执行）  
> **范围**：仅在开发分支试验（不直接合并到 `main`）  
> **分支**：`feat/tailwind-primitives-migration`  

## 0. 背景（Why）

仓库已完成 Tailwind 迁移的前置 Phase（工具链、原语、guardrails、Settings 视觉回归 harness 等），但当前 UI 仍是 **Tailwind + 旧 CSS 文件并存** 的混合栈（`launcher.css/settings.css/shared.css/animations.css` 仍是主要样式来源）。

本设计稿的目标是把“Tailwind 化”推进到 **基本全量**：

- 保留 **多主题与语义 token**（`data-theme` + `--theme-*` → `--ui-*`）作为唯一真相源。
- **除 tokens/themes/reset 等必要 CSS 外，尽量不再新增/保留业务样式 CSS 文件**，将样式表达收敛为 Tailwind utilities / primitives。

本稿是对既有总览设计稿的扩展：`docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-design.md`。

---

## 1. 目标与非目标（Goals / Non-goals）

### 1.1 目标（Goals）

1) **CSS 文件收敛到白名单**  
   `src/styles/` 最终只保留（或等价拆分但语义不变）：
   - `reset.css`（基础重置）
   - `themes/*`（主题源值）
   - `tokens.css`（语义变量映射）
   - `tailwind.css`（Tailwind 入口 + 极少量“无法用模板类表达”的全局规则）
   - `index.css`（聚合入口）

2) **Vue 组件不再使用 `<style>`**（理想状态：0 个）  
   组件样式通过 utilities / primitives 表达；确实需要伪元素/全局选择器时，集中落在 `src/styles/tailwind.css` 的 `@layer` 中。

3) **视觉零差异作为迁移验收口径**  
   不借迁移机会做视觉重设计；每个迁移批次都要有 focused 验证 + `check:all` 兜底。

4) **维持 Tailwind/Token 的单一设计语言**  
   UI 消费侧只引用 `--ui-*`；禁止硬编码色值、禁止模板层消费 `--theme-*`（沿用/增强 style-guard）。

### 1.2 非目标（Non-goals）

- 不启用 Tailwind Preflight（保持 `corePlugins.preflight = false`）。
- 不引入第二套 palette / 颜色系统；不在模板层出现 hex/rgb/rgba/hsl（除允许的 `rgba(var(--ui-...))` 例外）。
- 不追求“一次性删光所有旧 CSS”；仍采用可回滚、可验证的渐进式迁移。

---

## 2. 关键决策（Decisions）

### 2.1 极简 CSS 例外（允许保留的 CSS 类型）

最终只允许保留/新增以下 CSS（其余尽量 Tailwind 化并删除对应旧文件/规则）：

1) **主题与 token 层**：`themes/*`、`tokens.css`  
2) **reset 层**：`reset.css`  
3) **Tailwind glue 层**：`tailwind.css`（集中承载）  
   - 无法通过 HTML class 直接表达的全局选择器（例如 `input[type="range"]::-webkit-slider-thumb`）
   - 少量“全局行为类”（例如 `[data-tauri-drag-region]` / `.visually-hidden` 等）——作为 `@layer base|utilities` 的原语/工具类
   - 少量 `@keyframes` 与 animation utilities（替代 `animations.css`）

### 2.2 “Primitives-first，但允许页面 utilities”

维持既有路线：优先将“控件样式”收敛到 primitives（例如 `UiButton/UiIconButton`、Settings UI primitives）。  
同时，为了彻底删除 `launcher.css/settings.css`，页面/业务组件允许使用更多布局 utilities（grid/flex/gap/padding/typography 等），但要遵守：

- **能复用就抽原语**：重复出现的 class 组合不散落到各页面。
- **Tailwind class 必须可静态分析**：避免运行时拼接导致 content 扫描漏抓（参照 `buttonPrimitives` 的枚举表策略）。

### 2.3 测试/选择器策略

迁移过程中避免把“样式类名”当作稳定选择器：

- 测试优先改用 role/label/文本，或显式 `data-testid`。
- 允许保留少量语义类名（BEM）作为 **JS hook**（例如 `querySelector` 目标），但不再承载视觉样式。

---

## 3. 验收门禁（Acceptance Criteria）

每个迁移批次必须满足：

1) `npm run check:all` 全绿（包含 `check:style-guard`）。  
2) focused 验证至少一个全绿：  
   - Launcher：`npm run test:flow:launcher` / `npm run test:contract:styles`  
   - Settings：`npm run test:flow:settings` / `npm run test:visual:ui`
3) Tailwind 产物完整：迁移涉及的 class 必须在 `@source` 覆盖范围内，且无动态拼接漏抓。
4) CSS 白名单收敛趋势明确：每删一个旧 CSS 文件/大段规则，都要有对应批次验证与回滚点。

最终 Phase 完成时额外要求：

- `src/**/*.vue` 中无 `<style>`（或只剩 0~1 个且已有明确“必须保留”的理由与集中替代方案）。
- `src/styles/index.css` 仅导入白名单文件。

---

## 4. 迁移分段（Phases，建议顺序）

> 说明：这里仅定义“应分段做什么”，具体执行步骤与文件级清单在 plan 中落地。

### Phase 5：全局行为层收敛到 Tailwind（先“能删 shared.css”）

- 将 `shared.css` 中的全局行为（drag-region、visually-hidden、kbd、toast 等）改为：
  - 模板 utilities + 小量 `@layer` 原语类
  - 逐段迁移后删除对应旧规则
- 目标：`shared.css` 可被删除或归零

### Phase 6：Settings CSS 清理（先把 Settings 做“完全 Tailwind 化”）

- 以 `SettingsWindow` 及其 parts 为边界，逐块把 `settings.css` 的布局/排版迁到模板 utilities/primitives
- 继续用 `visual.html` 视觉回归门禁保证零差异
- 目标：删除 `settings.css`

### Phase 7：Launcher CSS 清理（最大块，最后做）

- 以 `LauncherWindow` / `LauncherSearchPanel` / `LauncherFlowPanel` / `LauncherCommandPanel` 为主线迁移
- 将 `launcher.css` 中的布局/间距/字体/边框/背景/阴影等改为 utilities/primitives
- 目标：删除 `launcher.css`

### Phase 8：动画收敛（删 animations.css）

- 将 `animations.css` 的 `@keyframes` 与通用动画类迁到 `tailwind.css` 的 `@layer`（或模板 utilities）
- 目标：删除 `animations.css`

### Phase 9：Guardrails 强化（防止回流）

- 扩展 style-guard（或新增新 guard）：确保不再引入“新 CSS 文件依赖”与 `<style>` 回流。
- 明确 CSS 白名单与不允许的 import/source（避免“迁移完成后又偷偷写回 launcher.css”）。

---

## 5. 风险与对策（Risks）

1) **层叠冲突/视觉抖动**  
   - 对策：始终保持 `reset/themes/tokens` 在前，`tailwind.css` 在后；每次只迁一个可控区域，配合视觉回归。

2) **Tailwind 扫描漏抓（动态 class 拼接）**  
   - 对策：枚举表/字符串字面量；避免 `${var}` 拼接；必要时将可选类集合显式写成 `const` 数组。

3) **迁移导致测试选择器不稳定**  
   - 对策：迁移前先把关键测试从样式类名迁到 role/label/`data-testid`。

---

## 6. 下一步（Next）

1) 基于本设计稿落一份实现计划（plan）：按 Phase 5→9 拆成可在 1~2 天内完成并可验证的子任务。  
2) 每个子任务完成后：补充 `docs/active_context.md`（只追加 ≤200 字），并保留可回滚 checkpoint。

