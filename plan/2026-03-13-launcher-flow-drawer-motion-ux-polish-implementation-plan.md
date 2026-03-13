# Launcher Flow Drawer（Motion/UX Polish）Implementation Plan（含 Enter/鼠标左右键语义一致性修复）

日期：2026-03-13  
Spec：

- `docs/superpowers/specs/2026-03-13-launcher-flow-drawer-motion-ux-polish-design.md`

## Scope（本次计划覆盖）

1) 修复“结果区有焦点时 Enter 行为不一致”的问题：确保 **Enter=执行**、**→=加入执行流** 在“搜索区上下文”内一致生效（不依赖搜索输入框必须处于 focus）。  
2) 修复鼠标语义：**左键=立即执行**、**右键=加入执行流**（结果项 `contextmenu` 触发 stage；`click` 触发 execute）。  
3) （后续计划/同一 PR 继续）按 spec 把 Flow 抽屉动效从 Vue `<Transition>` 迁移到“状态类 + keyframes”，并把提示改为 `.keyboard-hint`（本计划先把行为一致性补齐，以降低动效重构时的回归复杂度）。
4) Flow Param 页底部 submit 按 `pendingSubmitMode` 分色：`stage=btn-stage`（加入执行流）、`execute=btn-success`（立即执行），并保持 `右键/→=加入执行流`、`左键/Enter=立即执行` 口径一致。

## Task 0：基线回归（只跑相关测试）

- [ ] Run：`npm run test:run -- src/__tests__/app.hotkeys.test.ts`

## Task 1（TDD）：Enter 在“结果抽屉获得焦点”时仍执行

### 1.1 RED：新增失败用例

- [ ] Add test：在 `src/__tests__/app.hotkeys.test.ts` 增加用例：
  - given：搜索出结果（drawerOpen=true），把焦点移动到 `.result-item`
  - when：`dispatchWindowKeydown("Enter")`
  - then：打开 `.flow-page--param` 且主按钮文案为“立即执行”（或队列数仍为 0）

Run：`npm run test:run -- src/__tests__/app.hotkeys.test.ts`

### 1.2 GREEN：实现

- [ ] 在 `src/features/hotkeys/windowKeydownHandlers/main.ts` 放宽 search hotkey 生效条件：当 `focusZone==='search'` 且焦点位于 `searchInputRef` 或 `drawerRef` 内时，仍处理导航/执行/入队热键。
- [ ] 为此在 `src/features/hotkeys/windowKeydownHandlers/types.ts` 增加 `drawerRef`，并在 `src/composables/app/useAppWindowKeydown.ts` / 绑定处传入 `context.domBridge.drawerRef`。

Run：`npm run test:run -- src/__tests__/app.hotkeys.test.ts`

### 1.3 REFACTOR

- [ ] 抽出 `isSearchContextActiveElement(...)` 辅助函数（仅当能减少重复/提升可读性时）。

## Task 2（TDD）：右键（contextmenu）加入执行流

### 2.1 RED：新增失败用例

- [ ] Add test：在 `src/__tests__/app.hotkeys.test.ts` 增加用例：
  - when：对 `.result-item` 触发 `contextmenu`
  - then：打开 `.flow-page--param` 且为 stage 模式（按钮“加入执行流”）

Run：`npm run test:run -- src/__tests__/app.hotkeys.test.ts`

### 2.2 GREEN：实现

- [ ] `src/components/launcher/parts/LauncherSearchPanel.vue`：
  - `@contextmenu.prevent` 触发 `stage-result`
  - `@click` 触发 `execute-result`
- [ ] 事件链路打通：
  - `src/components/launcher/LauncherWindow.vue` 透传 `execute-result`
  - `src/App.vue` 绑定到 `executeResult`
  - `src/composables/app/useAppCompositionRoot/viewModel.ts` 暴露 `executeResult: runtime.commandExecution.executeResult`

Run：`npm run test:run -- src/__tests__/app.hotkeys.test.ts`

## Task 3：收敛验收（本轮）

- [ ] Run：`npm run test:run -- src/__tests__/app.hotkeys.test.ts`
- [ ] Run：`npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts`（确保 UI 逻辑未回归）

## Notes

- 这轮先把“Enter/→/左键/右键”语义打直，能显著降低后续 Flow 动效重构（closing-right 延迟卸载/保持 DOM）引入的回归风险。
- reduce-motion 下的关闭时序应保持“立即完成”；动效时长建议收敛为常量，便于测试推进时间。
