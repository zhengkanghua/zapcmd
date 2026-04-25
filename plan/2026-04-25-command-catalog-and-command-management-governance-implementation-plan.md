# Command Catalog 与 Command Management 治理实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有用户行为与外部 contract 的前提下，收口 `useCommandCatalog` 的控制器复杂度，并把命令管理页的渐进渲染窗口前移到数据层，降低后续维护与性能风险。

**Architecture:** `useCommandCatalog` 继续保留现有对外 API，但把请求版本保护、内置命令装载、用户命令应用与错误收口拆到子模块中，让顶层只负责装配。`useCommandManagement` 新增“可见行窗口”状态与推进逻辑，`SettingsCommandsSection` 改为消费 composable 下发的窗口结果，而不是在组件层自己维护计时器和切片。

**Tech Stack:** Vue 3 Composition API、TypeScript、Vitest、Pinia

---

### Task 1: 为 Command Catalog 控制器拆分补回归测试

**Files:**
- Modify: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`

- [ ] **Step 1: 写失败测试，固定 latest-only 与错误收口 contract**

覆盖点：
1. 旧请求晚返回时，不得覆盖最新 catalog。
2. builtin 已加载但用户扫描失败时，catalog 保持 ready 且保留 builtin。
3. 缺少 user ports 时，错误类型保持 `read-failed`，不被拆分重构改坏。

- [ ] **Step 2: 运行测试确认先红**

Run:
`npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts`

Expected:
新增断言先失败，失败原因与准备拆分的控制器行为有关。

- [ ] **Step 3: 做最小实现并保持外部 API 不变**

涉及文件：
- `src/composables/launcher/useCommandCatalog.ts`
- `src/composables/launcher/useCommandCatalog/requestGuard.ts`
- `src/composables/launcher/useCommandCatalog/controller.ts`

- [ ] **Step 4: 运行定向测试确认转绿**

Run:
`npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts src/composables/__tests__/launcher/commandCatalogMerge.test.ts`

Expected:
全部通过。

### Task 2: 把命令管理页渐进渲染窗口前移到 composable

**Files:**
- Modify: `src/composables/__tests__/settings/useCommandManagement.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`

- [ ] **Step 1: 写失败测试，固定新的数据层窗口 contract**

覆盖点：
1. `useCommandManagement` 暴露首屏窗口行数和推进方法。
2. 视图过滤变化时，窗口会重置到初始上限。
3. `SettingsCommandsSection` 仅负责调度 timer，不再自行维护切片状态。

- [ ] **Step 2: 运行测试确认先红**

Run:
`npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`

Expected:
新增断言先失败，说明 composable 还未提供窗口能力。

- [ ] **Step 3: 做最小实现并保持 DOM contract 不变**

涉及文件：
- `src/composables/settings/useCommandManagement/index.ts`
- `src/composables/settings/useCommandManagement/rows.ts`
- `src/components/settings/parts/SettingsCommandsSection.vue`

- [ ] **Step 4: 运行定向测试确认转绿**

Run:
`npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`

Expected:
全部通过。

### Task 3: 更新短期记忆并做全量验证

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 补充短期记忆**

记录本轮两项治理：`useCommandCatalog` 控制器拆分、命令管理窗口前移。

- [ ] **Step 2: 运行全量验证**

Run:
`npm run check:all`

Expected:
全绿。
