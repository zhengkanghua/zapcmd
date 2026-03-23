# Tailwind Primitives Migration Phase 3B Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收口 `UiButton/UiIconButton` 剩余硬编码色值到 `--ui-*` tokens，并把 `style-guard` 升级为禁止“非 ui token 的 `rgba()`”，同时把 `UiButton` 的 size 组合改成确定性实现（不依赖 Tailwind utility 排序/冲突覆盖）。

**Architecture:** 仍以“语义 token → 组件消费 token → guardrails 门禁”的链路推进：新增控件 hover 语义 token（由 theme 提供），组件侧只使用 `var(--ui-*)`；`style-guard` 扫描 `src/**/*.vue|ts`，新增 `rgba()` 规则：仅允许 `rgba(var(--ui-...))` 形式，阻止 `rgba(255,255,255,...)` 这类硬编码回流。

**Tech Stack:** TailwindCSS v4、Vue 3、Vitest、Node（`scripts/style-guard.mjs`）

---

## 文件结构（File Map）

| 文件 | 责任 |
|---|---|
| `src/styles/themes/obsidian.css` | 主题定义层：新增控件 hover 语义值（允许真实色值） |
| `src/styles/tokens.css` | 语义层：映射 `--theme-*` → `--ui-*`，组件只消费 `--ui-*` |
| `src/components/shared/ui/UiButton.vue` | Tailwind 原语：移除硬编码 `rgba(255...)`；size 组合确定化 |
| `src/components/shared/ui/UiIconButton.vue` | Tailwind 原语：移除硬编码 `rgba(255...)` |
| `src/components/shared/ui/__tests__/UiButton.test.ts` | 最小回归：variant/size 组合仍可区分 |
| `src/components/shared/ui/__tests__/UiIconButton.test.ts` | 最小回归：aria-label + class 基线 |
| `scripts/style-guard.mjs` | 门禁：新增 `rgba()` rule（仅允许 `rgba(var(--ui-...))`） |
| `docs/project_constitution.md` | 规则口径：样式治理条目更新（包含 `rgba()`） |
| `docs/active_context.md` | ≤200 字补充：记录 Phase 3B 的收口点（完成后再写） |

---

## Chunk 1: Tokens（为控件 hover 提供语义出口）

### Task 1: 新增“控件 muted hover”语义 token

**Files:**
- Modify: `src/styles/themes/obsidian.css`
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: 在主题层新增变量（保持旧视觉值）**
  - 在 `src/styles/themes/obsidian.css` 的“交互态”附近新增：
    - `--theme-control-muted-hover-bg: rgba(255, 255, 255, 0.09);`
    - `--theme-control-muted-hover-border: rgba(255, 255, 255, 0.12);`

- [ ] **Step 2: 在 tokens 层映射到 `--ui-*`**
  - 在 `src/styles/tokens.css` 中新增：
    - `--ui-control-muted-hover-bg: var(--theme-control-muted-hover-bg);`
    - `--ui-control-muted-hover-border: var(--theme-control-muted-hover-border);`

- [ ] **Step 3: 快速自检（确保变量可被加载）**
  - Run: `rg -n -- \"control-muted-hover\" src/styles/tokens.css src/styles/themes/obsidian.css`
  - Expected: 两处都能命中（theme + tokens）

- [ ] **Step 4: Commit**
  - Run:
    - `git add src/styles/themes/obsidian.css src/styles/tokens.css`
    - `git commit -m \"chore(styles):新增控件 hover 语义 tokens\"`

---

## Chunk 2: Button Primitives（移除硬编码色值）

### Task 2: `UiButton` muted hover 使用 token

**Files:**
- Modify: `src/components/shared/ui/UiButton.vue`
- Test: `src/components/shared/ui/__tests__/UiButton.test.ts`

- [ ] **Step 1: 替换硬编码 hover 样式为 token**
  - 把：
    - `enabled:hover:bg-[rgba(255,255,255,0.09)]`
    - `enabled:hover:border-[rgba(255,255,255,0.12)]`
  - 改为：
    - `enabled:hover:bg-[var(--ui-control-muted-hover-bg)]`
    - `enabled:hover:border-[var(--ui-control-muted-hover-border)]`

- [ ] **Step 2: 运行 focused test**
  - Run: `npm test -- src/components/shared/ui/__tests__/UiButton.test.ts`
  - Expected: PASS

- [ ] **Step 3: Commit**
  - Run:
    - `git add src/components/shared/ui/UiButton.vue src/components/shared/ui/__tests__/UiButton.test.ts`
    - `git commit -m \"refactor(ui):UiButton muted hover 改为消费 tokens\"`

### Task 3: `UiIconButton` muted hover 使用 token

**Files:**
- Modify: `src/components/shared/ui/UiIconButton.vue`
- Test: `src/components/shared/ui/__tests__/UiIconButton.test.ts`

