# Tailwind 语义化与全局 CSS 瘦身 Implementation Plan（Phase 6+）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `feat/tailwind-primitives-migration` 分支将 Launcher 现存 `animate-[...]` 与 `nav-slide` 全局 CSS 迁移为 Tailwind config 的语义能力（`animate-launcher-*` / 显式 Transition classes），并收口少量关键布局 arbitrary（`grid-rows-*` / `place-items-*`），让模板更可读、`src/styles/tailwind.css` 更薄且更像“框架”。

**Architecture:** 保持 `themes/* + tokens.css` 多主题体系不变；组件模板继续只消费 `--ui-*`；允许少量全局例外继续集中在 `src/styles/tailwind.css`（例如 Tauri drag region、滚动条隐藏、极少兼容/伪元素）。本计划严格遵守“视觉零差异”：动画/过渡参数必须与现状完全一致，不借机重设计。

**Tech Stack:** Vue 3 `<script setup>`, TailwindCSS v4（禁用 preflight）, Vitest, style-guard（`npm run check:all`）

**Specs:**
- `docs/superpowers/specs/2026-03-25-tailwind-semantics-and-thin-global-css-design.md`

---

## 约束与验收（DoD）

- 保留 `themes/*` 与 `src/styles/tokens.css`（多主题 tokens 体系不动）。
- `tailwind.config.cjs` 继续保持 `corePlugins.preflight = false`。
- 允许例外：
  - 全局行为/兼容：集中在 `src/styles/tailwind.css`
  - 伪元素：仅允许既有白名单（例如 `SSlider.vue` 的 thumb）
- 最终门禁（必须全绿）：
  - `rg -n "animate-\\[" src` 结果为 0
  - `rg -n "@keyframes" src/styles/tailwind.css` 结果为 0
  - `rg -n "nav-slide" src/styles/tailwind.css` 结果为 0
  - `npm run test:flow:launcher` PASS
  - `npm run test:contract:styles` PASS
  - `npm run check:all` PASS

---

## 文件结构

### 预期修改

| 文件路径 | 责任 |
| --- | --- |
| `tailwind.config.cjs` | 收口 keyframes/animation、nav-slide 的 duration/easing、以及关键 grid templates 的语义名。 |
| `src/styles/tailwind.css` | 移除所有 `@keyframes` 与 `.nav-slide-*`；尽量把 reduced-motion 迁到模板 `motion-reduce:*`。保留 drag-region 与少量 utilities。 |
| `src/components/launcher/LauncherWindow.vue` | `<Transition name="nav-slide">` 改为显式 enter/leave class（零差异参数）。同时收口 `place-items` arbitrary。 |
| `src/components/launcher/parts/LauncherSearchPanel.vue` | 将 toast / staged-feedback 的 `animate-[...]` 改为语义 `animate-launcher-*` 并添加 reduced-motion。 |
| `src/components/launcher/parts/LauncherCommandPanel.vue` | 将 toast 的 `animate-[...]` 改为语义 `animate-launcher-*` 并添加 reduced-motion；收口关键 `grid-rows` arbitrary。 |
| `src/components/launcher/parts/LauncherFlowPanel.vue` | 将 review overlay scrim/panel 的 `animate-[...]` 改为语义 `animate-launcher-*` 并添加 reduced-motion；收口关键 `grid-rows` arbitrary。 |
| `src/components/launcher/parts/LauncherStagingPanel.vue` | 将 staging panel enter/exit 的 `animate-[...]` 改为语义 `animate-launcher-*` 并添加 reduced-motion。 |
| `src/components/launcher/parts/LauncherSafetyOverlay.vue` | 将 overlay/dialog 的 `animate-[...]` 改为语义 `animate-launcher-*` 并添加 reduced-motion。 |
| `src/components/settings/SettingsWindow.vue` | 将窗口结构 grid rows arbitrary 命名化（`grid-rows-settings-window`）。 |
| `src/styles/__tests__/launcher-style-contract.test.ts` | 将契约断言从 arbitrary 更新为语义类（与本计划一致）。 |
| `docs/active_context.md` | 追加本轮 plan/execution 的短期记忆（≤200字）。 |

---

## Chunk 0：基线确认（只读）

### Task 0：冻结现状清单（用于零差异校对）

**Files:**
- (no code change)

