# Launcher Flow Drawer（Param/Safety）+ Review 双抽屉并存 Implementation Plan

> **For agentic workers:** REQUIRED：按 TDD（Red→Green→Refactor）执行；每一步使用 `- [ ]` 勾选追踪；不要引用/依赖旧文档 `docs/superpowers/specs/2026-03-10-launcher-review-drawer-overlay-design.md`，以 2026-03-12 spec 为唯一口径。

**Goal:** 将 Launcher 的参数填写与高危确认从“居中弹窗”迁移为 **左侧 Flow 抽屉（导航栈）**，并与 **右侧 Review 抽屉**并存；支持“左进右出”动效、2/3↔1/2 宽度切换、Flow 打开时 Search 输入禁用但 queue pill/热键可用、点击搜索输入区域=一次 Esc 回退。

**Architecture:** 引入 `LauncherFlowDrawer` 作为 Flow 容器（Param/Safety 页面栈），由现有 `commandExecution.pendingCommand / safetyDialog` 驱动页面内容；通过新增 CSS 变量与状态类实现 2/3 与 1/2 宽度切换；通过 Search Capsule 的 `pointerdown.capture` 发出“back（等同 Esc）”事件，统一走 `useMainWindowShell.handleMainEscape()` 的优先级。

**Tech Stack:** Vue 3（`<script setup>`）+ TypeScript + Vitest + 现有 CSS（`src/styles.css`）+ composables（`src/composables/**`）。

**Spec:** `docs/superpowers/specs/2026-03-12-launcher-flow-drawer-nav-stack-design.md`

---

## File Map（先锁定改动面）

**Create**
- `src/components/launcher/parts/LauncherFlowDrawer.vue`
- `src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts`

**Modify**
- `src/components/launcher/LauncherWindow.vue`
- `src/components/launcher/parts/LauncherSearchPanel.vue`
- `src/components/launcher/types.ts`
- `src/styles.css`
- `src/composables/launcher/useLauncherLayoutMetrics.ts`
- `src/composables/launcher/useWindowSizing/calculation.ts`
- `src/composables/execution/useCommandExecution/actions.ts`
- `src/features/hotkeys/windowKeydownHandlers/index.ts`
- `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`

---

## Task 1: 定义 Flow Drawer 形态与动效（左进左退/右退）

**Files:**
- Create: `src/components/launcher/parts/LauncherFlowDrawer.vue`
- Modify: `src/styles.css`
- Test: `src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts`

- [ ] **Step 1: 写一个最小失败用例（FlowDrawer 渲染契约）**
  - 断言：当 `pendingCommand!=null` 时渲染 `.flow-overlay` 且位于内容区（不在 `.search-capsule` 内）
  - 断言：当 `safetyDialog!=null` 且 `pendingCommand==null` 时仍渲染（SafetySingle 直达 / SafetyQueue）

Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts`
Expected: FAIL（组件不存在）

- [ ] **Step 2: 实现最小可渲染骨架**

实现要点（最小化，后续再加完整交互）：
- 根：`<aside class="flow-overlay" data-hit-zone="overlay" ...>`
- 面板：`<section class="flow-panel" role="dialog" :aria-label="...">`
- 内容：复用现有 Param/Safety 结构（先直接内联/复制，后续再抽组件）

- [ ] **Step 3: 加入“离场方向”机制（不先做业务动作延迟）**

在组件内部维护一个方向状态：
- `exitDirection: 'left' | 'right' | null`
- 当用户点击取消/确认/提交时先设置方向，再 `emit(...)` 让父层清状态（触发离场动画）

CSS 约束（参照 spec §7.1）：
- entering：`transform: translateX(-100%) → 0`
- cancel leave：`0 → -100%`
- confirm leave：`0 → +100%`
- `prefers-reduced-motion: reduce` 下禁用动画

- [ ] **Step 4: 绿化用例并补一个 reduce-motion 兜底断言**
  - 断言：存在 `.flow-overlay--exit-right` / `.flow-overlay--exit-left` 类名切换（不测具体动画像素）

Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts`
Expected: PASS

---

