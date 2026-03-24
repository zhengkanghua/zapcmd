# Tailwind Primitives Migration（阶段性收尾）Implementation Plan：门禁全绿 + 追加短期记忆 + 小步提交（不合并 main）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**执行顺序：** 4/4

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

1)（可能需沙箱外）门禁全绿：`npm run check:all` + `npm run test:visual:ui`  
2) `docs/active_context.md` 追加 ≤200 字短期记忆并提交（只追加不覆盖）  
3) 小步提交并 push 分支（不合并 main）  
4) 输出下一会话用于 `$finishing-a-development-branch` 的可复制 prompt

## 操作清单（执行前先搜索定位，禁止猜测）

- [ ] `cd .worktrees/feat-tailwind-primitives-migration`
- [ ] `git status -sb`（如 ahead 则先 push；如一致则继续）

## Task 1：确认提交粒度与工作区状态

- [ ] `git status` 确认是否仍有未提交变更（避免把 baseline/组件迁移/section 迁移揉成一个提交）
- [ ] 如存在大块混杂变更：先按文件/任务拆分 add（必要时用 `git add -p`）

## Task 2：门禁全绿（作为阶段验收口径）

- [ ] `npm run check:all`
- [ ]（Windows）`npm run test:visual:ui`

## Task 3：追加短期记忆（≤200 字，只追加不覆盖）

**Files:**
- Modify: `docs/active_context.md`

- [ ] 在 `docs/active_context.md` 末尾追加 ≤200 字摘要（包含：本轮完成项、残留 TODO、是否有 LightningCSS warning）
- [ ] `git add docs/active_context.md`
- [ ] `git commit -m "docs:记录 Tailwind primitives 迁移阶段进展"`

## Task 4：push 分支（不合并 main）

- [ ] `git push`

## Task 5：下一会话（用于 `$finishing-a-development-branch`）可复制 prompt

> 把下面这段原样复制到下一会话（可按实际情况补充/删减）。

```text
$finishing-a-development-branch

背景/约束：
- 仓库：D:\own_projects\zapcmd
- 开发位置：.worktrees/feat-tailwind-primitives-migration
- 分支：feat/tailwind-primitives-migration（不要自动合并到 main）

请先做：
- cd .worktrees/feat-tailwind-primitives-migration
- git status -sb

验收口径：
- （可能需沙箱外）npm run check:all
- （可能需沙箱外）npm run test:visual:ui

如果门禁全绿，请给出 finishing-a-development-branch 的 4 个选项，并默认推荐“Push and create a Pull Request”（不自动合并 main）。
```
