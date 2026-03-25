# Tailwind Primitives Migration Phase 6 Implementation Plan：窗口级 CSS 清理（shared/settings/launcher/animations → Tailwind）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `feat/tailwind-primitives-migration` 分支把窗口级样式从 `shared.css/settings.css/launcher.css/animations.css` 迁移到 Tailwind utilities/primitives（必要的伪元素/全局选择器/Transition 收敛到 `src/styles/tailwind.css`），最终只保留 `reset/themes/tokens/tailwind/index` 五类 CSS 文件。

**Architecture:** 保持 `data-theme` + `--theme-* → --ui-*` 作为唯一主题真相源；组件模板只消费 `var(--ui-*)` 并使用 Tailwind utilities 表达布局/排版/交互态；保留现有 BEM/状态类名作为 hook/test selector，但不再让它们承载视觉样式；迁移按 `shared → settings → launcher → animations → guardrails` 顺序推进，每步都要求 focused tests + `check:all` 的可回滚 checkpoint。

**Tech Stack:** Vue 3, Vite, TailwindCSS v4, PostCSS, Vitest（focused）,（已有）Settings visual regression harness（`visual.html` + Edge headless）

**Design:** `docs/superpowers/specs/2026-03-25-tailwind-full-migration-design.md`

---

## 背景/约束（必须遵守）

- 分支：`feat/tailwind-primitives-migration`（不要自动合并到 main）
- 样式硬门禁：
  - 组件/模板只消费 `var(--ui-*)`（禁止直接用 `--theme-*`）
  - 禁止模板里硬编码色值：`#` / `rgb(` / `hsl(`；`rgba(...)` 仅允许 `rgba(var(--ui-...), <alpha>)`
  - Tailwind class 必须可静态分析（避免动态拼接导致 content 扫描漏抓）
  - 保留 BEM/状态类名（避免测试/DOM 查询断裂）
- 工程门禁：每个 checkpoint 最终以 `npm run check:all` 全绿作为验收口径

---

## Chunk 0：基线确认 + 迁移清单冻结（只读）

### Task 0：确认迁移目标文件与现状引用

**Files:**
- (no code change)

- [ ] 列出当前样式入口与导入顺序（确认 `tailwind.css` 在末尾）
  - Run: `sed -n '1,120p' src/styles/index.css`
  - Expected: `@import './tailwind.css'` 位于末尾
- [ ] 确认待清理 CSS 文件行数（用于衡量迁移进度）
  - Run: `wc -l src/styles/shared.css src/styles/settings.css src/styles/launcher.css src/styles/animations.css`
  - Expected: 能输出 4 个文件的行数（shared≈129、settings≈698、launcher≈1771、animations≈300）

---

## Chunk 1：Phase 6.1 — 删除 `shared.css`（把全局小工具/Toast/KeyboardHint 迁到 Tailwind）

> 本 Chunk 的目标是：`src/styles/shared.css` 不再承载任何视觉规则，并最终从 `src/styles/index.css` 移除导入并删除文件。

### Task 1：将 `execution-toast / execution-feedback` 迁到模板 Tailwind utilities

