# UI Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 连续修复 2026-03-28 UI audit 暴露的 Launcher、Settings、shared UI primitives、theme/bootstrap 关键问题，并在每个阶段后完成视觉回归与自动化验证。

**Architecture:** 延续现有 Vue composable + focused contract tests 的结构，不做大重构。键盘 ownership 收口到统一守卫，A11y 优先修原生语义，性能问题优先移除 `width` / `transition-all` 等昂贵实现，bootstrap 收口到单一事实源附近。

**Tech Stack:** Vue 3、Pinia、Vitest、Tailwind、Tauri、Selenium visual regression

---

## 0. 执行约束

- [ ] 所有代码修改都在 `feat/review-remediation` 分支完成。
- [ ] 修改前先搜索定位相关文件和测试，禁止猜测。
- [ ] 所有业务代码改动都先补 failing tests，再写实现。
- [ ] 编辑仓库文件时只使用 `apply_patch`。
- [ ] 每个阶段结束至少执行：相关 focused tests、`npm run lint`、`npm run typecheck`、`npm run test:visual:ui`。
- [ ] 若视觉回归需要区分桥接问题和基线问题，再补 `npm run test:visual:ui:linux`。
- [ ] 全部收口后执行 `npm run check:all`。
- [ ] 最终补充更新 `docs/active_context.md`，仅追加，不覆盖，控制在 200 字内。

## 1. Task A: Escape ownership 与 Launcher 主体语义

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/composables/app/useAppLifecycle.ts`
- Modify: `src/composables/app/useAppWindowKeydown.ts`
- Modify: `src/features/hotkeys/windowKeydownHandlers/index.ts`
- Modify: `src/features/hotkeys/windowKeydownHandlers/settings.ts`
- Modify: `src/composables/launcher/useMainWindowShell.ts`
- Modify: `src/AppSettings.vue`
- Test: `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- Test: `src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- Test: `src/composables/__tests__/launcher/useMainWindowShell.test.ts`
- Test: `src/composables/__tests__/app/useAppLifecycle.test.ts`
- Test: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

- [ ] **Step 1: 补 Escape ownership failing tests**

覆盖：
- 主窗口普通场景下 Escape 仍会走 `handleMainEscape`
- target 位于 dialog / popup / inline edit / typing element 时不应被全局 Escape 抢走
- Settings 窗口内层 popup/dialog 打开时不应直接关闭整个窗口
- LauncherWindow 不再依赖 `role="application"`

- [ ] **Step 2: 运行 focused tests，确认看到失败**

Run:
`npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts src/composables/__tests__/app/useAppWindowKeydown.test.ts src/composables/__tests__/launcher/useMainWindowShell.test.ts src/composables/__tests__/app/useAppLifecycle.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

- [ ] **Step 3: 最小实现**

实现要求：
- 新增共享 Escape 守卫
- 主窗口与 Settings 窗口都复用守卫
- 保留现有快捷键优先级
- 去掉 `LauncherWindow.vue` 中的 `role="application"`

- [ ] **Step 4: 再跑 focused tests**

Run:
`npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts src/composables/__tests__/app/useAppWindowKeydown.test.ts src/composables/__tests__/launcher/useMainWindowShell.test.ts src/composables/__tests__/app/useAppLifecycle.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

- [ ] **Step 5: 阶段验证**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run test:visual:ui`

## 2. Task B: Settings 搜索 / Dropdown A11y contract

**Files:**
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/components/settings/ui/SDropdown.vue`
- Modify: `src/components/settings/parts/settingsCommands/SettingsCommandsMoreFiltersDialog.vue`
- Modify: `src/AppVisual.vue`
- Test: `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
- Test: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
- Test: `src/components/settings/ui/__tests__/SDropdown.test.ts`

- [ ] **Step 1: 先补 failing tests**

覆盖：
- 搜索框具备稳定可访问名称
- Dropdown trigger / popup / option 的语义稳定
- 打开、导航、Escape、Tab、外点关闭行为稳定
- 更多筛选 dialog 内嵌 dropdown 时焦点流不回归

- [ ] **Step 2: 跑 focused tests，确认失败**

Run:
`npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/ui/__tests__/SDropdown.test.ts`

- [ ] **Step 3: 最小实现**

实现要求：
- 搜索框补 label 或 `aria-label`
- `SDropdown` 语义稳定，可测试
- 不引入第三方组件
- 与 dialog focus trap 协同工作

- [ ] **Step 4: 再跑 focused tests**

Run:
`npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/ui/__tests__/SDropdown.test.ts`

