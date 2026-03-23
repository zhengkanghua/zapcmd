# Tailwind Primitives Migration Phase 4 设计稿：Settings 小组件 Tailwind 化 + 截图级视觉回归扩展

> 日期：2026-03-23  
> 状态：Draft  
> 范围：开发分支内试验（不自动合并到 `main`）  

## 0. 现状（Reality Check）

### 0.1 “是不是基本上所有 CSS 都转为 Tailwind 了？”

不是。当前仍然存在：

- 窗口级全局 CSS：`src/styles/launcher.css`、`src/styles/settings.css`（本 Phase 不动）
- Settings 侧仍有多处 `<style scoped>`（本 Phase 目标是优先把“可控小组件” Tailwind 化）：
  - `src/components/settings/ui/SToggle.vue`
  - `src/components/settings/ui/SSegmentNav.vue`
  - `src/components/settings/ui/SSlider.vue`
  - `src/components/settings/ui/SHotkeyRecorder.vue`
  - `src/components/settings/parts/SettingsGeneralSection.vue`（其中 reuse-policy 是小块 scoped CSS）
  - 其他 section（`SettingsHotkeysSection/SettingsAppearanceSection/SettingsAboutSection`）暂不纳入本 Phase

### 0.2 已经完成的前置（Phase 4 已落地一部分）

- 已引入截图级视觉回归门禁：`npm run test:visual:ui`（Windows CI 与本地 verify gate 均接入）
- 已 Tailwind 化 Settings 原语 `SDropdown`（并保留 `--ui-*` tokens 与既有 BEM 类名以兼容测试）

## 1. 目标（Goals）

1) 以“方案 1（Hybrid）”推进：**优先把 Settings 小组件 Tailwind 化**，不触碰窗口级 CSS（`settings.css/launcher.css`）。  
2) **保留主题 tokens 体系**：组件侧只消费 `var(--ui-*)`，避免引入第二套 palette；必要时补充 `tokens.css` 语义 token。  
3) **强制视觉回归门禁**：为新增/改造的小组件补齐截图场景，避免 Tailwind 化后“样式丢失/交互态退化”。  
4) 提升鲁棒性：将“样式契约”从“匹配 CSS 文本”迁移到“匹配 Tailwind class / 语义契约”，降低对实现细节的脆弱耦合。

## 2. 非目标（Non-Goals）

- 不做 Settings/Launcher 的整体视觉重做；目标是**视觉零差异或可解释的微差**（由截图门禁约束）。
- 不大改 `src/styles/settings.css` / `src/styles/launcher.css`（仅在确有必要时补充 tokens 或极小修补）。
- 不在本 Phase 做全量 scoped CSS 清理；只处理明确纳入的组件/小块。

## 3. 方案选型（2–3 种方式对比）

### 方案 A（推荐）：组件内 Tailwind + 保留 BEM + “必要时保留少量 CSS”

- 做法：在组件模板中用 Tailwind utilities 表达布局/排版/边框等；保留现有 BEM 类名（兼容选择器与测试）；仅对 Tailwind 难以覆盖的能力（`::-webkit-slider-thumb` 等）保留最小 CSS。
- 优点：迁移成本低、改动可控、与现有结构兼容；能逐个组件推进并被截图门禁约束。
- 缺点：并非 0 CSS；但可以把“不可避免的 CSS”收敛到极少数地方。

### 方案 B：抽离到全局 `@layer components` + 组件只保留语义类

- 做法：把组件样式集中到 `src/styles/tailwind.css` 的 `@layer components`（配合 `@apply`），组件只挂语义类（BEM 或 data-attr）。
- 优点：模板更短，样式集中；更像“传统 CSS 组件层”。
- 缺点：迁移期容易回到“CSS 层叠与命名”问题；且 `@apply` 对复杂状态/伪元素会变得笨重。

### 方案 C：CSS Variables + 行内 style 驱动（Tailwind 只做布局）

- 做法：把颜色/阴影/状态尽量收敛到 tokens/变量，模板只用 Tailwind 布局；复杂视觉通过 token 组合完成。
- 优点：主题扩展最强，减少 Tailwind 细节依赖。
- 缺点：变量设计成本高；短期会拖慢迁移节奏。

**推荐结论：默认采用方案 A**；对 `SSlider` 等伪元素场景，允许保留最小 CSS（仍需 token 化）。

