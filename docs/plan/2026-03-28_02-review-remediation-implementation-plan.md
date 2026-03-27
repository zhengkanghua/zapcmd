# Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 preflight、A11y、Settings dialog/入口、多主题与超长文件治理的关键问题，并保证自动化回归稳定。

**Architecture:** 保留当前在用的 Settings 独立入口，围绕真实运行路径做增量收口。执行链路优先 fail-closed，UI 语义优先原生可访问性，多主题沿现有 `appearance.theme` 与 `--ui-*` token 体系扩展。

**Tech Stack:** Vue 3、Pinia、Vitest、Tailwind v4、Tauri

---

## 0. 执行约束

- [ ] 所有代码修改都在 `feat/review-remediation` 分支完成。
- [ ] 每个任务先补 / 改测试，再落实现。
- [ ] 只要任务影响样式或主题，必须补跑 `npm run test:visual:ui` 并处理 baseline。
- [ ] 每个任务完成后至少通过 `npm run lint`、`npm run typecheck`、相关 focused tests。
- [ ] 全部任务收口后执行 `npm run check:all`。
- [ ] 动画模式切换不在本计划范围，任何相关讨论只记录文档，不落代码。

## 1. 文件结构与边界

### 1.1 本轮预期修改 / 新增文件

**Modify**
- `src/services/commandPreflight.ts`
- `src/composables/execution/useCommandExecution/actions.ts`
- `src/composables/execution/useCommandExecution/helpers.ts`
- `src/components/launcher/parts/LauncherCommandPanel.vue`
- `src/components/settings/parts/SettingsCommandsSection.vue`
- `src/App.vue`
- `src/AppSettings.vue`
- `src/main-settings.ts`
- `src/features/themes/themeRegistry.ts`
- `src/composables/app/useTheme.ts`
- `src/components/settings/parts/SettingsAppearanceSection.vue`
- `src/stores/settings/defaults.ts`（如需补默认值 / 文案耦合时再改）
- `src/stores/settings/normalization.ts`（仅在主题校验策略需要收口时修改）
- `settings.html`
- `index.html`（仅当启动期主题 bootstrap 必须同步时修改）

**Create**
- `src/styles/themes/linen.css`

**Test**
- `src/services/__tests__/commandPreflight.test.ts`
- `src/composables/__tests__/execution/useCommandExecution.test.ts`
- `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
- `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`
- `src/features/themes/__tests__/themeRegistry.test.ts`
- `src/composables/__tests__/app/useTheme.test.ts`
- `src/__tests__/app.settings-hotkeys.test.ts`（如 settings 入口清理影响）
- `src/__tests__/settings.bootstrap-contract.test.ts`

## 2. Task 1: Preflight 改为 Fail-Closed

**Files:**
- Modify: `src/services/commandPreflight.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/execution/useCommandExecution/helpers.ts`
- Test: `src/services/__tests__/commandPreflight.test.ts`
- Test: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 1: 先补失败测试**
  - 增加以下覆盖：
  - invoke 抛异常时返回结构化 probe failure，而不是空数组
  - invoke 返回非数组时按 probe failure 处理
  - required prerequisite 失败时单条 / 队列执行都被阻断

- [ ] **Step 2: 运行 focused tests，确认当前存在失败**
  - Run: `npm run test:run -- src/services/__tests__/commandPreflight.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 3: 实现 fail-closed**
  - `commandPreflight` 将异常 / 非数组返回收口为结构化失败结果
  - `actions.ts` 将 preflight 调用纳入统一错误边界
  - warning / blocking 行为保持可预测

- [ ] **Step 4: 再跑 focused tests**
  - Run: `npm run test:run -- src/services/__tests__/commandPreflight.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 5: 通过静态检查**
  - Run: `npm run lint`
  - Run: `npm run typecheck`

## 3. Task 2: 参数面板 A11y 收口

**Files:**
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Test: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`

- [ ] **Step 1: 先补失败测试**
  - 覆盖 label 与 input/select 绑定
  - 覆盖危险说明 / 必填提示挂接到可访问性描述

- [ ] **Step 2: 跑 focused tests**
  - Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`

- [ ] **Step 3: 实现**
  - 为参数控件生成稳定 `id`
  - `label for` 与控件绑定
  - 需要时补 `aria-describedby`

- [ ] **Step 4: 再跑 focused tests**
  - Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`

- [ ] **Step 5: 通过静态检查**
  - Run: `npm run lint`
  - Run: `npm run typecheck`

## 4. Task 3: “更多筛选”改为真正 Dialog

**Files:**
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Test: `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`

- [ ] **Step 1: 先补失败测试**
  - 打开后焦点进入弹层
  - `Esc` 关闭
  - 关闭后焦点回到触发按钮
  - `Tab/Shift+Tab` 焦点循环

- [ ] **Step 2: 跑 focused tests**
  - Run: `npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`

- [ ] **Step 3: 实现 dialog 行为**
  - 增加打开时的初始焦点
  - 增加 `Esc` 关闭
  - 增加焦点约束
  - 增加 return focus

