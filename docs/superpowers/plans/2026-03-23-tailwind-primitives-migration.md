# Tailwind Primitives Migration（Roadmap）Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在开发分支以“页面消费原语（Primitives-First）”的方式引入 Tailwind，保持运行时多主题（`data-theme` + `--theme-*`/`--ui-*`）不变，并以“视觉零差异”为阶段验收目标；补齐开发期“快速验证某个流程”的命令（focused Vitest），减少 UI 重构回归风险。

**Architecture:** 保留现有 CSS Variables 主题与 token 体系作为唯一真相源；Tailwind 仅负责“原语组件内部的样式表达”，页面/业务组件主要消费原语并只保留少量布局 utilities。迁移按 Phase 1→2→3 顺序推进，每个 Phase 都要求有可复用的 focused 验证命令与可回滚的 checkpoint commit。

**Tech Stack:** Vue 3, Vite, TailwindCSS, PostCSS, Tauri v2, Vitest（focused）,（可选）tauri-driver + selenium-webdriver（desktop smoke）

**设计文档（总览）:** `docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-design.md`

---

## 0. 开发分支约束（必须遵守）

- 本计划 **只在开发分支执行**（推荐：`feat/tailwind-primitives-migration`）。
- 不要自动合并到 `main`；是否合并必须先做一次独立 code review，并由维护者显式确认。

---

## 1. 文档拆分（减少上下文污染）

### Phase Specs（按顺序阅读/执行）

1) Phase 1：工具链 + 快速验证  
`docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-1-toolchain-and-fast-validation-design.md`

2) Phase 2：引入共享原语并迁移消费方式（视觉零差异）  
`docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-2-primitives-consumption-design.md`

3) Phase 3：原语 Tailwind 化 + 清理旧 CSS + Guardrails  
`docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-3-tailwindize-and-guardrails-design.md`

4) Phase 4：Settings 小组件 Tailwind 化 + 截图级视觉回归扩展  
`docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-4-settings-ui-tailwindization-and-visual-regression-design.md`

### Phase Plans（按顺序执行）

1) Phase 1 Plan  
`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration-phase-1-toolchain-and-fast-validation.md`

2) Phase 2 Plan  
`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration-phase-2-primitives-consumption.md`

3) Phase 3 Plan  
`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration-phase-3-tailwindize-and-guardrails.md`

4) Phase 4 Plan  
`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration-phase-4-settings-ui-tailwindization-and-visual-regression.md`

---

## 2. 开发期快速验证（你要的“单命令验证某个流程”）

> 这类验证优先使用 Vitest focused（非 E2E）。E2E（desktop-smoke）仅作为“桌面壳层真实回归”的补充，不应成为每次 UI 调整的默认路径。

### 2.1 直接用现有命令（无需改 repo）

- 监听式（最快，适合 UI 调整）：`npm test -- <test-file>`
- 单次跑完：`npm run test:run -- <test-file>`
- 按改动自动挑选：`npm run test:related`
- 只验样式契约（极适合样式栈迁移）：`npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts`

示例：

```bash
# Launcher 主流程（watch）
npm test -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts

# Settings 基线（watch）
npm test -- src/components/settings/__tests__/SettingsWindow.layout.test.ts

# 样式 contract（run）
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

### 2.2 Phase 1 会把常用 focused 验证固化成 npm scripts

原因：减少记忆成本，避免每次都手打路径；同时让“重构验收口径”变成可复用的工程接口。

---

## 3. 每个 Phase 的验收门禁（强制）

- Phase 内每个 checkpoint：至少跑一次该 Phase 对应的 focused scripts（计划中会给出）
- Phase 结束：必须 `npm run check:all` 全绿
-（可选）Windows：跑一次 `npm run verify:local -- --e2e-only` 作为桌面壳层补充验证

---

## 4. 执行交接（建议每个 Phase 单独开会话）

每个 Phase 完成后必须：

1) `npm run check:all` 全绿（或明确记录卡点）  
2) `docs/active_context.md` 追加 ≤200 字摘要（只补充，不覆盖）  
3) 提交 checkpoint（保持可回滚、可审查）  