## 4. 本 Phase 迁移范围（Scope）

按“风险从低到高、可视门禁覆盖从粗到细”的顺序推进：

1) `src/components/settings/parts/SettingsGeneralSection.vue`：reuse-policy 小块去 scoped CSS（纯布局/排版）。  
2) `src/components/settings/ui/SToggle.vue`：去 scoped CSS，Tailwind 化（注意 focus/键盘交互与禁用态）。  
3) `src/components/settings/ui/SSegmentNav.vue`：去 scoped CSS，Tailwind 化；并更新样式契约测试。  
4) `src/components/settings/ui/SSlider.vue`：采用 Hybrid；容许保留 `range` 伪元素 CSS，但其余 Tailwind 化。  
5)（可选/视风险）`src/components/settings/ui/SHotkeyRecorder.vue`：Tailwind 化并补齐录制/冲突态视觉回归场景。

## 5. 样式与架构约束（Guardrails）

- `style-guard` 约束：组件/脚本/模板层禁止 `--theme-*`、hex/rgb/rgba/hsl 硬编码；颜色只能走 `var(--ui-*)`。
- Tailwind arbitrary values 允许用于 token（例如 `text-[color:var(--ui-subtle)]`），但禁止 `text-[#fff]` 一类绕开主题系统的写法。
- 优先复用现有 tokens（如 `--ui-text/--ui-subtle/--ui-border/--ui-settings-tab-active-bg`）；确需新增语义时，先补 `tokens.css`（必要时再补主题侧 `--theme-*`）。

## 6. 截图级视觉回归扩展（Visual Regression）

### 6.1 现有门禁（已落地）

- Harness：`visual.html` + `src/AppVisual.vue`（`#settings-ui-overview`、`#settings-ui-dropdown-open`）
- Baselines：`scripts/e2e/visual-baselines/*.png`
- 对比：`scripts/e2e/visual-diff.ps1`（像素 diff ratio 门禁）

### 6.2 本 Phase 需要补齐的截图场景

目标：覆盖“迁移组件的关键交互态”，而不是覆盖所有页面。

建议新增（按收益排序，尽量控制数量）：

1) `settings-ui-controls-focus`：聚合展示并程序化触发 focus-visible（SToggle / SSegmentNav tab / SSlider input）。  
2) `settings-ui-slider`：锁 `range` thumb + fill track 的视觉基线（避免浏览器升级导致的回归被忽略）。  
3)（可选）`settings-ui-hotkey-recorder`：展示 empty/recording/conflict 三态（录制态通过程序化 click 触发）。  

> 说明：对 hover 态优先用“显式状态类 / 程序化触发”替代真实鼠标悬停，避免 headless/时序抖动。

### 6.3 Baseline 更新流程（强制显式操作）

- 仅当确认“视觉差异是预期的”才允许更新 baseline。  
- 更新命令：`npm run test:visual:ui:update`  
- 产物/排查：`.tmp/e2e/visual-regression/`（actual/diff/logs）

## 7. 测试与验收（Acceptance）

本 Phase 任何提交都必须满足：

- `npm run check:all` 全绿（包含 `check:style-guard`）
- Windows：`npm run test:visual:ui` 全绿（CI 门禁 + 本地 verify gate）
- 样式契约测试更新后仍需稳定：`src/__tests__/settings.topbar-nav-style-contract.test.ts`
- 组件交互不退化：键盘可达（focus-visible）、Esc/Blur 行为保持（尤其是 dropdown / hotkey recorder）

## 8. 风险与对策（Risks）

1) **截图门禁抖动**（字体/渲染差异、Edge 版本差异）  
   - 对策：控制截图数量；优先覆盖稳定的“聚合态”；必要时调节阈值但需记录理由。  
2) **range input 的跨浏览器差异**  
   - 对策：明确 `SSlider` 允许保留最小 CSS（伪元素）；把风险锁定到少量截图。  
3) **样式契约测试过度绑定实现细节**  
   - 对策：把 contract 从“CSS 文本正则”迁移为“Tailwind class contract / 语义断言”（例如 gap/padding/rounding 的类名契约）。

## 9. 下一步（进入 writing-plans）

本设计稿确认后，进入 `writing-plans`：

- 输出 Phase 4 的执行计划（按组件拆成可回滚的 checkpoint commits）
- 明确每个 checkpoint 需要新增/更新的视觉 baseline 与 focused tests