- [ ] **Step 5: 阶段验证**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run test:visual:ui`

## 3. Task C: Launcher Flow / Staging 语义与昂贵动画

**Files:**
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/launcher/parts/LauncherStagingPanel.vue`
- Modify: `tailwind.config.cjs`
- Test: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`
- Test: `src/components/launcher/parts/__tests__/LauncherStagingPanel.test.ts`
- Test: `src/styles/__tests__/tailwind-theme-layer-contract.test.ts`
- Test: `src/styles/__tests__/tailwind-governance-contract.test.ts`

- [ ] **Step 1: 先补 failing tests**

覆盖：
- Flow feedback 具备 `role="status"` 或 `aria-live`
- Staging 参数 label 与 input 程序化绑定
- FlowPanel 不再依赖 `width` 作为过渡属性

- [ ] **Step 2: 跑 focused tests，确认失败**

Run:
`npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts src/components/launcher/parts/__tests__/LauncherStagingPanel.test.ts src/styles/__tests__/tailwind-theme-layer-contract.test.ts src/styles/__tests__/tailwind-governance-contract.test.ts`

- [ ] **Step 3: 最小实现**

实现要求：
- Flow feedback 改为 live region
- Staging 参数生成稳定 id，并绑定 label
- 去掉 `transition-launcher-width`
- 保持 settled / scrim / height observation 契约

- [ ] **Step 4: 再跑 focused tests**

Run:
`npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts src/components/launcher/parts/__tests__/LauncherStagingPanel.test.ts src/styles/__tests__/tailwind-theme-layer-contract.test.ts src/styles/__tests__/tailwind-governance-contract.test.ts`

- [ ] **Step 5: 阶段验证**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run test:visual:ui`

## 4. Task D: Shared primitives 过渡与命中区

**Files:**
- Modify: `src/components/shared/ui/buttonPrimitives.ts`
- Modify: `src/components/shared/ui/UiIconButton.vue`
- Modify: `src/components/settings/ui/SToggle.vue`
- Modify: `src/components/settings/ui/SDropdown.vue`
- Modify: `src/components/launcher/parts/LauncherQueueSummaryPill.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Test: `src/styles/__tests__/tailwind-governance-contract.test.ts`
- Test: 受影响组件的 focused tests

- [ ] **Step 1: 先补 failing tests**

覆盖：
- `buttonPrimitives.ts` 不再允许 `transition-all`
- 关键共享控件存在新的最小尺寸契约

- [ ] **Step 2: 跑 focused tests，确认失败**

Run:
`npm run test:run -- src/styles/__tests__/tailwind-governance-contract.test.ts src/components/settings/ui/__tests__/SDropdown.test.ts src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

- [ ] **Step 3: 最小实现**

实现要求：
- 过渡属性精确到需要的属性
- Small icon button、toggle、dropdown trigger 的命中区提升到统一下限
- 不破坏高密度桌面布局

- [ ] **Step 4: 再跑 focused tests**

Run:
`npm run test:run -- src/styles/__tests__/tailwind-governance-contract.test.ts src/components/settings/ui/__tests__/SDropdown.test.ts src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

- [ ] **Step 5: 阶段验证**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run test:visual:ui`

## 5. Task E: Settings 长列表与 theme/bootstrap 事实源

**Files:**
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/composables/settings/useCommandManagement.ts`
- Modify: `src/features/themes/themeRegistry.ts`
- Modify: `src/composables/app/useTheme.ts`
- Modify: `index.html`
- Modify: `settings.html`
- Modify: `visual.html`
- Modify: `src/AppVisual.vue`
- Test: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
- Test: `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
- Test: `src/__tests__/settings.bootstrap-contract.test.ts`
- Test: `src/features/themes/__tests__/themeRegistry.test.ts`
- Test: `src/composables/__tests__/app/useTheme.test.ts`

- [ ] **Step 1: 先补 failing tests**

覆盖：
- 大量 `commandRows` 下初始渲染预算受控
- bootstrap contract 不再依赖多处手写映射
- runtime theme/useTheme 和 HTML bootstrap 保持一致

- [ ] **Step 2: 跑 focused tests，确认失败**

Run:
`npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/__tests__/settings.bootstrap-contract.test.ts src/features/themes/__tests__/themeRegistry.test.ts src/composables/__tests__/app/useTheme.test.ts`

- [ ] **Step 3: 最小实现**

实现要求：
- 长列表采用轻量增量渲染，不引入第三方库
- bootstrap 元数据向单一事实源附近收口
- `AppVisual.vue` 与 `visual.html` 同步更新

- [ ] **Step 4: 再跑 focused tests**

Run:
`npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/__tests__/settings.bootstrap-contract.test.ts src/features/themes/__tests__/themeRegistry.test.ts src/composables/__tests__/app/useTheme.test.ts`

- [ ] **Step 5: 阶段验证**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run test:visual:ui`
- `npm run test:visual:ui:linux`

## 6. 最终收口

- [ ] **Step 1: 跑全量单测**

Run:
`npm run test:run`

- [ ] **Step 2: 跑最终视觉回归**

Run:
`npm run test:visual:ui`

- [ ] **Step 3: 跑最终门禁**

Run:
`npm run check:all`

- [ ] **Step 4: 更新文档**

更新：
- `docs/active_context.md`

- [ ] **Step 5: 请求代码审查**

基于当前分支变更请求 review，优先看行为回归、A11y 语义和 visual regression 风险。

- [ ] **Step 6: 重跑 audit**

输出要求：
- 只汇报本轮 audit 相比 `13/20` 的分数变化
- 按模块简要说明剩余风险或已清零项