**Files:**
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`

- [ ] **Step 1: 搜索定位所有 toast 容器**
  - Run: `rg -n "execution-feedback execution-toast" src/components/launcher -S`
  - Expected: 至少命中 `LauncherSearchPanel` / `LauncherCommandPanel` / `LauncherFlowPanel`
- [ ] **Step 2: 迁移基础布局（保持现有 class 作为 hook）**
  - 将 `class="execution-feedback execution-toast"` 扩展为“保留原 class + 追加 Tailwind”：
    - 参考（只示意关键语义，按现有布局微调）：  
      `absolute left-1/2 top-3 z-[12] max-w-[min(460px,calc(100%-24px))] -translate-x-1/2 pointer-events-none`  
      `rounded-[8px] border border-[rgba(var(--ui-text-rgb),0.18)] bg-[var(--ui-glass-bg)] shadow-[0_8px_22px_rgba(var(--ui-black-rgb),0.34)]`  
      `backdrop-blur-[12px] px-[10px] py-[6px] text-[12px]`  
      `animate-[toast-slide-down_350ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]`
- [ ] **Step 3: 迁移 tone 颜色（避免动态拼接 Tailwind class）**
  - 将 `:class="\`execution-feedback--${tone}\`"` 替换为 object 语法，使用静态 class 字面量：
    - neutral：`text-[var(--ui-brand)]`
    - success：`text-[var(--ui-success)]`
    - error：`text-[var(--ui-danger)]`
- [ ] **Step 4: 删除不再需要的 `.execution-feedback--*` / `.execution-toast` 旧规则（后续 Task 3 统一清理）**

### Task 2：将 `keyboard-hint`（含 `kbd`）迁到模板 Tailwind utilities

**Files:**
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`

- [ ] **Step 1: 搜索定位 keyboard-hint DOM**
  - Run: `rg -n "keyboard-hint" src/components/launcher/parts/*.vue -S`
  - Expected: 命中 SearchPanel 与 FlowPanel 中的 keyboard hint 结构
- [ ] **Step 2: 在保持现有 BEM class 的前提下，给容器补齐 Tailwind 布局**
  - `keyboard-hint`：`m-0 min-h-[20px] flex flex-wrap items-center gap-[6px] p-[2px_6px_6px] text-[10px] font-medium tracking-[0.03em] text-[var(--ui-subtle)]`
  - `keyboard-hint__item`：`inline-flex items-center gap-[4px]`
  - `keyboard-hint__keys`：`inline-flex items-center gap-[2px]`
  - `keyboard-hint__action`：`text-[var(--ui-dim)]`
  - `keyboard-hint__sep`：`ml-[2px] text-[rgba(var(--ui-text-rgb),0.15)]`
- [ ] **Step 3: 移除对全局 `kbd { ... }` 规则的依赖**
  - 在模板中给 `<kbd>` 补齐 Tailwind（不依赖全局 element selector）：
    - `inline-flex items-center justify-center min-w-[18px] h-[18px] px-[4px] rounded-[4px]`
    - `border border-[rgba(var(--ui-text-rgb),0.15)] border-b-[rgba(var(--ui-text-rgb),0.05)]`
    - `bg-[linear-gradient(180deg,rgba(var(--ui-text-rgb),0.1),rgba(var(--ui-text-rgb),0.04))]`
    - `text-[10px] leading-[1] text-[var(--ui-subtle)] [font-family:var(--ui-font-mono)]`
    - `shadow-[0_1px_1px_rgba(var(--ui-black-rgb),0.2),inset_0_1px_0_rgba(var(--ui-text-rgb),0.1)]`

### Task 3：把 `shared.css` 剩余“全局行为类”迁到 `tailwind.css`（允许少量 CSS glue）

**Files:**
- Modify: `src/styles/tailwind.css`
- Modify: `src/styles/shared.css`（删旧块，迁移后应为空）

- [ ] **Step 1: 迁移 `[data-tauri-drag-region]` cursor/region 规则到 `tailwind.css`**
  - 保持原选择器（避免行为回归），把以下块从 `shared.css` 挪到 `tailwind.css`（建议 `@layer base`）：
    - `[data-tauri-drag-region] { -webkit-app-region: drag; app-region: drag; cursor: move; ... }`
    - `[data-tauri-drag-region] :is(button, input, ...) { cursor: auto; }` 等
- [ ] **Step 2: 如仍需要 `.visually-hidden`，用 Tailwind 内置 `sr-only` 替代**
  - 若仓库内无引用：直接删除 `.visually-hidden`（无需替代）
- [ ] **Step 3: 清空 `shared.css` 迁移的旧规则块**