- [ ] **Step 1: 盘点模板侧 `animate-[...]` 实际命中**
  - Run: `rg -n "animate-\\[" src`
  - Expected: 命中 Launcher 的 toast / staged-feedback / review overlay / staging / safety 等少量位置

- [ ] **Step 2: 盘点 `tailwind.css` 的 `@keyframes` 定义**
  - Run: `rg -n "@keyframes" src/styles/tailwind.css`
  - Expected: 当前存在多段 keyframes（后续迁移/删除后应为 0）

- [ ] **Step 3: 确认 `nav-slide` 全局 CSS 存在**
  - Run: `rg -n "nav-slide" src/styles/tailwind.css`
  - Expected: 命中 `.nav-slide-enter-active` 等选择器

- [ ] **Step 4: 盘点本轮要收口的布局 arbitrary（contract tests 依赖）**
  - Run: `rg -n "place-items-\\[|grid-rows-\\[" src/components/launcher -S`
  - Expected: 命中 `place-items-[start_center]` 与 `grid-rows-[auto_minmax(0,1fr)_auto]`

---

## Chunk 1：A1 — 动画语义化（`animate-[...]` → `animate-launcher-*`）

### Task 1：把“被引用的 keyframes”迁到 `tailwind.config.cjs`

**Files:**
- Modify: `tailwind.config.cjs`

- [ ] **Step 1: 在 `theme.extend` 下新增 `keyframes`（保持与当前 `tailwind.css` 定义完全一致）**

把以下 keyframes 从 `src/styles/tailwind.css` 迁到 config（其余未引用 keyframes 视为 dead code，本 Chunk 直接删除，不迁移）：

```js
extend: {
  keyframes: {
    "toast-slide-down": {
      "0%": { opacity: "0", transform: "translate(-50%, -10px) scale(0.95)" },
      "100%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" }
    },
    "staged-feedback": {
      from: { transform: "scale(0.995)", background: "rgba(var(--ui-brand-rgb), 0.32)" },
      to: { transform: "scale(1)", background: "var(--ui-brand-soft)" }
    },
    "review-overlay-scrim-in": {
      "0%": { opacity: "0" },
      "40%": { opacity: "1" },
      "100%": { opacity: "1" }
    },
    "review-overlay-scrim-out": {
      "0%": { opacity: "1" },
      "60%": { opacity: "1" },
      "100%": { opacity: "0" }
    },
    "review-overlay-panel-in": {
      "0%": { opacity: "0", transform: "translate3d(16px, 0, 0)" },
      "15%": { opacity: "0", transform: "translate3d(16px, 0, 0)" },
      "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" }
    },
    "review-overlay-panel-out": {
      "0%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
      "100%": { opacity: "0", transform: "translate3d(16px, 0, 0)" }
    },
    "staging-panel-enter": {
      from: { opacity: "0", transform: "translateY(-10px)" },
      to: { opacity: "1", transform: "translateY(0)" }
    },
    "staging-panel-exit": {
      from: { opacity: "1", transform: "translateY(0)" },
      to: { opacity: "0", transform: "translateY(-10px)" }
    },
    "fade-in": {
      from: { opacity: "0" },
      to: { opacity: "1" }
    },
    "dialog-scale-in": {
      "0%": { opacity: "0", transform: "scale(0.95) translateY(10px)" },
      "100%": { opacity: "1", transform: "scale(1) translateY(0)" }
    }
  },
```

- [ ] **Step 2: 在同一处新增 `animation`（按“使用变体”精确匹配参数；禁止强行补 `both`）**

```js
  animation: {
    "launcher-toast-slide-down": "toast-slide-down 350ms cubic-bezier(0.175,0.885,0.32,1.15) both",
    "launcher-staged-feedback": "staged-feedback 220ms ease",
    "launcher-review-overlay-scrim-in": "review-overlay-scrim-in 200ms ease-out both",
    "launcher-review-overlay-scrim-out": "review-overlay-scrim-out 200ms ease-in both",
    "launcher-review-overlay-panel-in": "review-overlay-panel-in 300ms cubic-bezier(0.175,0.885,0.32,1.15) both",
    "launcher-review-overlay-panel-out": "review-overlay-panel-out 200ms ease-in both",
    "launcher-staging-panel-enter": "staging-panel-enter 300ms cubic-bezier(0.175,0.885,0.32,1.15) both",
    "launcher-staging-panel-exit": "staging-panel-exit 200ms ease-in both",
    "launcher-fade-in": "fade-in 200ms ease-out both",
    "launcher-dialog-scale-in": "dialog-scale-in 300ms cubic-bezier(0.175,0.885,0.32,1.15) both"
  }
}
```

