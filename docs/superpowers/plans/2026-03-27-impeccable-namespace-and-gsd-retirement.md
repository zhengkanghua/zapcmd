# Impeccable 命名空间收口与 Get-Shit-Done 退场 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将平铺的 impeccable skills 收口为命名空间目录，并移除项目内已弃用的 get-shit-done 入口与残留配置。

**Architecture:** 目录层面将 `.codex/skills/*` 下的 impeccable 子技能整体移动到 `.codex/skills/impeccable/`，同时新增 `.codex/impeccable/README.md` 作为元信息入口。活跃规则文档只保留当前工作流入口，不重写历史归档内容。

**Tech Stack:** Git, Markdown, Codex skills 目录约定, shell 文件移动, 仓库现有 `npm run check:all` 门禁

---

## Chunk 1: 文档与入口规则

### Task 1: 写入本轮设计与计划文档

**Files:**
- Create: `docs/superpowers/specs/2026-03-27-impeccable-namespace-and-gsd-retirement-design.md`
- Create: `docs/superpowers/plans/2026-03-27-impeccable-namespace-and-gsd-retirement.md`

- [x] **Step 1: 写入设计稿**
- [x] **Step 2: 写入实现计划**

### Task 2: 更新活跃入口文档

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `.ai/AGENTS.md`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 删除 AGENTS / CLAUDE 中的 `gsd-*` 触发要求**
- [ ] **Step 2: 将 `.ai/AGENTS.md` 改为引用 “impeccable 技能组” 而非平铺 skills**
- [ ] **Step 3: 在 `docs/active_context.md` 补充“impeccable 已命名空间化、get-shit-done 已弃用”的短期记忆**
- [ ] **Step 4: 运行文本检索，确认活跃入口不再引用 `gsd-*`**

## Chunk 2: 目录重构与清理

### Task 3: impeccable skills 收口到命名空间

**Files:**
- Create: `.codex/impeccable/README.md`
- Modify: `.codex/skills/impeccable/**`
- Remove: `.codex/skills/{adapt,animate,arrange,audit,bolder,clarify,colorize,critique,delight,distill,extract,frontend-design,harden,normalize,onboard,optimize,overdrive,polish,quieter,teach-impeccable,typeset}`

- [ ] **Step 1: 创建 `.codex/skills/impeccable/`**
- [ ] **Step 2: 将 21 个 impeccable skills 移入该目录**
- [ ] **Step 3: 新增 `.codex/impeccable/README.md` 说明命名空间结构**
- [ ] **Step 4: 检索 `.codex/skills/` 根目录，确认不再平铺 impeccable skills**

### Task 4: 删除 get-shit-done 残留

**Files:**
- Remove: `.codex/get-shit-done/`
- Remove: `.codex/gsd-file-manifest.json`

- [ ] **Step 1: 删除 `.codex/get-shit-done/`**
- [ ] **Step 2: 删除 `.codex/gsd-file-manifest.json`**
- [ ] **Step 3: 检索 `.codex/`，确认残留已清理**

## Chunk 3: 验证与收尾

### Task 5: 运行仓库验证

**Files:**
- Verify: `.codex/skills/`
- Verify: `AGENTS.md`
- Verify: `CLAUDE.md`
- Verify: `.ai/AGENTS.md`
- Verify: `docs/active_context.md`

- [ ] **Step 1: 运行目录检索**

Run: `find .codex/skills -mindepth 1 -maxdepth 1 -type d | sort`
Expected: 仅保留 `impeccable`、`superpowers`、`ui-ux-pro-max` 等顶层入口，不再平铺原 impeccable 子技能

- [ ] **Step 2: 运行文本检索**

Run: `rg -n "\\$gsd-|gsd-|get-shit-done|gsd-file-manifest" AGENTS.md CLAUDE.md .ai/AGENTS.md docs/active_context.md`
Expected: 只剩历史记忆或显式弃用说明，不再存在活跃入口要求

- [ ] **Step 3: 运行全量门禁**

Run: `npm run check:all`
Expected: exit code 0
