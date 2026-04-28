# Runtime Audit Follow-up Closures Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收口本轮审计剩余 4 个真实问题：队列项不会随 catalog 在线刷新重建、`adminRequired` 跨平台契约失真、catalog refresh 会吞掉二次刷新意图、终端缓存失配时缺少自愈重试。

**Architecture:** 保持现有对外交互与主要 API 不变，把修复集中在 4 个明确边界：1）为 Launcher 运行时增加“staged queue 跟随 catalog 重建”同步器；2）把 `adminRequired` 的 Windows-only 约束前移到 schema business rule；3）为 command catalog refresh 加 `needsRerun`，保留 singleflight 但不丢刷新意图；4）为终端执行增加一次后端重发现后的单次重试。

**Tech Stack:** Vue 3、TypeScript、Vitest、Rust、Tauri

---

## Chunk 1: 失败测试先行

### Task 1: queue 跟随 catalog 在线刷新重建

**Files:**
- Create: `src/composables/__tests__/app/stagedCatalogSync.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试确认 RED**

### Task 2: `adminRequired` 仅允许 Windows

**Files:**
- Modify: `src/features/commands/__tests__/schemaValidation.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试确认 RED**

### Task 3: catalog refresh 不吞刷新意图

**Files:**
- Modify: `src/composables/__tests__/launcher/commandCatalogController.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试确认 RED**

### Task 4: 终端缓存失配后自动重发现并单次重试

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试确认 RED**

## Chunk 2: 最小实现

### Task 5: catalog queue 同步器

**Files:**
- Create: `src/composables/app/useAppCompositionRoot/stagedCatalogSync.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`

- [ ] **Step 1: 增加 queue 重建同步器并接入 Launcher runtime**
- [ ] **Step 2: 保持缺失模板时 stale 阻断语义**

### Task 6: schema business rule 收口 Windows-only 提权语义

**Files:**
- Modify: `src/features/commands/schemaBusinessRules.ts`

- [ ] **Step 1: 为非 Windows 平台的 `adminRequired=true` 返回业务规则错误**

### Task 7: catalog refresh `needsRerun`

**Files:**
- Modify: `src/composables/launcher/useCommandCatalog/controller.ts`

- [ ] **Step 1: in-flight 期间记录脏标记**
- [ ] **Step 2: 当前 refresh 结束后若脏则自动补跑一轮**

### Task 8: terminal invalid-request 自愈重试

**Files:**
- Modify: `src/composables/launcher/useTerminalExecution.ts`

- [ ] **Step 1: 仅在 trusted cache + `invalid-request` 场景下触发重发现**
- [ ] **Step 2: 修正默认终端后只重试一次**

## 验证

- [ ] `npm run test:run -- src/composables/__tests__/app/stagedCatalogSync.test.ts src/features/commands/__tests__/schemaValidation.test.ts src/composables/__tests__/launcher/commandCatalogController.test.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- [ ] `npm run typecheck`