- [ ] **Step 1: 同步替换 muted hover 样式为 token（与 UiButton 一致）**
  - 把：
    - `enabled:hover:bg-[rgba(255,255,255,0.09)]`
    - `enabled:hover:border-[rgba(255,255,255,0.12)]`
  - 改为：
    - `enabled:hover:bg-[var(--ui-control-muted-hover-bg)]`
    - `enabled:hover:border-[var(--ui-control-muted-hover-border)]`

- [ ] **Step 2: 运行 focused test**
  - Run: `npm test -- src/components/shared/ui/__tests__/UiIconButton.test.ts`
  - Expected: PASS

- [ ] **Step 3: Commit**
  - Run:
    - `git add src/components/shared/ui/UiIconButton.vue src/components/shared/ui/__tests__/UiIconButton.test.ts`
    - `git commit -m \"refactor(ui):UiIconButton muted hover 改为消费 tokens\"`

---

## Chunk 3: Guardrails（把“强门禁”落到可执行规则）

### Task 4: `style-guard` 新增 `rgba()` 规则（仅允许 `rgba(var(--ui-...))`）

**Files:**
- Modify: `scripts/style-guard.mjs`
- Modify: `docs/project_constitution.md`

- [ ] **Step 1: 新增规则**
  - 在 `scripts/style-guard.mjs` 的 `rules` 中新增一条：
    - 目标：禁止 `rgba(255,...)` / `rgba(0,...)` 等硬编码；允许 `rgba(var(--ui-...))`
    - 推荐实现：新增 regex `\\brgba\\(\\s*(?!var\\(--ui-)`（大小写不敏感）
    - 迁移期兜底：为避免历史 CSS 大面积误伤，`rgba()` 规则建议跳过 `.vue` 的 `<style>` block，并排除 `__tests__` / `*.test.ts` 等测试文件；如发现 `rgba(var(--theme-...))`，优先补齐 `--ui-*` 映射后替换。

- [ ] **Step 2: 更新规则口径文档**
  - 在 `docs/project_constitution.md` 的“3.7 样式治理（Tokens + Tailwind）”补充：`rgba()` 同样禁止（仅允许 ui token 形式）。

- [ ] **Step 3: 运行门禁**
  - Run: `npm run check:style-guard`
  - Expected: 输出 `[style-guard] OK`

- [ ] **Step 4: Commit**
  - Run:
    - `git add scripts/style-guard.mjs docs/project_constitution.md`
    - `git commit -m \"chore(styles):style-guard 增加 rgba() 门禁\"`

---

## Chunk 4: UiButton Size Hardening（去掉“冲突覆盖靠运气”）

### Task 5: `UiButton` 改为确定性 variant×size 枚举表

**Files:**
- Modify: `src/components/shared/ui/UiButton.vue`
- Test: `src/components/shared/ui/__tests__/UiButton.test.ts`

- [ ] **Step 1: 重写 class 组合结构**
  - 目标：任何一个最终 class 列表里，不同时出现两组互相冲突的 `px-* / py-* / text-*`。
  - 推荐：把 `variantClasses` 变为 `variantSizeClasses[variant][size]`（10 组显式枚举）。

- [ ] **Step 2: 更新/补齐最小测试**
  - 继续保留“variant/size 变化会导致 class 变化”的回归断言即可（不锁实现细节）。

- [ ] **Step 3: 运行 focused test**
  - Run: `npm test -- src/components/shared/ui/__tests__/UiButton.test.ts`
  - Expected: PASS

- [ ] **Step 4: Commit**
  - Run:
    - `git add src/components/shared/ui/UiButton.vue src/components/shared/ui/__tests__/UiButton.test.ts`
    - `git commit -m \"refactor(ui):UiButton size 组合确定化\"`

---

## Chunk 5: 验收（自动化 + 真机）

### Task 6: 全量门禁 + FlowPanel 真机目测

**Files:**
- Modify: `docs/active_context.md`（完成后补充 ≤200 字）

- [ ] **Step 1: 全量门禁**
  - Run: `npm run check:all`
  - Expected: 全绿（含 `check:style-guard`）

- [ ] **Step 2: 真机目测（主窗口 FlowPanel）**
  - 重点看：右上“垃圾桶/关闭 X”、卡片右侧操作按钮、底部执行按钮在 hover/disabled 下的圆角与 hover 反馈是否一致。

- [ ] **Step 3: 记录短期记忆（≤200 字）**
  - 在 `docs/active_context.md` 追加：本次新增的 tokens、`rgba()` 门禁、`UiButton` size 确定化、以及需要注意的风险/后续。

- [ ] **Step 4: Commit**
  - Run:
    - `git add docs/active_context.md`
    - `git commit -m \"docs:记录 Tailwind Phase 3B 进展\"`
