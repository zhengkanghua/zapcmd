# 运行时审查收口实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 2026-04-24 工程审查中确认的真实问题：i18n 漏网、执行错误分类脆弱、LauncherWindow 兼容事件面过大、app composition root 顶层装配偏厚，以及 launcher session 持久化高频序列化热点。

**Architecture:** 保持现有 Vue 3 + Pinia + Tauri 组合方式不变，优先复用既有 `launcherRuntimeAssembly`、`CommandExecutionError`、`useLauncherSessionState`、theme/motion registry 出口，只在现有边界内做收口。行为改动以 TDD 推进，先写失败测试，再做最小实现，最后跑定向验证与基础门禁。

**Tech Stack:** Vue 3 Composition API、TypeScript、Vitest、Pinia、vue-i18n、Tauri

---

### Task 1: 写失败测试和计划基线

**Files:**
- Modify: `src/composables/__tests__/app/useTheme.test.ts`
- Modify: `src/composables/__tests__/app/useMotionPreset.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherSessionState.test.ts`

- [ ] **Step 1: 为 i18n 收口写失败测试**

覆盖点：
1. `en-US` 下 theme/motion 元数据不应夹杂中文。
2. `LauncherActionPanel` 的动作标签应可切到英文。
3. `SettingsAppearanceSection` 消费侧在英文 locale 下渲染英文文案。

- [ ] **Step 2: 为错误码分类收口写失败测试**

覆盖点：
1. `CommandExecutionError(code, message)` 按 `code` 返回稳定反馈。
2. 普通 `Error("ENOENT ...")` 不再映射到“切换终端”这类特定 next step，而是统一 unknown fallback。

- [ ] **Step 3: 为 LauncherWindow 外部事件契约写失败测试**

覆盖点：
1. 仅 `blank-pointerdown` 与 `execution-feedback` 需要对外暴露。
2. `flow-panel-*`、`request-command-panel-exit`、`search-page-settled` 等属于内部消化，不再要求向上透传。

- [ ] **Step 4: 为 session persistence 触发模型写失败测试**

覆盖点：
1. 参数编辑仍可延迟持久化。
2. 仅修改 `execution` 或 `args` 等非最小快照字段时，不触发持久化。

- [ ] **Step 5: 运行失败测试**

Run:
`npm run test:run -- src/composables/__tests__/app/useTheme.test.ts src/composables/__tests__/app/useMotionPreset.test.ts src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/composables/__tests__/launcher/useLauncherSessionState.test.ts`

Expected:
至少若干断言失败，且失败原因与本轮目标行为一致。

### Task 2: 修复用户可见文案未走 i18n 的问题

**Files:**
- Modify: `src/components/launcher/parts/LauncherActionPanel.vue`
- Modify: `src/features/themes/themeRegistry.ts`
- Modify: `src/features/motion/motionRegistry.ts`
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 让 theme/motion registry 只承载稳定元数据**

保留 `id`、`frameBackgroundColor`、`colorScheme` 等稳定字段，移除或本地化用户可见 name/description/badge 文案。

- [ ] **Step 2: 在消费层统一用 `t(...)` 解析展示文案**

更新 `SettingsAppearanceSection`，按 `theme.id` / `motionPreset.id` 取消息表文案。

- [ ] **Step 3: 让 LauncherActionPanel 动作标签走 i18n**

将 `execute/stage/copy` 的文本改为翻译 key。

- [ ] **Step 4: 运行相关测试**

Run:
`npm run test:run -- src/composables/__tests__/app/useTheme.test.ts src/composables/__tests__/app/useMotionPreset.test.ts src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`

Expected:
全部通过。

### Task 3: 将执行失败反馈收口为 code-based

**Files:**
- Modify: `src/composables/execution/useCommandExecution/helpers.ts`
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 1: 删除字符串关键词分类逻辑**

去掉对中英文错误文案的 `marker` 猜测，仅保留结构化 `code` 分支与 unknown fallback。

- [ ] **Step 2: 建立结构化 code -> feedback 映射**

至少覆盖：
1. `elevation-cancelled`
2. `elevation-launch-failed`
3. `terminal-launch-failed`

- [ ] **Step 3: 保留非结构化错误的统一兜底**

普通 `Error` 或字符串错误仍展示 reason，但 next step 使用 unknown fallback。

- [ ] **Step 4: 运行执行链测试**

Run:
`npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`

Expected:
全部通过。

### Task 4: 收缩 LauncherWindow 事件面并继续收敛 runtime 装配边界

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherRuntimeAssembly.ts`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/composables/__tests__/app/useAppCompositionRoot.index.test.ts`
- Modify: `src/composables/__tests__/app/useLauncherEntry.test.ts`

- [ ] **Step 1: 删除未被父层消费的外部 emit 声明与透传**

以 `App.vue` 当前真实监听契约为准，保留必要事件，其他改为内部行为闭环。

- [ ] **Step 2: 将 runtime/context 可复用装配继续下沉到 helper**

只移动纯装配逻辑，不改变 `launcherVm`、`useLauncherEntry`、`App.vue` 的对外形状。

- [ ] **Step 3: 运行契约测试**

Run:
`npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/composables/__tests__/app/useAppCompositionRoot.index.test.ts src/composables/__tests__/app/useLauncherEntry.test.ts`

Expected:
全部通过。

### Task 5: 优化 launcher session 持久化触发模型

**Files:**
- Modify: `src/composables/launcher/useLauncherSessionState.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherSessionState.test.ts`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 用稳定签名替代 deep watch**

围绕最小持久化 DTO 构建结构签名和参数签名，只观察真正影响 session snapshot 的字段。

- [ ] **Step 2: 保持现有 debounce / suspend / flush 合同**

保留 180ms debounce、`suspendPersistence`、scope dispose flush 等行为。

- [ ] **Step 3: 运行 session 定向测试**

Run:
`npm run test:run -- src/composables/__tests__/launcher/useLauncherSessionState.test.ts`

Expected:
全部通过。

- [ ] **Step 4: 更新短期记忆并跑基础门禁**

Run:
`npm run lint`
`npm run typecheck`
`npm run build`

Expected:
全部通过。
