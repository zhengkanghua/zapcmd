# Tailwind Primitives Migration Phase 5 Implementation Plan：Settings 三个 Section（Hotkeys / Appearance / About）移除 `<style scoped>` 并 Tailwind 化

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**执行顺序：** 2/4

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

清理并 Tailwind 化 Settings 的三个 Section，移除 `<style scoped>`，保持结构/交互/视觉语义不变：
- `src/components/settings/parts/SettingsHotkeysSection.vue`
- `src/components/settings/parts/SettingsAppearanceSection.vue`
- `src/components/settings/parts/SettingsAboutSection.vue`

## 操作清单（执行前先搜索定位，禁止猜测）

- [ ] `cd .worktrees/feat-tailwind-primitives-migration`
- [ ] `git status -sb`（如 ahead 则先 push；如一致则继续）

## Task 1：列出仍含 `<style scoped>` 的 section（以事实驱动范围）

- [ ] `rg -n "<style scoped" src/components/settings/parts/*.vue`
- [ ] 确认至少包含：
  - `src/components/settings/parts/SettingsHotkeysSection.vue`
  - `src/components/settings/parts/SettingsAppearanceSection.vue`
  - `src/components/settings/parts/SettingsAboutSection.vue`

## Task 2：统一迁移策略（每个 section 都走同一套路）

**迁移策略（Hybrid）：**
- 仅将“布局/间距/排版/边框/背景/交互态”等 scoped CSS 迁到模板 Tailwind utilities
- 保留原有语义结构与 BEM/状态类（避免测试断裂）
- 若出现缺语义 token：先补 `src/styles/tokens.css`（只加 `--ui-*`）再继续

**每个 section 的执行顺序（强制）：**
1) 迁移模板 + 删除 `<style scoped>`
2) 跑对应 `parts/__tests__` focused tests
3) 跑 `npm run check:all`
4) 小步 commit（保持可回滚）

## Task 3：SettingsHotkeysSection Tailwind 化

**Files:**
- Modify: `src/components/settings/parts/SettingsHotkeysSection.vue`
- Test: `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`

- [ ] `rg -n "<style scoped" src/components/settings/parts/SettingsHotkeysSection.vue`（确认待迁移范围）
- [ ] 将 scoped CSS 对应的布局/间距/排版迁到模板（arbitrary px 优先）
- [ ] 删除 `<style scoped>`（不要遗留空 style block）
- [ ] focused test：`npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- [ ] 总门禁：`npm run check:all`
- [ ] 小步提交：
  - `git add src/components/settings/parts/SettingsHotkeysSection.vue src/styles/tokens.css`
  - `git commit -m "refactor(settings-parts):HotkeysSection 移除 scoped CSS"`

## Task 4：SettingsAppearanceSection Tailwind 化

**Files:**
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`
- Test: `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`

- [ ] `rg -n "<style scoped" src/components/settings/parts/SettingsAppearanceSection.vue`（确认待迁移范围）
- [ ] 将 scoped CSS 对应的布局/间距/排版迁到模板（arbitrary px 优先）
- [ ] 删除 `<style scoped>`
- [ ] focused test：`npm run test:run -- src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`
- [ ] 总门禁：`npm run check:all`
- [ ] 小步提交：
  - `git add src/components/settings/parts/SettingsAppearanceSection.vue src/styles/tokens.css`
  - `git commit -m "refactor(settings-parts):AppearanceSection 移除 scoped CSS"`

## Task 5：SettingsAboutSection Tailwind 化

**Files:**
- Modify: `src/components/settings/parts/SettingsAboutSection.vue`
- Tests:
  - `src/components/settings/parts/__tests__/SettingsAboutSection.states-and-actions.test.ts`
  - `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`

- [ ] `rg -n "<style scoped" src/components/settings/parts/SettingsAboutSection.vue`（确认待迁移范围）
- [ ] 将 scoped CSS 对应的布局/间距/排版迁到模板（arbitrary px 优先）
- [ ] 删除 `<style scoped>`
- [ ] focused tests：
  - `npm run test:run -- src/components/settings/parts/__tests__/SettingsAboutSection.states-and-actions.test.ts`
  - `npm run test:run -- src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`
- [ ] 总门禁：`npm run check:all`
- [ ] 小步提交：
  - `git add src/components/settings/parts/SettingsAboutSection.vue src/styles/tokens.css`
  - `git commit -m "refactor(settings-parts):AboutSection 移除 scoped CSS"`
