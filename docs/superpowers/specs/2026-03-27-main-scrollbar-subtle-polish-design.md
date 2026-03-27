# 主滚动容器细滚动条精修设计文档

日期: 2026-03-27
方案: 2 — 主容器显式挂载 + A 风格细滚动条
状态: 设计已确认，待进入 implementation plan

---

## 背景

当前项目中的滚动条存在两类不一致体验：

1. Settings 内容区在 [SettingsWindow.vue](/home/work/projects/zapcmd/src/components/settings/SettingsWindow.vue) 中仍使用 `.scrollbar-none` 隐藏视觉滚动条，用户缺少可滚动暗示。
2. Launcher 主面板与列表滚动区继续依赖浏览器原生滚动条，深色玻璃化界面里显得粗糙、生硬。
3. 项目近期已将高重复样式逐步收口到 [tailwind.css](/home/work/projects/zapcmd/src/styles/tailwind.css) 的 primitive / utility 层，因此这次滚动条精修也应延续“全局薄样式 + 模板显式挂载”的方向，而不是回到组件内局部 `<style>`。

本轮目标不是重做滚动结构，也不是统一所有浏览器控件视觉，而是把主内容滚动区从“原生或完全隐藏”提升到“克制、精致、可感知”的统一状态。

---

## 已确认约束

用户已明确确认以下决策：

- 视觉方向采用 **A：极细隐约**。
- 实施策略采用 **方案 2：主容器显式挂载**，而不是全局覆盖所有滚动区。
- 滚动条风格必须保持克制，不允许做高光过强、存在感过高的“装饰性组件”。
- 只覆盖主滚动容器：
  - Settings 主内容区；
  - Launcher 命令详情主内容区；
  - Launcher 执行流列表区；
  - Launcher 暂存列表区。
- 不改运行时逻辑，不做 JS 伪滚动，不劫持 wheel 事件。
- 本轮不新增主题 token，直接复用现有语义色变量。

---

## 方案对比

### 1. 全局覆盖

在全局层对所有滚动容器统一注入细滚动条样式。

优点：

- 模板改动最少
- 一次接管全部滚动条表现

缺点：

- 覆盖范围过大
- dropdown、原生输入框、多层浮层等次级滚动区会被一并影响
- 后续排查视觉回归的成本更高

### 2. 主容器显式挂载（采用）

在全局样式中定义一个通用细滚动条 utility，并只在主滚动容器模板上显式挂载。

优点：

- 与当前 Tailwind primitive 收口方向一致
- 范围精准，风险可控
- 既能统一主体验，又不会误伤次级容器

缺点：

- 需要逐个更新目标模板 class

### 3. 主题 Token 化后再挂载

先把滚动条宽度、默认 thumb、hover thumb 全部抽成主题变量，再由 utility 消费。

优点：

- 后续多主题扩展最整齐
- 主题系统最完整

缺点：

- 对当前需求来说改动偏重
- 会把一次视觉精修放大成主题系统演进

结论：采用 **2. 主容器显式挂载**。

---

## 详细设计

## 一、全局 utility 策略

### 设计

在 [src/styles/tailwind.css](/home/work/projects/zapcmd/src/styles/tailwind.css) 的 `@layer utilities` 中新增 `.scrollbar-subtle`。

该 utility 负责统一 A 风格细滚动条：

- Firefox：
  - `scrollbar-width: thin`
  - `scrollbar-color: rgba(var(--ui-text-rgb), <低透明度>) transparent`
- WebKit：
  - `::-webkit-scrollbar` 宽度为 `4px`
  - `::-webkit-scrollbar-track` 为透明
  - `::-webkit-scrollbar-thumb` 使用低对比度圆角 thumb
  - `::-webkit-scrollbar-thumb:hover` 仅做轻微提亮

### 颜色策略

- 不新增 `--ui-scrollbar-*` token。
- 直接复用 `--ui-text-rgb`，通过透明度控制默认态与 hover 态层级。
- 这样能确保黑曜石主题下继续呈现“浅色、克制、和边框同一体系”的视觉；如果未来主题切换到浅色系，也会自然跟随 `--ui-text-rgb` 变化。

### 不做的事

- 不设置 `scrollbar-gutter`
- 不增加轨道底色
- 不做品牌琥珀高光
- 不做阴影或发光

### 目的

- 解决“原生滚动条太粗糙”问题
- 保留“滚动条存在，但不抢内容注意力”的桌面工具气质
- 把滚动条收口为可复用 utility，而不是散落在多个模板里的 pseudo-element 胶水代码

---

## 二、挂载范围

### Settings

[SettingsWindow.vue](/home/work/projects/zapcmd/src/components/settings/SettingsWindow.vue) 中的 `.settings-content` 当前使用：

- `overflow-y-auto`
- `scrollbar-none`

本轮改为：

- 保留现有滚动语义与布局类
- 删除 `.scrollbar-none`
- 挂载 `.scrollbar-subtle`

### Launcher 主滚动容器

