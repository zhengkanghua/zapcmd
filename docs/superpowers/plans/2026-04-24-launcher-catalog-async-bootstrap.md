# Launcher Catalog Async Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Launcher 先渲染 UI，再在启动后异步全量加载命令目录，并在搜索区显示明确加载态。

**Architecture:** 扩展 `useCommandCatalog` 为显式加载状态机，builtin/user command loading 全部放到 mounted 后异步执行。搜索区消费 catalog loading 状态，在 query 非空且目录未 ready 时渲染加载提示。顺手消除启动链路重复 hydrate。

**Tech Stack:** Vue 3, Pinia, Vitest, Tauri bridge

---

## Chunk 1: Catalog 状态与异步加载

### Task 1: 为 command catalog 增加显式 loading 状态

**Files:**
- Modify: `src/composables/launcher/useCommandCatalog/types.ts`
- Modify: `src/composables/launcher/useCommandCatalog/state.ts`
- Modify: `src/composables/launcher/useCommandCatalog.ts`
- Test: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 跑定向测试确认失败**
- [ ] **Step 3: 最小实现 `idle/loading/ready/error` 状态与兼容 `catalogReady`**
- [ ] **Step 4: 跑定向测试确认通过**

### Task 2: 将 builtin + user command loading 放到 mounted 后异步执行

**Files:**
- Modify: `src/composables/launcher/useCommandCatalog.ts`
- Modify: `src/composables/launcher/useCommandCatalog/runtimePlatform.ts`
- Test: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`

- [ ] **Step 1: 写失败测试，验证 Tauri 首屏挂载时 catalog 先进入 loading，再进入 ready**
- [ ] **Step 2: 跑定向测试确认失败**
- [ ] **Step 3: 最小实现异步全量加载**
- [ ] **Step 4: 跑定向测试确认通过**

## Chunk 2: 搜索区加载态

### Task 3: 搜索区在 query 非空且 catalog loading 时显示加载提示

**Files:**
- Modify: `src/components/launcher/types.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherVm.ts`
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/i18n/messages.ts`
- Test: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 跑定向测试确认失败**
- [ ] **Step 3: 最小实现 loading UI，保留 query，不再误显示 noResult**
- [ ] **Step 4: 跑定向测试确认通过**

## Chunk 3: 启动链路去重 hydrate

### Task 4: 消除入口与 composition scene 的重复 hydrate

**Files:**
- Modify: `src/composables/app/useAppCompositionRoot/launcherEntry.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Test: `src/composables/__tests__/app/useLauncherEntry.test.ts`

- [ ] **Step 1: 写失败测试，验证入口只 hydrate 一次**
- [ ] **Step 2: 跑定向测试确认失败**
- [ ] **Step 3: 最小实现去重**
- [ ] **Step 4: 跑定向测试确认通过**

## Chunk 4: 记忆与验证

### Task 5: 更新短期记忆并跑定向验证

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 补充短期记忆（200 字以内）**
- [ ] **Step 2: 运行 `npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts src/composables/__tests__/app/useLauncherEntry.test.ts`**
- [ ] **Step 3: 如有需要，再跑 `npm run typecheck`**
