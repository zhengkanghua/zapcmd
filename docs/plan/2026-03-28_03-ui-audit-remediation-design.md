# ZapCmd UI Audit 整改设计文档（2026-03-28）

> 创建日期：2026-03-28
> 状态：待执行
> 优先级：P1
> 关联分支：`feat/review-remediation`

---

## 1. 背景与目标

1. 背景：
   - 最近一次项目级 UI audit 给出 `13/20`，评级为 `Acceptable`。
   - 当前代码已具备较完整的 focused tests、Tailwind contract tests 和视觉回归基础，但仍存在一批会影响可访问性、性能稳定性和系统一致性的实现问题。
   - 用户要求本轮不要停顿，先落实文档，再连续完成整改；每个阶段结束都要执行视觉回归和自动化测试，最后重跑 audit 只看分数变化。
2. 目标：
   - 修复 Launcher、Settings、shared UI primitives、theme/token/motion/bootstrap 范围内的高价值 UI 技术质量问题。
   - 保持现有桌面工具 UI 的高密度、键盘优先和多主题能力，不引入脱离仓库模式的大重构。
   - 通过 TDD + visual regression + `check:all` 收口，保证整改不会带来行为回退。

## 2. 范围

### 2.1 In Scope

1. Launcher 主体语义与全局 Escape ownership。
2. Settings 搜索、Dropdown、dialog 焦点与可访问性 contract。
3. FlowPanel / StagingPanel 的 live region、label 绑定和昂贵动画治理。
4. Shared UI primitives 的 `transition-all`、小命中区和高频控件尺寸。
5. Settings Commands 长列表渲染风险。
6. theme/motion/bootstrap 事实源漂移风险。
7. 相关 focused tests、Tailwind contract tests、visual regression 与全量门禁。

### 2.2 Out of Scope

1. 重新设计 Launcher 或 Settings 的整体视觉风格。
2. 引入第三方虚拟列表、第三方下拉组件或新的 UI 框架。
3. 把桌面高密度界面改造成移动端风格的大间距布局。
4. 与本轮 audit 无关的执行链、终端链或 Rust 侧能力重构。

## 3. 现状事实

1. 运行时结构：
   - Launcher 入口是 `src/App.vue`。
   - Settings 入口是 `settings.html -> src/main-settings.ts -> src/AppSettings.vue`。
   - visual harness 入口是 `visual.html -> src/main-visual.ts -> src/AppVisual.vue`。
2. 键盘事件链：
   - 主窗口在 `src/composables/app/useAppLifecycle.ts` 里以 capture 阶段注册 `window.addEventListener("keydown", ..., true)`。
   - 主窗口 Escape 通过 `src/composables/app/useAppWindowKeydown.ts -> src/features/hotkeys/windowKeydownHandlers/index.ts -> src/composables/launcher/useMainWindowShell.ts` 处理。
   - Settings 还在 `src/AppSettings.vue` 里额外挂了一套 `window.keydown` 的 Escape 关闭逻辑。
3. 主题事实源：
   - 运行时主题元数据在 `src/features/themes/themeRegistry.ts`。
   - DOM 应用逻辑在 `src/composables/app/useTheme.ts`。
   - `index.html` 与 `settings.html` 仍各自手写了一份 bootstrap theme/motion 映射。
4. 已有测试基础：
   - Launcher、Settings、Dropdown、App lifecycle、hotkeys、theme registry、bootstrap contract 都已有 focused tests。
   - 项目已有 `npm run test:visual:ui`、`npm run test:visual:ui:linux` 和 `npm run check:all`。

## 4. 本轮关键问题

### 4.1 Accessibility

1. `LauncherWindow.vue` 使用 `role="application"`，会放大屏幕阅读器模式切换成本。
2. 主窗口与 Settings 的全局 Escape 会劫持内层 dialog、dropdown popup 和 inline edit。
3. `SettingsCommandsSection.vue` 搜索框缺少稳定可访问名称。
4. `SDropdown.vue` 的 trigger/listbox/option contract 不稳定。
5. `LauncherFlowPanel.vue` 的执行反馈缺少 live region。
6. `LauncherStagingPanel.vue` 的参数标签没有和输入框做程序化绑定。

### 4.2 Performance

1. `LauncherFlowPanel.vue` 仍使用 `transition-launcher-width`，`tailwind.config.cjs` 中对应到 `width`。
2. `buttonPrimitives.ts` 的 danger variant 仍有 `transition-all`。
3. `SettingsCommandsSection.vue` 对 `commandRows` 直接全量 `v-for`，长列表有首帧和滚动压力。
4. Dropdown 定位与打开状态依赖 Teleport + 全局监听，contract 需要更稳，避免回流和焦点抖动叠加。

