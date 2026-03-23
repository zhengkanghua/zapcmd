# Tailwind Primitives Migration Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 引入跨窗口共享 UI 原语（Primitives），并把页面/业务组件迁移为“主要消费原语”的模式；本 Phase 强制保持视觉零差异（原语第一版复用现有语义类或现有组件实现）。

**Architecture:** 先只改变“消费方式”（页面使用 `UiButton` 等），原语内部仍渲染旧 `.btn-*`/现有结构，确保视觉与交互不变；用 focused tests 锁定原语 API 与关键调用点，避免迁移扩散导致回归。

**Tech Stack:** Vue 3, Vitest（focused）

**设计文档:** `docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-2-primitives-consumption-design.md`

---

## 文件结构（File Map）

### 新增

| 文件 | 职责 |
|---|---|
| `src/components/shared/ui/UiButton.vue` | Button 原语（第一版复用 `.btn-*`） |
| `src/components/shared/ui/UiIconButton.vue` | IconButton 原语（第一版复用 `.btn-icon`） |
| `src/components/shared/ui/__tests__/UiButton.test.ts` | 原语单测（API 与状态） |
| `src/components/shared/ui/__tests__/UiIconButton.test.ts` | 原语单测 |

### 修改（示例调用点，先少量）

| 文件 | 变更 |
|---|---|
| `src/components/settings/parts/SettingsAboutSection.vue` | 使用 `UiButton` 替换 `.btn-*` 直写 |
| `src/components/launcher/parts/LauncherSafetyOverlay.vue` | 使用 `UiButton` |
| `src/components/launcher/parts/LauncherStagingPanel.vue` | 使用 `UiButton`/`UiIconButton` |
| `docs/active_context.md` | 追加 ≤200 字摘要 |

---

## Chunk 1: 原语落地（先锁 API）

### Task 1: `UiButton`/`UiIconButton` 的 characterization tests

**Files:**
- Create: `src/components/shared/ui/__tests__/UiButton.test.ts`
- Create: `src/components/shared/ui/__tests__/UiIconButton.test.ts`

- [ ] **Step 1: 先写失败测试，锁定对外 API（variant/size/disabled/事件）**
- [ ] **Step 2: 跑测试确认失败**

Run:
- `npm test -- src/components/shared/ui/__tests__/UiButton.test.ts`

Expected:
- FAIL（组件不存在/导入失败）

### Task 2: 实现 `UiButton`/`UiIconButton`（第一版复用旧 `.btn-*`）

**Files:**
- Create: `src/components/shared/ui/UiButton.vue`
- Create: `src/components/shared/ui/UiIconButton.vue`

- [ ] **Step 1: 写最小实现让测试通过**

约束：
- 不引入硬编码色值
- `UiIconButton` 必须有 `aria-label`（a11y 门禁）
- class 输出先复用旧 `.btn-*`（视觉零差异）

- [ ] **Step 2: 跑 focused tests**

Run:
- `npm test -- src/components/shared/ui/__tests__/UiButton.test.ts`

Expected:
- PASS

- [ ] **Step 3: 提交 checkpoint**

```bash
git add src/components/shared/ui
git commit -m "feat(ui):新增共享按钮原语（视觉零差异版）"
```

---

## Chunk 2: 少量调用点迁移（只改消费方式）

### Task 3: 迁移 2-3 个“按钮集中”的调用点

**Files:**
- Modify: `src/components/settings/parts/SettingsAboutSection.vue`
- Modify: `src/components/launcher/parts/LauncherSafetyOverlay.vue`
- Modify: `src/components/launcher/parts/LauncherStagingPanel.vue`

- [ ] **Step 1: 逐文件迁移，每改一个就跑对应 focused tests**

建议顺序（从最稳定的开始）：
1) `SettingsAboutSection.vue`
2) `LauncherSafetyOverlay.vue`
3) `LauncherStagingPanel.vue`

- [ ] **Step 2: 验证视觉零差异（本地 tauri:dev 手验）**

- [ ] **Step 3: 提交 checkpoint**

```bash
git add src/components/settings/parts/SettingsAboutSection.vue src/components/launcher/parts/LauncherSafetyOverlay.vue src/components/launcher/parts/LauncherStagingPanel.vue
git commit -m "refactor(ui):页面改为消费共享按钮原语（视觉零差异）"
```

---

## 收尾：短期记忆 + Phase 验收

### Task 4: 记录 active_context 并做 Phase 2 总验收

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 追加 ≤200 字摘要**
- [ ] **Step 2: 跑 focused scripts + 全量门禁**

Run:
- `npm run test:flow:launcher`
- `npm run test:flow:settings`
- `npm run check:all`

Expected:
- PASS

- [ ] **Step 3: 提交**

```bash
git add docs/active_context.md
git commit -m "docs:记录 Tailwind Phase 2 进展"
```