### Task 4：移除导入并删除 `shared.css`

**Files:**
- Modify: `src/styles/index.css`
- Delete: `src/styles/shared.css`

- [ ] **Step 1: 从 `src/styles/index.css` 移除 `@import './shared.css'`**
- [ ] **Step 2: 删除 `src/styles/shared.css`**
- [ ] **Step 3: focused 验证**
  - Run: `npm run test:flow:launcher`
  - Expected: PASS
  - Run: `npm run check:all`
  - Expected: PASS
- [ ] **Step 4: Commit（checkpoint）**
  - `git add src/styles/index.css src/styles/tailwind.css src/components/launcher/parts/*.vue`
  - `git rm src/styles/shared.css`
  - `git commit -m "refactor(styles):移除 shared.css，Toast/Hint 改为 Tailwind"`

---

## Chunk 2：Phase 6.2 — 删除 `settings.css`（SettingsWindow/SettingItem/SettingSection 全 Tailwind）

> 本 Chunk 的目标是：Settings 侧不再依赖 `src/styles/settings.css`；所有结构/布局/交互态由 Tailwind 表达，必要的伪元素/scrollbar glue 收敛到 `tailwind.css`。

### Task 5：为 Settings scrollbars 提供 Tailwind 级工具类（glue）

**Files:**
- Modify: `src/styles/tailwind.css`

- [ ] **Step 1: 在 `@layer utilities` 新增 `.scrollbar-none`**
  - `scrollbar-width: none;`
  - `::-webkit-scrollbar { width: 0; height: 0; }`
- [ ] **Step 2: Commit（checkpoint）**
  - `git add src/styles/tailwind.css`
  - `git commit -m "chore(styles):新增 scrollbar-none 工具类"`

### Task 6：SettingsWindow 根布局 Tailwind 化（替代 `.settings-window-root/.settings-window-topbar/.settings-content*`）

**Files:**
- Modify: `src/components/settings/SettingsWindow.vue`
- Test: `src/__tests__/settings.topbar-nav-style-contract.test.ts`

- [ ] **Step 1: 在模板上“保留原 class + 追加 Tailwind”**
  - `settings-window-root`：补齐 `h-full min-h-0 grid grid-rows-[52px_minmax(0,1fr)] overflow-hidden text-[var(--ui-text)]`
  - root 背景建议先用 tokens（优先）或 `bg-[...]`（必须避免 `rgba(255,...)`）：  
    `bg-[radial-gradient(circle_at_top,rgba(var(--ui-text-rgb),0.035),transparent_48%),linear-gradient(180deg,rgba(var(--ui-text-rgb),0.02),transparent_28%),var(--ui-bg-deep)]`
  - `settings-window-topbar`：`relative z-[var(--ui-settings-z-topbar)] h-[52px] flex items-end justify-center px-[24px] box-border`
    - 背景：`bg-[linear-gradient(180deg,rgba(var(--ui-text-rgb),0.045),rgba(var(--ui-text-rgb),0.01)_42%,rgba(var(--ui-text-rgb),0))]`
    - 模糊：`backdrop-blur-[calc(var(--ui-blur)*0.24)]`
  - 底部分隔线：用一个真实 DOM 元素替代 `::after`（避免保留伪元素 CSS）
- [ ] **Step 2: `settings-content` 迁移滚动与 padding（使用 `.scrollbar-none`）**
  - 目标语义：`min-h-0 h-full overflow-y-auto overscroll-contain w-full pb-[24px] box-border scrollbar-none`
  - `settings-content__inner`：`box-border w-full max-w-[720px] mx-auto p-[24px_32px_32px]`
  - `settings-content__inner--commands`：用 Tailwind responsive 或 conditional class：`max-w-[1120px]`
- [ ] **Step 3: 更新 contract test**
  - `src/__tests__/settings.topbar-nav-style-contract.test.ts`：不再读取 `settings.css`，改为断言 `SettingsWindow.vue` 含底部 divider DOM（或 Tailwind class contract）