- [ ] **Step 4: 拆分超长文件**
  - 若 `SettingsCommandsSection.vue` 仍明显超线，拆出 dialog/focus 管理 composable 或子组件

- [ ] **Step 5: 再跑 focused tests + 静态检查**
  - Run: `npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
  - Run: `npm run lint`
  - Run: `npm run typecheck`

## 5. Task 4: 收口 Settings 真实入口，保留在用路径

**Files:**
- Modify: `src/App.vue`
- Modify: `src/AppSettings.vue`
- Modify: `src/main-settings.ts`
- Test: `src/__tests__/app.settings-hotkeys.test.ts`
- Test: `src/__tests__/settings.bootstrap-contract.test.ts`

- [ ] **Step 1: 先补 / 调整 characterization tests**
  - 锁定 `settings.html -> main-settings.ts -> AppSettings.vue` 仍为真实入口
  - 锁定清理 legacy wiring 后热键 / bootstrap 行为仍成立

- [ ] **Step 2: 跑 focused tests**
  - Run: `npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts src/__tests__/settings.bootstrap-contract.test.ts`

- [ ] **Step 3: 实现**
  - 清理 `App.vue` 中不再需要的 settings 分支或 dead wiring
  - 保留并收紧 `AppSettings.vue` 为唯一 settings 入口组装层
  - 删除确认无运行时价值的旧接线

- [ ] **Step 4: 控制文件体积**
  - 若 `AppSettings.vue` 或相关 glue file 继续超线，拆到共享 composable / helper

- [ ] **Step 5: 再跑 focused tests + 静态检查**
  - Run: `npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts src/__tests__/settings.bootstrap-contract.test.ts`
  - Run: `npm run lint`
  - Run: `npm run typecheck`

## 6. Task 5: 增加第二主题 `linen`

**Files:**
- Create: `src/styles/themes/linen.css`
- Modify: `src/styles/themes/_index.css`
- Modify: `src/features/themes/themeRegistry.ts`
- Modify: `src/composables/app/useTheme.ts`
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`
- Modify: `settings.html`
- Modify: `index.html`（仅当启动期主题闪烁必须同步）
- Test: `src/features/themes/__tests__/themeRegistry.test.ts`
- Test: `src/composables/__tests__/app/useTheme.test.ts`
- Test: `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`

- [ ] **Step 1: 先补失败测试**
  - theme registry 出现第二主题
  - appearance 页面能渲染第二主题卡片
  - `useTheme` 能正确应用第二主题

- [ ] **Step 2: 跑 focused tests**
  - Run: `npm run test:run -- src/features/themes/__tests__/themeRegistry.test.ts src/composables/__tests__/app/useTheme.test.ts src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`

- [ ] **Step 3: 实现主题**
  - 新增 `linen` 主题 CSS
  - registry 注册第二主题
  - `color-scheme` 改为主题驱动，而不是全局永久 dark
  - Appearance 卡片与启动期 bootstrap 正确反映 light theme

- [ ] **Step 4: 跑 focused tests + 视觉回归**
  - Run: `npm run test:run -- src/features/themes/__tests__/themeRegistry.test.ts src/composables/__tests__/app/useTheme.test.ts src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`
  - Run: `npm run test:visual:ui`

- [ ] **Step 5: 必要时更新 visual baselines**
  - 仅当截图差异为预期主题变化时更新

- [ ] **Step 6: 通过静态检查**
  - Run: `npm run lint`
  - Run: `npm run typecheck`

## 7. Task 6: 对齐本轮波及文件的体积阈值

**Files:**
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`（若本轮波及）
- Modify: `src/composables/settings/useCommandManagement.ts`（若本轮波及）
- Modify: 其他本轮改动后仍超线的文件

- [ ] **Step 1: 列出本轮修改后仍超过 400 行的文件**
  - Run: `wc -l <files>`

- [ ] **Step 2: 对 touched files 做最小职责拆分**
  - `SettingsCommandsSection` 优先拆 toolbar/dialog 行为
  - `LauncherFlowPanel` 若本轮修改则优先拆 header/list glue
  - `useCommandManagement` 若本轮修改则优先拆 filter option builders

- [ ] **Step 3: 补相应 focused tests**
  - 以被拆出的行为为单位增加或迁移测试

- [ ] **Step 4: 通过静态检查**
  - Run: `npm run lint`
  - Run: `npm run typecheck`

## 8. 最终收口

- [ ] **Step 1: 跑全量单测**
  - Run: `npm run test:run`

- [ ] **Step 2: 跑视觉回归**
  - Run: `npm run test:visual:ui`

- [ ] **Step 3: 跑最终门禁**
  - Run: `npm run check:all`

- [ ] **Step 4: 更新文档**
  - `docs/active_context.md`
  - 如有必要，同步 README / 相关事实文档

- [ ] **Step 5: 分阶段提交**
  - 建议至少按以下边界提交：
  - `fix(execution): 收紧 prerequisite preflight 失败边界`
  - `fix(a11y): 补齐参数面板与更多筛选的可访问性`
  - `feat(theme): 新增 linen 主题并补视觉回归`

