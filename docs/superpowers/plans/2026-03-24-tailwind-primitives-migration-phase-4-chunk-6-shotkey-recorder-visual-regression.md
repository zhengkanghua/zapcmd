# Tailwind Primitives Migration Phase 4（Chunk 6 可选）Implementation Plan：SHotkeyRecorder Tailwind 化 + 视觉回归场景/基线

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**执行顺序：** 1/4  
**关联计划（参考，不要重复执行已完成项）：** `docs/superpowers/plans/2026-03-23-tailwind-primitives-migration-phase-4-settings-ui-tailwindization-and-visual-regression.md`（Chunk 6 / Task 10-11）

## 背景/约束（必须遵守）

- 仓库：`D:\\own_projects\\zapcmd`
- 开发位置：`.worktrees/feat-tailwind-primitives-migration`
- 分支：`feat/tailwind-primitives-migration`（不要自动合并到 main）
- 本环境常见限制：如遇 `spawn EPERM` / `index.lock`，`npm run check:all`、`npm run test:visual:ui`、以及 git add/commit/push 需要申请沙箱外（require_escalated）执行
- 样式硬门禁：
  - 只消费 `var(--ui-*)`
  - 禁止模板里硬编码色值（含 `#`/`rgb`/`rgba`/`hsl`）
  - 保留 BEM 类名与状态类
  - 为截图零差异优先用 arbitrary px（如 `gap-[10px]`），不要用近似的 Tailwind scale

## 强制启动读取（不可跳过）

1) `CLAUDE.md`  
2) `.ai/AGENTS.md`  
3) `.ai/TOOL.md`

## 目标（Goal）

1) Phase 4：补齐可选 Chunk 6：`SHotkeyRecorder` scoped CSS → Tailwind utilities（保留 BEM + `--empty/--recording/--conflict`）。  
2) 视觉回归：新增 `settings-ui-hotkey-recorder` 场景，并通过 `mounted/nextTick` 稳定进入“录制态”（避免 hover/时序抖动），生成/提交 baseline，并确保门禁稳定。

## 操作清单（执行前先搜索定位，禁止猜测）

- [ ] `cd .worktrees/feat-tailwind-primitives-migration`
- [ ] `git status -sb`（如 ahead 则先 push；如一致则继续）

## Task 1：确认现状（避免重复工作）

- [ ] `rg -n "settings-ui-hotkey-recorder" src/AppVisual.vue`（确认是否已存在场景）
- [ ] `rg -n "settings-ui-hotkey-recorder" scripts/e2e/visual-regression.cjs`（确认是否已存在 screenshot 配置）
- [ ] `ls scripts/e2e/visual-baselines/settings-ui-hotkey-recorder.png`（确认 baseline 是否已存在）
- [ ] 打开 `src/components/settings/ui/SHotkeyRecorder.vue`（确认仍有 `<style scoped>`，并记录 BEM/状态类清单）

## Task 2：新增视觉回归场景 `settings-ui-hotkey-recorder`（稳定录制态）

**目标截图覆盖建议（同一场景内多状态并排，降低新增 screenshot 数量）：**
- 空态（placeholder）
- 默认态（已设置）
- 冲突态（conflict）
- 录制态（recording，且必须通过程序化触发）

**Files:**
- Modify: `src/AppVisual.vue`

- [ ] 在 `src/AppVisual.vue` 增加 `VisualScenarioId`：`"settings-ui-hotkey-recorder"`
- [ ] 增加 `normalizeScenario()` 分支，使 hash 能切到该场景
- [ ] 引入并渲染 `SHotkeyRecorder`（同一卡片内排布 2–4 个实例，覆盖上述状态）
- [ ] 为“录制态”实例增加稳定触发逻辑：
  - `onMounted` 内判断 `scenario`，再 `await nextTick()`
  - 程序化触发 `click()`（优先通过 `ref`，次选 `querySelector(".s-hotkey-recorder")`）
  - 禁止依赖 hover、禁止依赖 setTimeout（除非确有抖动证据且写明原因）

## Task 3：将场景纳入视觉回归脚本配置

**Files:**
- Modify: `scripts/e2e/visual-regression.cjs`

- [ ] 在 `SCREENSHOTS` 数组追加：
  - `id: "settings-ui-hotkey-recorder"`
  - `hash: "settings-ui-hotkey-recorder"`
  - viewport/阈值对齐现有 `settings-ui-*`（除非有明确理由）

## Task 4：生成并提交 baseline（harness/baseline 独立提交）

**Files:**
- Modify/Add: `scripts/e2e/visual-baselines/settings-ui-hotkey-recorder.png`

- [ ]（Windows）`npm run build`
- [ ]（Windows）生成 baseline：`npm run test:visual:ui:update`
- [ ]（Windows）验证稳定：`npm run test:visual:ui`
- [ ] 提交 baseline（与组件迁移分开 commit）：
  - `git add src/AppVisual.vue scripts/e2e/visual-regression.cjs scripts/e2e/visual-baselines/settings-ui-hotkey-recorder.png`
  - `git commit -m "test(visual):补齐 settings-ui-hotkey-recorder baseline"`

## Task 5：`SHotkeyRecorder` Tailwind 化（删 `<style scoped>`，保留 BEM/状态类）

**Files:**
- Modify: `src/components/settings/ui/SHotkeyRecorder.vue`
- (Optional) Modify: `src/styles/tokens.css`（仅当缺少语义 token 且无法用既有 `--ui-*` 表达）

**迁移策略（Hybrid）：**
- 模板用 Tailwind utilities 表达布局/排版/交互态
- 保留既有 BEM 类名与状态类：`s-hotkey-recorder` / `--empty` / `--recording` / `--conflict`
- 颜色/阴影只使用 `var(--ui-*)`；如需要新语义 token，先补 `src/styles/tokens.css`
- 为“截图零差异”，间距优先使用 arbitrary px（例如 `gap-[8px]`、`px-[10px]`）

- [ ] 将 `.s-hotkey-recorder-field` 的 grid/gap 迁到模板（`gap-[8px]`）
- [ ] 将 label 字号/颜色迁到模板（`text-[12px] text-[var(--ui-subtle)]`）
- [ ] 将 button 的尺寸/布局/边框/背景/字体/过渡迁到模板（注意 `fit-content` / `min/max inline-size` 口径不变）
- [ ] 将 `--empty/--recording/--conflict` 的边框与 ring/shadow 迁到模板（仅用 `var(--ui-*)`）
- [ ] 将 `:focus-visible` 的 ring/shadow 迁到模板（如触发 LightningCSS 警告，记录到“工程化/清噪”任务处理）
- [ ] 将 keys/kbd/sep/conflict 区块的排版迁到模板（保留 BEM 选择器用于测试）
- [ ] 删除 `<style scoped>`

## Task 6：focused 单测 + 门禁（通过才允许提交组件迁移）

- [ ] focused test：`npm run test:run -- src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`
- [ ]（可选但推荐）`npm run check:all`
- [ ]（Windows）`npm run test:visual:ui`

## Task 7：小步提交（组件迁移独立 commit，不合并 main）

- [ ] `git add src/components/settings/ui/SHotkeyRecorder.vue src/styles/tokens.css`
- [ ] `git commit -m "refactor(settings-ui):SHotkeyRecorder 改为 Tailwind 实现"`

