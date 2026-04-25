# Quality Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复当前项目中已确认的设置写入链路不一致、Queue/Flow 状态竞态、命令目录并发覆盖和高频交互性能热点。

**Architecture:** 本轮不做大规模重构，只修复已经由审查确认的真实问题，并保持现有 public API 与 UI 行为主路径稳定。实现上优先通过新增失败测试锁定问题，再做最小可验证修复；对 Settings contract 只做必要收口，不推进失控重塑。

**Tech Stack:** Vue 3、Pinia、Vitest、TypeScript、Tauri

---

## Chunk 1: Settings 写入链路统一

### Task 1: 锁定 Settings 双写与绕过 store action 的失败用例

**Files:**
- Modify: `src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowPointer.test.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试并确认按预期失败**
Run: `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts src/composables/__tests__/settings/useSettingsWindowPointer.test.ts src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
Expected: FAIL，暴露 autoCheck/language/defaultTerminal/pointerAction 的写入路径不统一
- [ ] **Step 3: 最小实现修复**
- [ ] **Step 4: 重跑定向测试确保通过**

### Task 2: 统一 useSettingsWindow 写入入口

**Files:**
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/general.ts`
- Modify: `src/composables/settings/useSettingsWindow/terminal.ts`
- Modify: `src/composables/settings/useSettingsWindow/persistence.ts`
- Modify: `src/composables/settings/useSettingsWindow/pointer.ts`

- [ ] **Step 1: 给 store contract 补齐必要 setter**
- [ ] **Step 2: 将 general/terminal/pointer/persistence 的状态改动统一收敛到 store action**
- [ ] **Step 3: 保持错误提示与持久化链路不变**
- [ ] **Step 4: 重跑 Settings 定向测试**

## Chunk 2: Queue / Flow 状态机修复

### Task 3: 锁定 flow reveal 关闭/失效后的悬挂任务风险

**Files:**
- Modify: `src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试并确认失败**
Run: `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts`
Expected: FAIL，close/reset 后旧 prepare 不能继续 reveal，但当前实现仍可能继续
- [ ] **Step 3: 实现 gate reset/cancel 与旧 reveal 失效保护**
- [ ] **Step 4: 重跑测试确保通过**

### Task 4: 收敛 queue close 期间的 reveal 语义

**Files:**
- Modify: `src/composables/launcher/useWindowSizing/controllerState.ts`
- Modify: `src/composables/launcher/useWindowSizing/flowRevealCoordinator.ts`
- Modify: `src/composables/launcher/useWindowSizing/controllerSync.ts`
- Modify: `src/composables/launcher/useCommandQueue/drawer.ts`

- [ ] **Step 1: 为 prepared gate 增加 generation/cancel 能力**
- [ ] **Step 2: 在 close 与 active 边界切换时显式 reset gate**
- [ ] **Step 3: 确保旧 prepare 不再推进 lockedHeight 或窗口 resize**
- [ ] **Step 4: 重跑 Queue/Flow 定向测试**

## Chunk 3: Command Catalog 并发保护

### Task 5: 锁定 latest-only 刷新语义

**Files:**
- Modify: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`
- Modify: `src/composables/launcher/useCommandCatalog.ts`
- Modify: `src/composables/launcher/useCommandCatalog/lifecycle.ts`

- [ ] **Step 1: 写失败测试，覆盖 locale 切换与 refresh 并发竞争**
- [ ] **Step 2: 运行测试确认失败**
Run: `npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts`
Expected: FAIL，旧请求结果覆盖新请求
- [ ] **Step 3: 增加请求序号/失效保护，只允许最新请求回写**
- [ ] **Step 4: 重跑测试确保通过**

## Chunk 4: 高频交互性能优化

### Task 6: Dropdown 全局交互改为 rAF 合帧

**Files:**
- Modify: `src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts`
- Modify: `src/components/settings/ui/useDropdownGlobalInteractions.ts`

- [ ] **Step 1: 写失败测试，锁定 resize/scroll 高频触发只合并到一帧**
- [ ] **Step 2: 运行测试确认失败**
Run: `npm run test:run -- src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts`
Expected: FAIL，当前每次事件都会直接同步位置
- [ ] **Step 3: 实现 rAF 调度与清理**
- [ ] **Step 4: 重跑测试确保通过**

### Task 7: Appearance 写入改为 settle 后持久化

**Files:**
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`

- [ ] **Step 1: 写失败测试，锁定多次 setWindowOpacity 只做一次 persist/broadcast**
- [ ] **Step 2: 运行测试确认失败**
Run: `npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
Expected: FAIL，当前每次 input 都立即持久化
- [ ] **Step 3: 实现 debounce/settle commit，并保证销毁时清理 timer**
- [ ] **Step 4: 重跑测试确保通过**

## 验证

- [ ] `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts src/composables/__tests__/settings/useSettingsWindowPointer.test.ts src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run check:rust`
- [ ] 补充 `docs/active_context.md`，追加 200 字以内短期记忆