以下滚动区使用 `.scrollbar-subtle`：

1. [LauncherCommandPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherCommandPanel.vue) 的 `.command-panel__content`
2. [LauncherFlowPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherFlowPanel.vue) 的 `.flow-panel__list`
3. [LauncherStagingPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherStagingPanel.vue) 的 `.staging-list`

### Flow 空态容器的处理

[LauncherFlowPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherFlowPanel.vue) 的 `.flow-panel__body` 在空态时才启用 `overflow-y-auto`，有列表时由 `.flow-panel__list` 负责滚动。

本轮不强行把 `.scrollbar-subtle` 常驻挂到 `.flow-panel__body`，避免与“有列表时 `overflow-hidden`”的状态混淆。主滚动条风格仍以真实承担滚动的容器为准。

### 暂不覆盖

以下区域本轮不纳入：

- dropdown 菜单内部滚动区
- 可能存在的 textarea / input 原生滚动条
- 未来新增但尚未纳入主流程的次级滚动容器

### 目的

- 命中用户最容易感知的滚动区
- 保证 Settings 与 Launcher 主体验一致
- 避免全局覆盖带来的误伤

---

## 三、交互与可用性要求

### 保持不变

- 所有目标容器继续保留 `overflow-y-auto`
- 继续使用浏览器原生滚动机制
- 鼠标滚轮、触控板、键盘滚动、拖拽 thumb 都必须保持正常

### 视觉表现

- 默认态：可见但极弱，仅作为滚动暗示
- hover 态：轻微提亮，让用户在接近滚动条时更容易发现可交互区域
- 不允许 hover 后亮度超过当前卡片边框 / 分隔线体系太多，避免抢戏

### 可访问性取向

- 虽然采用克制方案，但仍需比“完全隐藏滚动条”更可感知
- 不追求强可见性，因此不会走方案 C 的厚轨道路线
- 若后续用户反馈“仍然太弱”，应在 planning / 执行阶段优先考虑小幅提高透明度，而不是立刻改宽度或改风格方向

---

## 四、测试策略

### 1. 样式契约测试

在现有样式契约测试中新增或扩展断言，确保 [tailwind.css](/home/work/projects/zapcmd/src/styles/tailwind.css) 存在：

- `.scrollbar-subtle`
- `scrollbar-width: thin`
- `::-webkit-scrollbar`
- 透明 track
- 默认 thumb
- hover thumb

重点是锁住“utility 存在且关键 pseudo-element 逻辑未丢”。

### 2. 模板 class contract

对 Settings 与 Launcher 主滚动容器补充模板约束测试，至少确保：

- `.settings-content` 含 `.scrollbar-subtle`
- `.settings-content` 不再含 `.scrollbar-none`
- `.command-panel__content` 含 `.scrollbar-subtle`
- `.flow-panel__list` 含 `.scrollbar-subtle`
- `.staging-list` 含 `.scrollbar-subtle`

### 3. 手工验证重点

实施阶段需要至少验证：

- Settings 任一路由长内容滚动时，滚动条可见但克制
- Launcher 命令详情长内容区滚动表现正常
- 执行流列表与暂存列表在 hover 时有轻微提亮
- Windows 深色环境下不出现过亮、过粗、突兀的滚动条

---

## 五、风险与规避

### 风险 1：细滚动条仍然太弱

如果默认透明度过低，用户可能仍然觉得“像没有改”。

规避：

- 先锁 `4px` 宽度不变
- 只通过透明度做小步调整
- hover 态一定要比默认态明显，但增量控制在克制范围内

### 风险 2：误伤非主容器滚动区

如果实现时偷懒改成全局覆盖，可能把 dropdown 或系统控件一起改掉。

规避：

- 只新增 utility，不写全局 `*::-webkit-scrollbar`
- 通过模板 class contract 锁住显式挂载点

### 风险 3：FlowPanel 双滚动容器状态混淆

`flow-panel__body` 与 `flow-panel__list` 的滚动职责随状态切换，若挂载位置错误，可能出现空态和有列表态视觉不一致。

规避：

- 以真实承担滚动的容器为准
- planning 阶段明确空态是否需要把 `.scrollbar-subtle` 条件性挂到 `.flow-panel__body`
- 若实现时为简化而增加条件类，必须有对应测试锁定

---

## 非目标

本轮不处理以下内容：

- 全局所有滚动区统一
- 主题 token 体系扩展
- 下拉菜单、浮层、输入框滚动条重做
- JS 自定义滚动行为
- 滚动惯性、虚拟列表或性能优化

---

## 产出预期

完成后，项目中的主滚动容器应从“原生粗糙 / 完全隐藏”收口为统一的细滚动条语言：

- Settings 不再没有滚动暗示
- Launcher 不再保留突兀的浏览器默认滚动条
- 全局视觉仍保持黑曜石主题下的克制、专业与桌面工具感

下一阶段进入 `writing-plans`，把样式落点、测试顺序、Flow 空态条件挂载策略拆成可执行步骤。
