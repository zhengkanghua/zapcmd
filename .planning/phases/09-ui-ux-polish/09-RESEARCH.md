# Phase 9: UI/UX 小幅精修 - Research

**Researched:** 2026-03-06
**Domain:** 启动器 / 设置页的键盘可达性、焦点提示与状态反馈小幅精修
**Confidence:** HIGH

<user_constraints>
## User Constraints (from 09-CONTEXT.md)

### Locked Decisions
- `Esc` 采用“分层后退”语义：先关闭安全确认/参数弹层，再处理主界面层级。
- 启动器主界面在有查询文本时，按一次 `Esc` 优先清空查询，而不是直接隐藏主窗。
- 只有在无弹层、无待收起主层、查询已清空时，`Esc` 才进入隐藏主窗。
- `Tab` 继续承担 staging 队列开关职责，不改成主界面的通用焦点遍历键。
- 当用户切换到队列区而队列当前收起时，应自动展开并定位到当前队列项。
- 启动器无结果空态保持轻量，采用“一句话 + 下一步提示”。
- 设置页“保存成功 / 保存失败”统一走顶部 Toast 位置。
- 命令加载失败、更新失败等功能性错误留在各自功能区，不提升为全局总览横幅。
- 区域内错误反馈必须同时体现：出了什么问题、影响到哪块功能、用户下一步能做什么。
- 终端检测、更新检查/下载等加载过程需要更强的“正在进行中”感知。

### Claude's Discretion
- Toast 停留时长、动画强度、是否支持手动关闭，可在实现阶段按最小改动决定。
- 空态与反馈文案可分别按 `zh-CN` / `en-US` 润色，但必须保持轻量、可操作。
- “更强的加载感”优先在现有视觉体系内增强，不引入新的重型组件体系。

### Deferred Ideas (OUT OF SCOPE)
- 大规模 UI 重做、整体信息架构重排。
- onboarding、命令推荐、引导式新功能空态。
- 全量统一所有自定义下拉/选择控件的交互模型。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|------------------------------------|------------------|
| UX-01 | 启动器/设置页键盘可达性与焦点行为一致（focus 可见、Tab 顺序合理、Esc 行为一致且不误触） | 以 `useMainWindowShell` + `windowKeydownHandlers/*` 为主线，补齐启动器与设置页的 Esc/Tab/焦点区切换契约，并把关键行为固定到回归测试。 |
| UX-02 | 信息层级、间距/对齐、对比度更一致；关键状态（空态/加载/错误）有清晰反馈 | 以 `LauncherSearchPanel`、`SettingsWindow`、`SettingsCommandsSection`、`SettingsAboutSection`、`styles.css` 为主落点，统一无结果、保存反馈、区域错误与加载提示。 |
</phase_requirements>

## 现状盘点（基于仓库真实代码）

### 1) 启动器键盘流已有明确主干，但“契约统一”仍主要靠分散逻辑维持
- `src/composables/launcher/useMainWindowShell.ts`
  - `handleMainEscape()` 当前顺序为：安全确认 → 参数弹层 → 清空查询 → 收起队列 → 隐藏主窗。
  - 该顺序与本次已锁定的“分层后退”方向基本一致，是 Phase 9 最小改动的核心入口。
- `src/features/hotkeys/windowKeydownHandlers/main.ts`
  - 全局热键层已区分：焦点切换、队列开关、队列执行、结果导航、队列导航/重排/删除。
  - `Ctrl/Cmd+Tab` 与“切换焦点”热键会在切换前先 `openStagingDrawer()`，然后 `switchFocusZone()`。
  - 说明当前架构已经支持“切到队列前自动展开”，无需大改交互模型。
- `src/features/hotkeys/windowKeydownHandlers/settings.ts`
  - 设置页内已固定优先级：录制快捷键 > 终端下拉列表 > 关闭设置窗口。
  - 现有逻辑已经符合“先关局部，再退全局”的方向，可作为与启动器统一口径的参照物。
