# 运行时审查问题收口计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复本轮审查中确认的真实问题：主窗口设置同步失真、Rust 后台线程调度粗糙、`prerequisites.rs` 复杂度债与门禁不一致。

**Architecture:** 先按 TDD 修复主窗口设置同步契约，确保 `settings-updated` / `storage` 真正刷新 store，再把 Rust 侧“每事件起线程”收敛为可复用、可收口的调度模型，最后拆分 `command_catalog/prerequisites.rs` 并同步更新复杂度守卫策略。外部 API 与现有用户行为保持稳定，只修正错误语义与内部实现边界。

**Tech Stack:** Vue 3、Pinia、Vitest、Tauri 2、Rust、cargo test、项目自定义 complexity/style guard

---

### Task 1: 修复主窗口设置同步契约

**Files:**
- Modify: `src/composables/app/useAppCompositionRoot/launcherSettingsWindow.ts`
- Modify: `src/composables/__tests__/app/useLauncherEntry.test.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试，确认因未 hydrate 而失败**
- [ ] **Step 3: 最小修改 launcher 侧 `loadSettings()`，先 hydrate，再按需纠正 terminal**
- [ ] **Step 4: 运行定向测试，确认通过**

### Task 2: 收敛 Rust 后台线程调度

**Files:**
- Modify: `src-tauri/src/app_state.rs`
- Modify: `src-tauri/src/startup.rs`
- Modify: `src-tauri/src/bounds.rs`
- Add: `src-tauri/src/windowing.rs` 或 `src-tauri/src/startup.rs` 内部辅助（按实现需要）
- Test: `src-tauri/src/bounds/tests_logic.rs`、相关 Rust 单测文件

- [ ] **Step 1: 先为“重复事件不应无界起后台任务”补逻辑测试**
- [ ] **Step 2: 把终端刷新与失焦隐藏改成可复用/可收口的调度**
- [ ] **Step 3: 运行 Rust 定向测试与 `cargo test`**

### Task 3: 拆分 `prerequisites.rs` 并收紧复杂度治理

**Files:**
- Modify: `src-tauri/src/command_catalog.rs`
- Modify: `src-tauri/src/command_catalog/prerequisites.rs`
- Add: `src-tauri/src/command_catalog/prerequisites/*.rs`（按职责拆分）
- Modify: `scripts/complexity-guard-lib.mjs`
- Test: Rust 相关单测、`scripts/__tests__/complexity-guard.test.ts`

- [ ] **Step 1: 先为 complexity guard 行为补/调测试**
- [ ] **Step 2: 以不改外部 contract 为前提拆分 `prerequisites.rs`**
- [ ] **Step 3: 收紧 allowlist 策略，避免继续掩盖新增生产债**
- [ ] **Step 4: 运行 `check:complexity-guard` 与相关测试**

### Task 4: 验证与文档

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 更新短期记忆，补充本轮修复摘要**
- [ ] **Step 2: 运行 `lint`、`typecheck`、`test:coverage`、`check:rust`、`test:rust`、`check:complexity-guard`**
- [ ] **Step 3: 记录实际通过结果与剩余风险**