- [ ] **Step 4: focused test + 总门禁**
  - Run: `npm run test:run -- src/__tests__/settings.topbar-nav-style-contract.test.ts`
  - Expected: PASS
  - Run: `npm run test:visual:ui`
  - Expected: PASS（Settings baselines 全绿）
  - Run: `npm run check:all`
  - Expected: PASS

### Task 7：SettingSection / SettingItem Tailwind 化（替代 `.settings-card/.setting-item` 等）

**Files:**
- Modify: `src/components/settings/ui/SettingSection.vue`
- Modify: `src/components/settings/ui/SettingItem.vue`
- Test: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`

- [ ] **Step 1: 为 `SettingSection.vue` 的根容器补齐卡片样式**
  - 目标语义（示意）：`rounded-[16px] border border-[var(--ui-settings-card-border)] bg-[var(--ui-settings-card-bg)] overflow-hidden`
- [ ] **Step 2: 为 `SettingItem.vue` 的行容器补齐 grid/hover/border**
  - 目标语义（示意）：`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[18px] px-[16px] py-[14px] border-b border-[var(--ui-settings-row-border)] transition-[background] duration-120 hover:bg-[var(--ui-settings-row-hover)]`
- [ ] **Step 3: focused tests + visual gate**
  - Run: `npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
  - Expected: PASS
  - Run: `npm run test:visual:ui`
  - Expected: PASS

### Task 8：移除导入并删除 `settings.css`

**Files:**
- Modify: `src/styles/index.css`
- Delete: `src/styles/settings.css`

- [ ] **Step 1: 确认仓库仍有 `.settings-*` 依赖但不再依赖 CSS 文件**
  - Run: `rg -n \"src/styles/settings\\.css\" -S src`
  - Expected: 0 命中
- [ ] **Step 2: 从 `src/styles/index.css` 移除 `@import './settings.css'`**
- [ ] **Step 3: 删除 `src/styles/settings.css`**
- [ ] **Step 4: 总门禁**
  - Run: `npm run test:visual:ui`
  - Expected: PASS
  - Run: `npm run check:all`
  - Expected: PASS
- [ ] **Step 5: Commit（checkpoint）**
  - `git add src/styles/index.css src/styles/tailwind.css src/components/settings/**/*.vue src/__tests__/settings.topbar-nav-style-contract.test.ts`
  - `git rm src/styles/settings.css`
  - `git commit -m "refactor(styles):移除 settings.css，Settings 全量 Tailwind 化"`

---

## Chunk 3：Phase 6.3 — 删除 `launcher.css`（LauncherWindow/parts 逐块 Tailwind）

> 本 Chunk 是最大块：要求 **保持现有测试选择器**（`.search-shell/.command-panel/.flow-panel/...`）并把样式迁到模板 utilities；对于 `-webkit-app-region` / `no-drag` 等全局行为选择器，允许收敛到 `tailwind.css`。

### Task 9：将 `launcher.css contract` 测试迁移为“Tailwind class / 语义契约”

**Files:**
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`

- [ ] **Step 1: 不再读取 `src/styles/launcher.css` 做正则匹配**
- [ ] **Step 2: 改为读取对应组件源文件并断言关键 class contract（示例）**
  - `LauncherWindow.vue`：`launcher-root` 必须含 `grid` + `place-items-[start_center]`
  - `.command-panel/.flow-panel`：必须含 `grid-rows-[auto_minmax(0,1fr)_auto]` 或等价
  - `.flow-panel__body`：必须含 `min-h-0` + `overflow-y-auto`
- [ ] **Step 3: focused run**
  - Run: `npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts`
  - Expected: PASS

### Task 10：LauncherWindow/parts 逐块迁移（每块一个 checkpoint）

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/launcher/parts/LauncherStagingPanel.vue`
- Modify: `src/components/launcher/parts/LauncherSafetyOverlay.vue`
- (可能) Modify: `src/styles/tailwind.css`（收敛 drag/no-drag 选择器）

