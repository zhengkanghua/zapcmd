# Launcher Boundary And Command Catalog Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收口 Launcher 运行时的编译期边界，并把 `useCommandCatalog.ts` 拆成更小职责文件，在不改变现有行为 contract 的前提下降低维护和回归风险。

**Architecture:** 本轮不做对外 API 重写，不删除公开入口，不改 Launcher / Settings 的现有运行路径。第一阶段只把 `launcherEntry.ts` 中的 helper 和 context 类型拆开，让 Launcher 不再伪装成“全量 app context”；第二阶段把 `useCommandCatalog.ts` 的 merge/runtime-platform/lifecycle/state 逻辑拆成子模块，保留 `useCommandCatalog()` 的对外返回值和现有测试契约不变。

**Tech Stack:** Vue 3 Composition API, TypeScript, Vitest, Vue Test Utils

---

## Chunk 1: Launcher Entry Boundary

### Task 1: 先为 Launcher helper 抽离补失败测试

**Files:**
- Create: `src/composables/__tests__/app/launcherSettingsWindow.test.ts`
- Modify: `src/composables/__tests__/app/useLauncherEntry.test.ts`

- [ ] **Step 1: 写失败测试，锁定待抽离 helper 的行为 contract**

```ts
describe("createLauncherSettingsWindow", () => {
  it("uses fallback terminals and broadcasts persistence when default terminal is corrected", async () => {
    // 先写到新测试文件；因为模块尚不存在，测试应先失败。
  });
});
```

- [ ] **Step 2: 运行定向测试并确认 RED**

Run: `npm run test:run -- src/composables/__tests__/app/launcherSettingsWindow.test.ts`
Expected: FAIL，原因是待抽离模块尚不存在。

### Task 2: 抽离 Launcher helper 与显式 context 类型

**Files:**
- Create: `src/composables/app/useAppCompositionRoot/launcherSettingsWindow.ts`
- Create: `src/composables/app/useAppCompositionRoot/launcherAppearance.ts`
- Create: `src/composables/app/useAppCompositionRoot/launcherContext.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherEntry.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherVm.ts`

- [ ] **Step 1: 最小实现 helper 抽离**

要求：
- 把 `createSettingsSyncBroadcaster / ensureDefaultTerminal / createLauncherSettingsWindow` 抽到 `launcherSettingsWindow.ts`
- 把 `bindLauncherAppearanceState` 抽到 `launcherAppearance.ts`
- 在 `launcherContext.ts` 中定义 Launcher 自己的 context 类型与 `createLauncherRuntimeContext()`，避免 `launcherEntry.ts` 再 `as ReturnType<typeof createAppCompositionContext>`
- `runtime.ts` 与 `launcherVm.ts` 改为依赖新的显式 Launcher context 类型，而不是 `createAppCompositionContext`
- 不改任何对外 return shape

- [ ] **Step 2: 运行 Launcher 定向测试确认 GREEN**

Run: `npm run test:run -- src/composables/__tests__/app/launcherSettingsWindow.test.ts src/composables/__tests__/app/useLauncherEntry.test.ts`
Expected: 全部通过。

## Chunk 2: Command Catalog Split

### Task 3: 为 command catalog 子模块抽离补失败测试

**Files:**
- Create: `src/composables/__tests__/launcher/commandCatalogMerge.test.ts`

- [ ] **Step 1: 写失败测试，锁定 merge / override / source-map 行为**

```ts
describe("commandCatalog merge helpers", () => {
  it("lets user commands override builtin commands and keeps source ids aligned", () => {
    // 新测试先引用尚不存在的拆分模块，确保先 RED。
  });
});
```

- [ ] **Step 2: 运行定向测试并确认 RED**

Run: `npm run test:run -- src/composables/__tests__/launcher/commandCatalogMerge.test.ts`
Expected: FAIL，原因是待抽离模块尚不存在。

### Task 4: 拆分 `useCommandCatalog.ts`

**Files:**
- Create: `src/composables/launcher/useCommandCatalog/merge.ts`
- Create: `src/composables/launcher/useCommandCatalog/runtimePlatform.ts`
- Create: `src/composables/launcher/useCommandCatalog/lifecycle.ts`
- Create: `src/composables/launcher/useCommandCatalog/state.ts`
- Create: `src/composables/launcher/useCommandCatalog/types.ts`
- Modify: `src/composables/launcher/useCommandCatalog.ts`
- Modify: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`

- [ ] **Step 1: 抽离纯函数与状态装配**

要求：
- `merge.ts` 承载 merge/override/source-map/filter helpers
- `runtimePlatform.ts` 承载 runtime platform 规范化与一次性解析
- `state.ts` 承载 create state / return builder
- `lifecycle.ts` 承载 watchers + mounted hook 绑定
- `useCommandCatalog.ts` 保留总装配与 public API，文件行数显著下降

- [ ] **Step 2: 跑 command catalog 相关回归**

Run: `npm run test:run -- src/composables/__tests__/launcher/commandCatalogMerge.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts`
Expected: 全部通过。

## Chunk 3: Verification

### Task 5: 收口验证与短期记忆

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 跑本轮静态与定向验证**

Run:
- `npm run test:run -- src/composables/__tests__/app/launcherSettingsWindow.test.ts src/composables/__tests__/app/useLauncherEntry.test.ts src/composables/__tests__/launcher/commandCatalogMerge.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts`
- `npm run lint`
- `npm run typecheck`

Expected:
- 定向回归全绿
- lint / typecheck 全绿

- [ ] **Step 2: 更新短期记忆**

```md
- 2026-04-23：Launcher 边界已切到显式 context 类型，`useCommandCatalog` 已拆成子模块；相关 app/launcher 定向回归、lint、typecheck 通过。
```

- [ ] **Step 3: 向用户汇报**

输出：
- 实际拆分范围
- 是否保留原有对外 contract
- 验证范围
- 剩余未处理的大文件/架构债