- `src/composables/launcher/useSearchFocus.ts` 与 `src/composables/launcher/useStagingQueue/focus.ts`
  - 已存在搜索框重聚焦、队列焦点维护、滚动跟随等基础设施，Phase 9 不需要引入新的焦点系统。

### 2) 焦点提示与激活态存在基础样式，但 focus-visible 覆盖并不均匀
- `src/styles.css`
  - 已有 `.result-item--active`、`.staging-card--active` 等激活态样式。
  - 已有少量明确的键盘焦点样式：如 `.settings-display-mode__button:focus-visible`。
  - 但其他高频交互控件更多依赖 `:focus`、`focus-within` 或“active item”类名，而不是统一、稳定的 `focus-visible` 体系。
- 这意味着 UX-01 的“focus 可见”如果只靠现有 active class，很容易出现：键盘可操作但视觉提示不够一致。

### 3) 状态反馈入口很多，但层级还没有完全统一
- `src/components/launcher/parts/LauncherSearchPanel.vue`
  - 已有执行反馈 Toast（`execution-feedback execution-toast`）和无结果空态（`drawer-empty`）。
  - 当前无结果空态仅是一句文案，没有明确下一步提示。
- `src/components/settings/SettingsWindow.vue`
  - 保存成功使用顶部 Toast（`.settings-ok.execution-toast`），并带自动消失动画。
  - 保存失败仍是底部行内错误（`.settings-error`），与成功反馈位置不一致。
- `src/components/settings/parts/SettingsCommandsSection.vue`
  - 命令加载问题已经留在本区域内显示，天然符合“功能性错误留在本区”的决策。
- `src/components/settings/parts/SettingsAboutSection.vue`
  - 更新流程已有 checking/downloading/installing/error 等状态模型，并可按阶段渲染失败说明。
  - 当前已具备局部错误容器，但“加载中的存在感”仍主要依赖状态文本和按钮文案切换。
- `src/components/settings/parts/SettingsGeneralSection.vue`
  - 终端检测中的“loading”主要体现为禁用控件 + 按钮文案变化，视觉强调较弱。

### 4) 现有测试已经覆盖很多关键行为，适合做“补契约”而不是重建体系
- `src/__tests__/app.hotkeys.test.ts`
  - 已覆盖结果导航、入队、Esc 清空查询、Esc 关闭参数弹层、Esc 关闭队列、Esc 关闭安全弹层、队列 active 卡片等行为。
- `src/__tests__/app.settings-hotkeys.test.ts`
  - 已覆盖设置页录制快捷键的 Esc 取消、终端下拉先关闭再关设置窗口、保存成功/失败反馈。
- `src/__tests__/app.failure-events.test.ts`
  - 已覆盖设置错误、保存成功自动消失、终端检测 loading、更新失败提示等部分失败与反馈场景。
- `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`
  - 已对更新错误指引做了组件级断言，适合继续扩展为更清晰的局部状态契约。

## 缺口与风险（Phase 09 需要补齐）

1. **保存反馈位置不一致**  
   当前“保存成功”在顶部 Toast，“保存失败”在底部行内错误；与已锁定的上下文决策不一致，是最直接的行为/视觉缺口。

2. **无结果空态过于轻描淡写**  
   启动器无结果只有一句文案，没有“下一步提示”，不满足本次锁定的空态口径。

3. **加载态存在感偏弱**  
   终端检测、更新检查/下载已具备状态机，但视觉表达仍较克制；如果不补充更明显的加载反馈，很难达成 UX-02 中的“关键状态清晰反馈”。

4. **focus-visible 体系不统一**  
   设置页部分控件有明确 focus-visible，launcher 结果项与队列项更多依赖 active class；键盘可达性与视觉提示之间仍存在“行为有了、提示不够统一”的风险。