- [ ] **Step 3: focused 验证（避免 config 语法错误导致后续 diff 难排）**
  - Run: `npm run test:contract:styles`
  - Expected: PASS

### Task 2：将模板 `animate-[...]` 替换为语义 `animate-launcher-*` + reduced-motion

**Files:**
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/launcher/parts/LauncherStagingPanel.vue`
- Modify: `src/components/launcher/parts/LauncherSafetyOverlay.vue`

- [ ] **Step 1: toast（3 处）**
  - Replace:
    - `animate-[toast-slide-down_350ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]`
  - With:
    - `animate-launcher-toast-slide-down motion-reduce:animate-none`

- [ ] **Step 2: staged-feedback（1 处，注意无 fill-mode）**
  - Replace:
    - `animate-[staged-feedback_220ms_ease]`
  - With:
    - `animate-launcher-staged-feedback motion-reduce:animate-none`

- [ ] **Step 3: review overlay scrim/panel（4 处）**
  - Replace:
    - `animate-[review-overlay-scrim-in_200ms_ease-out_both]`
    - `animate-[review-overlay-scrim-out_200ms_ease-in_both]`
    - `animate-[review-overlay-panel-in_300ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]`
    - `animate-[review-overlay-panel-out_200ms_ease-in_both]`
  - With:
    - `animate-launcher-review-overlay-scrim-in motion-reduce:animate-none`
    - `animate-launcher-review-overlay-scrim-out motion-reduce:animate-none`
    - `animate-launcher-review-overlay-panel-in motion-reduce:animate-none`
    - `animate-launcher-review-overlay-panel-out motion-reduce:animate-none`

- [ ] **Step 4: staging panel enter/exit（2 处）**
  - Replace:
    - `animate-[staging-panel-enter_300ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]`
    - `animate-[staging-panel-exit_200ms_ease-in_both]`
  - With:
    - `animate-launcher-staging-panel-enter motion-reduce:animate-none`
    - `animate-launcher-staging-panel-exit motion-reduce:animate-none`

- [ ] **Step 5: safety overlay / dialog（2 处）**
  - Replace:
    - `animate-[fade-in_200ms_ease-out_both]`
    - `animate-[dialog-scale-in_300ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]`
  - With:
    - `animate-launcher-fade-in motion-reduce:animate-none`
    - `animate-launcher-dialog-scale-in motion-reduce:animate-none`

- [ ] **Step 6: 补齐 reduced-motion 的 transition 兜底（替代全局 CSS）**
  - `LauncherFlowPanel.vue` 的 `.flow-panel` 宽度过渡添加：`motion-reduce:transition-none`

- [ ] **Step 7: 验证模板侧已无 `animate-[`**
  - Run: `rg -n "animate-\\[" src`
  - Expected: 0 hits

### Task 3：删除 `src/styles/tailwind.css` 中的 `@keyframes`（并清理 dead reduced-motion 选择器）

**Files:**
- Modify: `src/styles/tailwind.css`

- [ ] **Step 1: 删除整段 `@keyframes`（包括未引用的 flow-drawer / filters / toast-auto-dismiss）**
  - 删除范围：从 `/* 动画 keyframes */` 注释开始到最后一个 `@keyframes` 结束

- [ ] **Step 2: reduced-motion 全局 CSS 变薄**
  - 删除未被引用的规则（先 `rg -n` 确认仅命中本文件）：
    - `.flow-overlay--opening|closing-*`（若仍存在）
    - `.settings-close-confirm-*`（若仍存在）
  - 对 `.flow-panel-overlay` 的 reduced-motion 行为，优先由模板的 `motion-reduce:*` 覆盖实现；若已覆盖则删除对应全局规则。

- [ ] **Step 3: 验证 `tailwind.css` 已无 `@keyframes`**
  - Run: `rg -n "@keyframes" src/styles/tailwind.css`
  - Expected: 0 hits

- [ ] **Step 4: focused 验证**
  - Run: `npm run test:flow:launcher`
  - Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.cjs src/styles/tailwind.css src/components/launcher/parts/*.vue
git commit -m "refactor(styles):动画语义化并移除 tailwind.css keyframes"
```

---

## Chunk 2：A2 — `nav-slide` 去全局 CSS（Transition 显式 classes）

### Task 4：在 `tailwind.config.cjs` 补齐 `duration-250` 与 `ease-nav-slide`

**Files:**
- Modify: `tailwind.config.cjs`

- [ ] **Step 1: extend transition duration**
  - Add:
    - `transitionDuration: { 250: "250ms" }`

- [ ] **Step 2: extend transition timing function**
  - Add:
    - `transitionTimingFunction: { "nav-slide": "cubic-bezier(0.175,0.885,0.32,1.15)" }`

### Task 5：`LauncherWindow.vue` 改为显式 Transition classes，并删除全局 `.nav-slide-*`

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/styles/tailwind.css`

- [ ] **Step 1: 改 `<Transition name=\"nav-slide\">` 为显式 classes（零差异参数）**

```vue
<Transition
  mode="out-in"
  enter-active-class="transition-transform duration-250 ease-nav-slide motion-reduce:transition-none"
  enter-from-class="translate-x-full"
  enter-to-class="translate-x-0"
  leave-active-class="transition-transform duration-200 ease-in motion-reduce:transition-none"
  leave-from-class="translate-x-0"
  leave-to-class="translate-x-full"
  @after-enter="onNavAfterEnter"
>
```

- [ ] **Step 2: 从 `src/styles/tailwind.css` 删除 `.nav-slide-*` 与其 reduced-motion 分支**

- [ ] **Step 3: 验证 `tailwind.css` 已无 `nav-slide`**
  - Run: `rg -n "nav-slide" src/styles/tailwind.css`
  - Expected: 0 hits

- [ ] **Step 4: focused 验证**
  - Run: `npm run test:flow:launcher`
  - Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.cjs src/components/launcher/LauncherWindow.vue src/styles/tailwind.css
git commit -m "refactor(styles):nav-slide 过渡改为显式 classes 并移除全局 CSS"
```

---

## Chunk 3：B — 关键布局 arbitrary 收口（更语义的 class contract）

### Task 6：把关键 grid template 命名化，并更新 contract tests

**Files:**
- Modify: `tailwind.config.cjs`
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`

- [ ] **Step 1: extend `gridTemplateRows`**
  - Add:
    - `gridTemplateRows: { "launcher-panel": "auto minmax(0, 1fr) auto", "settings-window": "52px minmax(0, 1fr)" }`

- [ ] **Step 2: `LauncherCommandPanel.vue` / `LauncherFlowPanel.vue` 使用语义 grid rows**
  - Replace:
    - `grid-rows-[auto_minmax(0,1fr)_auto]`
  - With:
    - `grid-rows-launcher-panel`

- [ ] **Step 3: `SettingsWindow.vue` 使用语义 grid rows**
  - Replace:
    - `grid-rows-[52px_minmax(0,1fr)]`
  - With:
    - `grid-rows-settings-window`

- [ ] **Step 4: `LauncherWindow.vue` 去掉 `place-items-[start_center]`**
  - Replace:
    - `place-items-[start_center]`
  - With (二选一，优先更接近原语义)：
    - `place-items-start justify-items-center`

- [ ] **Step 5: 更新 `launcher-style-contract.test.ts` 的断言**
  - `place-items-[start_center]` → `place-items-start`（并保留 `justify-items-center` 的断言）
  - `grid-rows-[auto_minmax(0,1fr)_auto]` → `grid-rows-launcher-panel`

- [ ] **Step 6: focused 验证**
  - Run: `npm run test:contract:styles`
  - Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.cjs src/components/launcher/LauncherWindow.vue src/components/launcher/parts/LauncherCommandPanel.vue src/components/launcher/parts/LauncherFlowPanel.vue src/components/settings/SettingsWindow.vue src/styles/__tests__/launcher-style-contract.test.ts
git commit -m "refactor(styles):关键布局 arbitrary 命名化并更新契约测试"
```

---

## 最终收口：全量验证 + 文档补充

### Task 7：全量门禁与短期记忆

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 全量门禁**
  - Run: `npm run check:all`
  - Expected: PASS

- [ ] **Step 2: 追加 `docs/active_context.md`（≤200字）**
  - 记录：动画语义化（animate-launcher-*）、`tailwind.css` 去 keyframes/nav-slide、关键 layout arbitrary 命名化、门禁通过情况。

- [ ] **Step 3: Commit**

```bash
git add docs/active_context.md
git commit -m "docs:更新 active_context（Tailwind 动画/布局语义化）"
```

