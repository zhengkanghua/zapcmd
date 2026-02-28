---
mode: plan
cwd: D:\own_projects\zap
task: 基于 docs/ui_debug_screenshots 修复弹窗交互（隐形遮罩）与 Settings 原生窗口/侧边栏收缩、筛选布局、快捷键录制、Action Bar、最大化等问题
complexity: medium
planning_method: builtin
created_at: 2026-02-26T15:30:46.6602130+08:00
---

# Plan: UI Debug Screenshots 修复与 Settings 体验优化

🎯 任务概述
本次根据 `docs/ui_debug_screenshots/1.png` ~ `5.png` 中暴露的问题，对启动器弹窗（参数/安全确认）与 Settings 窗口进行一次 UI/UX 体检与修复。
目标是：弹窗支持点击空白处返回，且遮罩层仅承担交互（用户视觉上“看不到遮罩”）；按钮更现代且主次明确；Settings 回归原生窗口（不做自绘标题栏），仅保留侧边栏导航并在窗口过小时自动收缩为图标；Settings 的筛选/搜索/快捷键录制更紧凑清晰；底部 Action Bar 更符合桌面端规范；Settings 窗口支持最大化，并降低“盒中盒”的局促感。

📝 修订记录
- 2026-02-26：根据补充需求调整为“隐形遮罩”（保留点击拦截但不做视觉蒙层）；Settings 回归原生标题栏并固定侧边栏导航（不再降级为顶部 Tabs），改为窄窗自动收缩为图标 + hover 提示。

📋 执行计划
1. 复现与对齐截图
   - 在当前主分支运行应用，对照 `2.png/4.png/5.png` 逐项确认“现状”和“期望结果”，在 issue/PR 描述中列出验收清单。
   - 明确变更边界：仅改 UI 展示/交互与窗口属性，不引入新的业务逻辑/权限/回退路径。

2. 隐形遮罩 + 点击空白处关闭（图 2）
   - 将 `.param-overlay` 调整为“可点击拦截层但视觉透明”（例如背景透明、禁用 blur），避免把透明窗口的矩形边界“显形”。
   - 为参数弹窗与安全确认弹窗增加“点击空白处（overlay 自身）= 取消/返回”的交互（使用 `@click.self`，避免误触关闭）。
   - 为 `.param-dialog` 增加更清晰的卡片背景/边框/阴影，使在无蒙层时仍有稳定的视觉聚焦。
   - 验收：点击空白处能关闭弹窗；点击弹窗内容区域不关闭；Esc 行为保持不变；弹窗打开时背景内容不被误操作（至少鼠标层面被拦截，键盘焦点保持在弹窗）。

3. 优化参数弹窗按钮（图 2）
   - 将参数弹窗 footer 的按钮改为统一按钮体系（`btn-muted`/`btn-primary`），修复文字贴边与缺乏主次的问题。
   - 明确按钮语义：取消为次要；“立即执行/加入队列”为主要。
   - 验收：按钮内边距一致；主按钮视觉强调明显；hover/focus 状态符合现有风格。

4. 压缩 Commands 筛选区占用（图 4）
   - 将“来源/状态/冲突/导入问题”四个筛选控件从 2x2 改为更紧凑的横向布局（大窗口优先单行；小窗口自动换行或降级为单列）。
   - 如单行仍不理想：备选方案为新增“Filter”按钮，点击后在 Popover 中集中编辑筛选（此为第二选择，需评估实现成本与可用性）。
   - 验收：同等窗口高度下，命令列表区域可见行数明显增加；筛选仍易发现、易操作。

5. 为命令搜索框加入 Search Icon（图 4）
   - 在搜索输入框左侧加入标准放大镜 Icon（优先 inline SVG），并调整输入框左内边距与对齐。
   - 验收：无需读文案也能一眼识别为搜索框；不影响键盘输入与可访问性（label/aria）。

6. 调整快捷键录制控件比例与状态提示（图 5）
   - 缩小 `.hotkey-recorder` 的高度与“横向空洞感”（例如改为自适应宽度/最大宽度，并左对齐）。
   - 在控件内或右侧增加明确状态：空闲态“点击修改”；录制态“录制中”（保留现有“请按快捷键...”语义）。
   - 验收：字段在 1~2 列布局下都不显突兀；录制状态一眼可见；现有录制与 Esc 取消逻辑不回归。