5. **分层后退的回归口径尚未被明确汇总**  
   启动器和设置页各自已有测试，但尚缺一组明确围绕“分层后退”与“队列自动展开切焦点”的回归补位，后续微调时容易退化。

## 推荐规划切片（给 planner 的可执行建议）

### 切片 A：键盘流与焦点可见性契约加固（UX-01）
- 目标：把启动器/设置页的 Esc、Tab、焦点区切换与 focus-visible 规则固化下来。
- 主文件：
  - `src/composables/launcher/useMainWindowShell.ts`
  - `src/features/hotkeys/windowKeydownHandlers/main.ts`
  - `src/features/hotkeys/windowKeydownHandlers/settings.ts`
  - `src/composables/launcher/useStagingQueue/focus.ts`
  - `src/styles.css`
  - `src/__tests__/app.hotkeys.test.ts`
  - `src/__tests__/app.settings-hotkeys.test.ts`
- 预期产出：键盘行为契约与焦点视觉提示对齐，至少补齐 1-2 条关键回归。

### 切片 B：状态反馈与信息层级微调（UX-02）
- 目标：统一设置保存反馈位置，补强无结果空态和加载/错误状态的可见性，不扩大功能范围。
- 主文件：
  - `src/components/launcher/parts/LauncherSearchPanel.vue`
  - `src/components/settings/SettingsWindow.vue`
  - `src/components/settings/parts/SettingsCommandsSection.vue`
  - `src/components/settings/parts/SettingsAboutSection.vue`
  - `src/components/settings/parts/SettingsGeneralSection.vue`
  - `src/styles.css`
  - `src/i18n/messages.ts`
  - `src/__tests__/app.failure-events.test.ts`
  - `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`
- 预期产出：无结果/保存/加载/区域错误反馈层级统一到上下文约束内。

### 切片 C：Phase 09 收敛验收（跨交互回归 + 样式一致性检查）
- 目标：以最小集成回归和统一断言口径收尾，确认不会因 Phase 9 微调引入新的交互回退。
- 主文件：
  - `src/__tests__/app.hotkeys.test.ts`
  - `src/__tests__/app.settings-hotkeys.test.ts`
  - `src/__tests__/app.failure-events.test.ts`
  - （必要时）`src/components/settings/parts/__tests__/*`
- 预期产出：Phase 9 关键体验改动可被自动化回归证明，并能进入 `check:all` 口径。

## 计划阶段注意事项

- 优先沿用现有 composable / handler / 组件边界，不把逻辑重新堆回 `App.vue`。
- 文案新增或修改应收敛到 `src/i18n/messages.ts`，避免组件内硬编码。
- 测试优先断言“行为 + 关键状态/类名/片段”，减少整句文案硬编码造成的脆弱性。
- Phase 9 是“小幅精修”，应优先做最小可验证改动，不趁机重做 settings 控件体系。

## Sources

### Primary
- `.planning/phases/09-ui-ux-polish/09-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.codex/get-shit-done/references/ui-brand.md`
- `src/composables/launcher/useMainWindowShell.ts`
- `src/composables/launcher/useSearchFocus.ts`
- `src/composables/launcher/useStagingQueue/focus.ts`
- `src/features/hotkeys/windowKeydownHandlers/main.ts`
- `src/features/hotkeys/windowKeydownHandlers/settings.ts`
- `src/components/launcher/LauncherWindow.vue`
- `src/components/launcher/parts/LauncherSearchPanel.vue`
- `src/components/settings/SettingsWindow.vue`
- `src/components/settings/parts/SettingsGeneralSection.vue`
- `src/components/settings/parts/SettingsCommandsSection.vue`
- `src/components/settings/parts/SettingsAboutSection.vue`
- `src/styles.css`
- `src/__tests__/app.hotkeys.test.ts`
- `src/__tests__/app.settings-hotkeys.test.ts`
- `src/__tests__/app.failure-events.test.ts`
- `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`

## RESEARCH COMPLETE