- [ ] **Step 1: 每次只迁移一个组件的“布局/排版/边框/背景/阴影”**
  - 保留原 BEM class（测试依赖）
  - 新增 Tailwind utilities（arbitrary px 优先，避免近似 scale）
  - 如遇 `rgba(255,...)`：改为 `rgba(var(--ui-text-rgb),...)` 或引入 `--ui-*` token
- [ ] **Step 2: 每个组件迁移后跑 focused tests（先快反馈）**
  - SearchPanel：`npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
  - CommandPanel：`npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
  - FlowPanel：`npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`
- [ ] **Step 3: checkpoint commit（每块一个）**
  - 示例：`git commit -m "refactor(launcher):SearchPanel 样式迁到 Tailwind"`

### Task 11：移除导入并删除 `launcher.css`

**Files:**
- Modify: `src/styles/index.css`
- Delete: `src/styles/launcher.css`

- [ ] **Step 1: 从 `src/styles/index.css` 移除 `@import './launcher.css'`**
- [ ] **Step 2: 删除 `src/styles/launcher.css`**
- [ ] **Step 3: 总门禁**
  - Run: `npm run test:contract:styles`
  - Expected: PASS
  - Run: `npm run check:all`
  - Expected: PASS
- [ ] **Step 4: Commit（checkpoint）**
  - `git add src/styles/index.css src/components/launcher/**/*.vue src/styles/__tests__/launcher-style-contract.test.ts`
  - `git rm src/styles/launcher.css`
  - `git commit -m "refactor(styles):移除 launcher.css，Launcher 全量 Tailwind 化"`

---

## Chunk 4：Phase 6.4 — 删除 `animations.css`（Keyframes/Reduced-motion 收敛）

### Task 12：把 `@keyframes` 与 reduced-motion 规则迁到 `tailwind.css`

**Files:**
- Modify: `src/styles/tailwind.css`
- Modify: `src/styles/index.css`
- Delete: `src/styles/animations.css`

- [ ] **Step 1: 将 `@keyframes` 从 `animations.css` 移入 `tailwind.css`（建议 `@layer base` 之前）**
- [ ] **Step 2: 将 `prefers-reduced-motion` 规则一并迁移**
- [ ] **Step 3: 确认所有引用动画的 class 仍存在（必要时改为 Tailwind `animate-[...]`）**
- [ ] **Step 4: 从 `src/styles/index.css` 移除 `@import './animations.css'` 并删除文件**
- [ ] **Step 5: 总门禁**
  - Run: `npm run check:all`
  - Expected: PASS
- [ ] **Step 6: Commit（checkpoint）**
  - `git add src/styles/index.css src/styles/tailwind.css`
  - `git rm src/styles/animations.css`
  - `git commit -m "refactor(styles):移除 animations.css，keyframes 收敛到 tailwind.css"`

---

## Chunk 5：Phase 6.5 — Guardrails 收口（防止回流）

### Task 13：扩展 `style-guard` 覆盖面（可选但推荐）

**Files:**
- Modify: `scripts/style-guard.mjs`

- [ ] **Step 1: 新增规则（建议）**
  - 禁止在 `src/styles/index.css` 引入非白名单文件（只允许 reset/themes/tokens/tailwind）
  - 禁止 `src/**/*.vue` 出现 `<style`（除非明确白名单，如 `SSlider` 伪元素阶段性例外）
- [ ] **Step 2: 验证**
  - Run: `npm run check:style-guard`
  - Expected: `[style-guard] OK`
- [ ] **Step 3: Commit**
  - `git add scripts/style-guard.mjs`
  - `git commit -m "test(styles):强化 style-guard，阻止 CSS 回流"`