## Task 2: 将 Param/Safety 从“弹窗”迁移到 Flow Drawer（导航栈）

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/styles.css`
- Test: `src/composables/__tests__/launcher/useMainWindowShell.test.ts`（如需）

- [ ] **Step 1: 先写失败用例（Safety 来源 Param：取消回到 Param 且保留参数）**

建议加在 `src/composables/execution/useCommandExecution/__tests__/...`（若该目录不存在，则放到现有 `src/composables/__tests__/...` 同层级）：
- Arrange：`openParamInput(cmd, 'execute')` + 填入 `pendingArgValues`
- Act：`submitParamInput()` 触发安全确认（构造一个 `dangerous` 的命令模板）
- Assert：
  - `state.safetyDialog.value != null`
  - `state.pendingCommand.value != null`（Param 仍在栈内）
  - `cancelSafetyExecution()` 后：`state.safetyDialog.value == null` 且 `pendingArgValues` 保持不变

Run: `npm run test:run -- <new-test-file>`
Expected: FAIL（现逻辑会清空 pendingCommand）

- [ ] **Step 2: 修改 `submitParamInput()`：Execute 分支不先清空 pendingCommand**

在 `src/composables/execution/useCommandExecution/actions.ts`：
- `submitMode === 'stage'`：保持现有行为（清 pending → appendToStaging → 关闭 Flow）
- `submitMode === 'execute'`：
  - 先做 `getPendingSubmitRejection`
  - 基于 `checkSingleCommandSafety(...)` 判定：
    - blocked：设置 feedback，留在 Param
    - confirm needed：`state.requestSafetyConfirmation(...)`，**不清 pendingCommand/pendingArgValues**
    - safe：清 pendingCommand/pendingArgValues（触发 Flow 右退）后再执行

- [ ] **Step 3: 统一 Safety UI 入口到 Flow Drawer**

在 `src/components/launcher/LauncherWindow.vue`：
- 移除 `LauncherParamOverlay` / `LauncherSafetyOverlay` 的直接渲染
- 新增 `LauncherFlowDrawer`（挂在 `.search-shell` 内，确保不覆盖 Search Capsule）
- 将事件透传：
  - Param：submit / cancel / update arg
  - Safety：confirm / cancel

- [ ] **Step 4: 回归验证**
Run: `npm run test:run -- src/composables/__tests__/launcher/useMainWindowShell.test.ts`
Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts`
Expected: PASS

---

## Task 3: 双抽屉宽度规则（单抽屉 2/3；双抽屉 1/2 + 1/2）

**Files:**
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts`
- Modify: `src/styles.css`
- (Optional) Test: `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`

- [ ] **Step 1: 写失败用例（dual 模式下 review/flow 宽度=content/2）**
  - Arrange：`stagingExpanded=true` 且 `flowOpen=true`
  - Assert：`searchShellStyle.value['--review-width'] === '${Math.floor(searchMainWidth/2)}px'`
  - Assert：新增 `--flow-width` 同样等于一半

- [ ] **Step 2: 扩展 `useLauncherLayoutMetrics` 支持 flowOpen**
  - `options` 增加：`flowOpen: Ref<boolean>`
  - `dual = computed(() => options.flowOpen.value && options.stagingExpanded.value)`
  - `reviewWidth = computed(() => dual ? Math.floor(searchMainWidth/2) : clamp(2/3...))`
  - `flowWidth = computed(() => dual ? Math.floor(searchMainWidth/2) : Math.floor(searchMainWidth*2/3))`（不再 clamp，遵循 spec）
  - 写入 `searchShellStyle`：新增 `--flow-width`

- [ ] **Step 3: CSS 侧让面板使用变量并具备 width 过渡**
  - `.review-panel { width: min(var(--review-width), 100%); transition: width 200ms ... }`
  - `.flow-panel { width: min(var(--flow-width), 100%); transition: width 200ms ... }`

- [ ] **Step 4: 回归**
Run: `npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`
Expected: PASS

---

## Task 4: Search Capsule 点击=一次 Esc；Flow 打开时输入禁用（但 queue pill 可用）

**Files:**
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/types.ts`
- Modify: `src/components/launcher/LauncherWindow.vue`
- Test: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`

- [ ] **Step 1: 写失败用例（flowOpen 时点击 search-form 触发 request-escape；排除 queue pill）**
  - 新事件：`@request-escape`
  - 测试：
    - `flowOpen=true`，触发 `.search-form pointerdown` → emit `request-escape`
    - 点击 `.queue-summary-pill` 不应触发 `request-escape`

- [ ] **Step 2: 扩展 props：`flowOpen`**
  - `LauncherSearchPanelProps` 增加 `flowOpen: boolean`
  - `LauncherWindow.vue` 计算 `flowOpen = !!pendingCommand || !!safetyDialog` 传入

- [ ] **Step 3: 改写 pointerdown.capture：统一发出 request-escape**
  - 当 `props.flowOpen || props.reviewOpen` 时：
    - 若目标在 `.queue-summary-pill`：return
    - `event.preventDefault()`
    - `emit('request-escape')`（不直接 toggle staging）

- [ ] **Step 4: Flow 打开时禁用输入（不使用原生 disabled 作为 flow 禁用手段）**
  - 保留 `executing` 的禁用（可继续 `disabled`）
  - 对 flow 禁用：建议 `readonly + aria-disabled`，并依赖 pointerdown 的 `preventDefault()` 避免进入输入态

- [ ] **Step 5: `request-escape` 在上层统一落到 `handleMainEscape`**
  - `LauncherSearchPanel.vue` → `LauncherWindow.vue` 透传 emit（新增 emit 事件）
  - `useMainWindowShell.handleMainEscape()` 已具备优先级（Safety→Param→Review→clear query→hide）

Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
Expected: PASS（原“pointerdown=toggle-staging”用例需更新为 request-escape）

---

## Task 5: Flow 打开时热键策略（允许开关 Review；禁用执行队列；避免全局 Enter 误确认）

**Files:**
- Modify: `src/features/hotkeys/windowKeydownHandlers/index.ts`
- Modify: `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- (Optional) Modify: `src/composables/app/useAppWindowKeydown.ts`