7. Settings 回归原生窗口 + 固定侧边栏导航（图 4 & 图 5）
   - 取消“自绘标题栏”的存在感：移除/弱化页面内 `Settings` 顶部 header（含 drag-region），以原生窗口标题栏承载“标题/拖拽/最大化”等能力。
   - 导航只保留侧边栏（不再在窄窗改为顶部 Tabs）：窗口宽度不足时，侧边栏自动收缩为“图标列”；鼠标悬浮用 tooltip/title 提示对应含义。
   - 验收：无论窗口大小，导航位置始终在左侧；窄窗自动收缩后仍可清晰操作；hover 提示可用；键盘可达性不回归（Tab/Enter 可导航）。

8. 调整 Settings 底部 Action Bar（图 4 & 图 5）
   - 为 Settings 外层容器或 footer 增加统一安全边距（建议 `padding: 24px`），避免按钮贴边。
   - Footer 按钮改为桌面端常见组合：`取消 / 应用 / 确定`，并将按钮集中放置在右下角。
   - 交互建议：应用=保存但不关闭；确定=保存成功后关闭；取消=直接关闭不保存。
   - 同步简化“盒中盒”视觉层级：减少不必要的边框/背景叠层（例如 nav/content 的边框强度、背景透明度与 padding/gap），让 Settings 更“轻”和更像工具设置页。
   - 验收：按钮不再贴边；顺序与语义清晰；保存失败时不自动关闭并给出错误提示。

9. 允许 Settings 窗口最大化（图 4 & 图 5）
   - 将 Settings Window 的 `maximizable` 打开，并确认在 Windows/macOS 下行为一致（最大化/还原不破坏布局与最小尺寸约束）。
   - 验收：Settings 窗口可最大化；最大化后内容布局自适应正常。

10. 测试与回归（工程门禁）
   - 单元/回归：补齐弹窗“点击遮罩关闭”的测试；补齐 Settings footer 按钮新行为的测试（至少覆盖：应用不关闭、确定保存后关闭、取消不保存）。
   - 本地门禁：依次跑 `npm run check:all`（包含 lint/typecheck/test/build/check:rust），并补充 `npm run test:coverage` 确保覆盖率不降。

⚠️ 风险与注意事项
- 隐形遮罩：缺少视觉蒙层可能降低“模态感”，需要通过弹窗卡片样式与焦点管理确保用户明确当前处于弹窗交互中。
- 筛选区重排：布局改动需同时验证窄窗口断点（CSS media query）与键盘导航可达性。
- Settings 导航收缩：需要新增/引入图标展示与 tooltip，避免收缩后失去可识别性；同时注意 hover-only 信息的可访问性（aria-label/title）。
- Settings 按钮语义变更：新增“应用/确定”会影响用户心理模型，需要确保保存失败提示清晰且不会误关闭。
- 原生标题栏/最大化：需要确认 Settings 窗口的 decorations/maximizable 与 macOS/Windows 行为一致，且最小尺寸约束不会导致布局崩坏。

📎 参考
- `docs/ui_debug_screenshots/2.png:1`
- `docs/ui_debug_screenshots/4.png:1`
- `docs/ui_debug_screenshots/5.png:1`
- `src/components/launcher/parts/LauncherParamOverlay.vue:17`
- `src/components/launcher/parts/LauncherSafetyOverlay.vue:14`
- `src/styles.css:634`
- `src/components/settings/parts/SettingsCommandsSection.vue:41`
- `src/styles.css:1067`
- `src/components/settings/parts/SettingsHotkeysSection.vue:14`
- `src/styles.css:1031`
- `src/components/settings/SettingsWindow.vue:110`
- `src/components/settings/SettingsWindow.vue:45`
- `src/components/settings/parts/SettingsNav.vue:1`
- `src/styles.css:741`
- `src/styles.css:1232`
- `src/composables/settings/useSettingsWindow/persistence.ts:27`
- `src-tauri/src/windowing.rs:63`