### 4.3 Responsive / Touch Target

1. `UiIconButton small`、`SToggle`、`SDropdown` trigger 等控件命中区偏小。
2. 这些问题虽然发生在桌面 UI 中，但已经影响高频指向设备和触控板操作稳定性。

### 4.4 Theming / Bootstrap

1. `themeRegistry.ts`、`useTheme.ts`、`index.html`、`settings.html`、`visual.html` 的 theme/motion bootstrap 依赖多处同步维护。
2. 只要主题或 motion preset 再扩展一次，就容易出现 HTML bootstrap 与运行时 registry 漂移。

## 5. 设计决策

### 5.1 Escape ownership 统一改为“可安全接管时才处理”

1. 保留现有集中式 Escape 链路，不在各组件各自加新的全局 `window` 监听。
2. 新增共享守卫函数，统一判断以下场景时不全局接管：
   - `event.defaultPrevented === true`
   - target 是 `input` / `textarea` / `select` / `contentEditable`
   - target 处于 `[role="dialog"]`、`[aria-modal="true"]`、popup/listbox/menu 等内层交互宿主
   - inline edit 正在激活
3. 主窗口与 Settings 窗口都复用同一套守卫，避免双写。

### 5.2 可访问性优先修原生语义

1. 搜索框、参数输入、反馈区都优先补原生 label / `aria-*` / `role="status"`。
2. `LauncherWindow` 只保留必要的 landmark 和 label，不再使用 `role="application"`。
3. `SDropdown` 不追求复杂自绘语义，优先收口成稳定、可测试的 popup contract。

### 5.3 昂贵动画改为 transform/opacity 或静态尺寸

1. FlowPanel 的开合动画不再使用 `width` 过渡。
2. Shared button danger variant 不再使用 `transition-all`。
3. 仅保留对当前状态变化确实必要的过渡属性。

### 5.4 长列表采用轻量增量渲染，不引入外部库

1. 优先在 `SettingsCommandsSection` 内做轻量窗口化或增量渲染。
2. 尽量复用 `useCommandManagement` 的 `commandRows` / `commandGroups`，不改数据模型。
3. 不为了这一个表格引入第三方 virtualization 依赖。

### 5.5 Bootstrap 元数据向单一事实源收口

1. 抽取共享 theme/motion bootstrap 元数据或解析逻辑。
2. 让 `index.html`、`settings.html`、`visual.html` 与 `themeRegistry.ts` 至少由同一合同测试锁定。
3. 保持默认主题仍为 `obsidian`，`linen` 和 motion preset 行为不变。

## 6. 分阶段策略

### 阶段 A：键盘 ownership 与核心 A11y

1. Escape ownership 守卫。
2. 去掉 `role="application"`。
3. 搜索 label、FlowPanel live region、StagingPanel label/input 绑定。

### 阶段 B：Settings Dropdown 与 shared primitives

1. 收口 `SDropdown` 的 popup/focus/ARIA contract。
2. 修复 `transition-all`。
3. 抬高关键控件最小命中区。

### 阶段 C：性能与系统一致性

1. 去掉 FlowPanel 的 `width` 过渡。
2. 处理 Commands 长列表渲染预算。
3. 收口 theme/motion/bootstrap 事实源。

## 7. 测试与验证策略

1. 所有代码改动默认 TDD：
   - 先写 focused failing tests。
   - 看到红。
   - 再写最小实现。
   - 再跑绿。
2. 每个阶段结束都要至少执行：
   - 该阶段相关 focused tests
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:visual:ui`
3. 如需区分 WSL 桥接和基线差异，可补跑：
   - `npm run test:visual:ui:linux`
4. 全部收口后执行：
   - `npm run check:all`
   - 重新执行 UI audit

## 8. 风险与回滚

1. Escape ownership 守卫过严，可能误伤原有快捷键。
2. Dropdown contract 调整会影响 visual harness 和 dialog focus trap。
3. 长列表优化如果实现过度，会引入滚动同步或键盘导航新问题。
4. Bootstrap 收口若处理不当，会导致启动期闪烁或 visual baseline 漂移。

回滚策略：

1. 按阶段提交，保持可独立回退。
2. 某阶段失败时，只回退该阶段 touched files，不撤销前序已验证通过的阶段。

## 9. 验收标准

1. Launcher、Settings、Shared UI、Theme/bootstrap 的 audit 关键问题全部落地修复。
2. 每个阶段都有 focused tests 与视觉回归记录。
3. 最终 `npm run check:all` 通过。
4. 最终 audit 分数相较 `13/20` 提升，并给出模块化结果对比。
