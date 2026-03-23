# Tailwind Primitives Migration Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把共享原语的实现从“复用旧 `.btn-*` CSS”逐步切换为 Tailwind utilities（仍消费 `--ui-*` token），并在确认无引用后清理旧 CSS；同时增加 guardrails，避免硬编码色值/第二套设计语言回流。

**Architecture:** 以原语为单位迁移（一次只 Tailwind 化一个原语），每次迁移都必须：focused tests 通过 → `npm run check:all` 全绿 → `rg` 确认无引用 → 再删旧 CSS。Tailwind theme `extend` 只映射到 `--ui-*`，多主题仍靠现有 `data-theme` 机制。

**Tech Stack:** TailwindCSS, Vitest, (Optional) desktop-smoke

**设计文档:** `docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-3-tailwindize-and-guardrails-design.md`

---

## 文件结构（File Map）

### 修改/新增（按需）

| 文件 | 变更 |
|---|---|
| `tailwind.config.cjs` | 增加 token 映射（`--ui-*`） |
| `src/components/shared/ui/UiButton.vue` | 改为 Tailwind 实现 |
| `src/components/shared/ui/__tests__/UiButton.test.ts` | 如有必要更新断言（锁 API，不锁实现细节） |
| `src/styles/shared.css` | 删除 `.btn-*`（仅在确认无引用后） |
| `scripts/style-guard.mjs` | 样式 guard（阻止硬编码色值/任意色值） |
| `package.json` | 接入 `check:style-guard` 到 `check:all` |
| `docs/project_constitution.md` | 记录样式治理规则 |
| `docs/active_context.md` | 追加 ≤200 字摘要 |

---

## Chunk 1: Tailwind token 映射（只做必须的）

### Task 1: 在 Tailwind theme 中映射到 `--ui-*`

**Files:**
- Modify: `tailwind.config.cjs`

- [ ] **Step 1: 增加最小映射**

建议起点（按真实需要扩展）：
- radius：`--ui-radius`
- shadow：`--ui-shadow`
- font：`--ui-font-mono`

- [ ] **Step 2: 提交 checkpoint**

```bash
git add tailwind.config.cjs
git commit -m "chore(styles):Tailwind theme 映射到 ui tokens"
```

---

## Chunk 2: 原语 Tailwind 化（一次一个）

### Task 2: `UiButton` 改为 Tailwind utilities（对齐旧视觉）

**Files:**
- Modify: `src/components/shared/ui/UiButton.vue`
- Test: `src/components/shared/ui/__tests__/UiButton.test.ts`

- [ ] **Step 1: 先跑 `test:flow:*` 与原语单测，确认基线**
- [ ] **Step 2: 仅替换内部 class 组合为 Tailwind（variant 逐个对齐）**
- [ ] **Step 3: 跑 focused + 全量门禁**

Run:
- `npm test -- src/components/shared/ui/__tests__/UiButton.test.ts`
- `npm run test:flow:launcher`
- `npm run test:flow:settings`
- `npm run check:all`

Expected:
- PASS

- [ ] **Step 4: 提交 checkpoint**

```bash
git add src/components/shared/ui/UiButton.vue src/components/shared/ui/__tests__/UiButton.test.ts
git commit -m "refactor(ui):UiButton 改为 Tailwind 实现并对齐旧视觉"
```

### Task 3: 清理 `.btn-*` 旧 CSS（仅在确认无引用后）

**Files:**
- Modify: `src/styles/shared.css`

- [ ] **Step 1: 先全局搜索确认无引用**

Run:
- `rg -n "\\bbtn-(muted|primary|stage|success|danger)\\b" src`

Expected:
- 不再出现调用点引用（允许原语内部已迁移为 Tailwind 后不再使用）

- [ ] **Step 2: 删除 `shared.css` 中对应 `.btn-*` 规则块**
- [ ] **Step 3: 再跑一次 `npm run check:all`**
- [ ] **Step 4: 提交**

```bash
git add src/styles/shared.css
git commit -m "refactor(styles):删除废弃 btn-* CSS"
```

---

## Chunk 3: Guardrails（防止硬编码色值回流）

### Task 4: 增加样式 guard 并接入 `check:all`

**Files:**
- Create: `scripts/style-guard.mjs`
- Modify: `package.json`
- Modify: `docs/project_constitution.md`

- [ ] **Step 1: 明确禁止项（以 repo-level 扫描做门禁）**

建议禁止：
- `.vue`/`.ts` 中出现 `#RRGGBB` / `rgb(` / `hsl(`（允许 `var(--ui-*)`）
- Tailwind arbitrary color（如 `text-[#fff]`）

- [ ] **Step 2: 实现脚本并给出“文件:行号”的报错输出**
- [ ] **Step 3: 新增 `check:style-guard`，并接入 `check:all`**
- [ ] **Step 4: 提交 checkpoint**

```bash
git add scripts/style-guard.mjs package.json docs/project_constitution.md
git commit -m "chore(styles):增加样式 token guard，防止硬编码色值回流"
```

---

## 收尾：短期记忆 + Phase 验收

### Task 5: 记录 active_context 并做 Phase 3 总验收

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 追加 ≤200 字摘要**
- [ ] **Step 2: 跑总验收**

Run:
- `npm run check:all`

Expected:
- PASS

- [ ] **Step 3: 提交**

```bash
git add docs/active_context.md
git commit -m "docs:记录 Tailwind Phase 3 进展"
```