- [ ] **Step 1: 写失败用例**
  - `safetyDialogOpen=true` 时：
    - `Enter` 不再全局触发 `confirmSafetyExecution`（避免误触）
    - `Escape` 仍触发 `handleMainEscape`（或 cancelSafetyExecution，二选一但需与 spec 对齐）
  - `paramDialogOpen=true` 时：
    - `normalizedToggleQueueHotkey` 仍可触发 `toggleStaging`（允许打开/关闭 Review）

- [ ] **Step 2: 调整 handler 分支**
  - 不在 `safetyDialogOpen` 分支里“吃掉所有键”
  - 优先允许：
    - toggle queue hotkey（打开/关闭 Review）
    - Escape（一次 Esc：按 `handleMainEscape()` 优先级回退）
  - 移除（或收敛）全局 Enter 确认 safety 的逻辑，让确认仅在 Safety 页内通过按钮/聚焦触发

- [ ] **Step 3: Flow 打开时禁用执行队列（按钮+热键同一条规则）**
  - 推荐在 `executeStaged()` 内部加 guard：
    - 若 `pendingCommand!=null || safetyDialog!=null`：`setExecutionFeedback('neutral', '请先完成或取消当前流程')` 并 return
  - 这样 Review 内按钮与 `Ctrl+Enter` 都会被统一拦截并 toast

Run: `npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
Expected: PASS

---

## Task 6: 清理旧 Overlay 语义与 A11y 对齐（非 aria-modal；inert 管控）

**Files:**
- Modify: `src/components/launcher/parts/LauncherReviewOverlay.vue`
- Modify: `src/components/launcher/parts/LauncherFlowDrawer.vue`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Test: 视现有断言调整（`LauncherReviewOverlay.test.ts` 等）

- [ ] **Step 1: 写/更新断言：抽屉不是严格 aria-modal**
  - 对齐 spec §9.1：Flow/Review 不强制 `aria-modal="true"`
  - 结果列表用 `inert + aria-hidden` 控制（Review 打开、或 Flow 打开时都应 inert）

- [ ] **Step 2: 实现**
  - `LauncherSearchPanel.vue`：`result-drawer` 的 `:inert / :aria-hidden` 条件从 `reviewOpen` 扩展为 `reviewOpen || flowOpen`
  - `LauncherReviewOverlay.vue`：去除 `aria-modal="true"`（若会引发既有可达性回归，则保留并记录原因，后续专项处理）

Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts`
Expected: PASS（必要时更新断言）

---

## Task 7: 端到端回归（本地门禁）

- [ ] **Step 1: 相关单测全绿**
Run: `npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts`

- [ ] **Step 2: Typecheck**
Run: `npm run typecheck`
Run: `npm run typecheck:test`

- [ ] **Step 3: 全链路门禁**
Run: `npm run check:all`

---

## Notes（执行时的关键约束）

- 所有行为以 `docs/superpowers/specs/2026-03-12-launcher-flow-drawer-nav-stack-design.md` 为准；2026-03-10 文档已弃用，不再作为依据。
- Flow 打开期间：
  - Search 输入不可编辑、不可进入输入态；但 queue pill/热键仍可打开/关闭 Review。
  - “执行队列”入口（按钮/热键）必须禁用并 toast。
  - Esc/点击搜索输入区域视为一次返回（Safety→Param→Review→清空 query→隐藏窗口）。

