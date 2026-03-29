# 2026-03-29 UI 审查遗留项修复计划

## 目标

承接 2026-03-29 UI 技术审查，处理本轮未纳入性能优化范围的非性能问题；优先收口 `P1/P2` 的可达性与交互语义问题，不改视觉方向。

## 已确认问题

1. `P1` 触控命中区偏小：`LauncherQueueSummaryPill` 当前主按钮为 `36x36`，低于 44px 触控建议值。
2. `P1` FlowPanel 顶部关闭按钮仍显式限制在 `36x36`，同样低于 44px 触控建议值。
3. `P2` FlowPanel 参数值编辑入口当前是可点击 `span`，缺少按钮语义与稳定键盘可达路径。

## 代码定位

- `src/components/launcher/parts/LauncherQueueSummaryPill.vue`
- `src/components/launcher/parts/LauncherFlowPanel.vue`
- 如需复核共享按钮尺寸约束，再看 `src/components/shared/ui/UiIconButton.vue`

## 实施范围

### Task 1

- 目标：补齐触控命中区与键盘语义的失败测试
- 文件：
  - `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
  - `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
  - 必要时补 `LauncherFlowPanel` focused tests
- 验收：
  - 先写失败测试
  - 覆盖 queue pill / close button 命中区与参数编辑入口键盘可达

### Task 2

- 目标：把 queue pill 与 FlowPanel close 命中区提升到 >=44px
- 文件：
  - `src/components/launcher/parts/LauncherQueueSummaryPill.vue`
  - `src/components/launcher/parts/LauncherFlowPanel.vue`
  - 必要时 `src/components/shared/ui/UiIconButton.vue`
- 验收：
  - 不破坏现有布局、拖拽区、焦点样式与视觉层级
  - 组件仍复用现有 token 与交互样式

### Task 3

- 目标：把参数值编辑入口从纯点击文本收口为具备按钮语义的交互控件
- 文件：
  - `src/components/launcher/parts/LauncherFlowPanel.vue`
  - 必要时补相关 i18n 文案与类型
- 验收：
  - Enter / Space 可进入编辑
  - 编辑态与提交/取消行为保持现有 contract
  - 不引入新的焦点陷阱

## 验证计划

1. focused tests
   - `npm test -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
   - `npm test -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
   - 必要时补充目标组件 focused tests
2. 全量门禁
   - `npm run check:all`
3. 交付输出
   - before/after 命中区尺寸
   - 参数值编辑入口的语义变化
   - 简版复审结论
