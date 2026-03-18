# Settings 通用/命令页深色精修设计文档

日期: 2026-03-18
方案: B — 融合高级版（系统栏融合 + 精细化内容层）
状态: 设计已确认，待用户审阅设计文档

---

## 背景

在已完成的 settings 重构基础上，当前界面仍存在明显的“粗糙感”和层级问题，主要体现在：

1. 顶部 Tab 下方仍有一条残留的浅色层，导致窗口头部像叠了两层不一致的壳。
2. General / Appearance / About 路由在 Tab 已表达当前页面后，页内又重复显示同名标题，首屏节奏冗余。
3. General 页的 Select、Toggle、信息提示仍偏传统表单气质，不够精致，也缺少桌面设置页应有的呼吸感。
4. Commands 页的搜索、筛选、统计和列表仍是“粗 pill + 表单化控件 + 重卡片行”的组合，缺少 Raycast / GitHub 风格的轻量管理列表感。
5. Dropdown 体系分裂为 `SSelect` 与 `SFilterChip` 两套实现，视觉语言和交互细节不统一。
6. 现有颜色与层级虽然部分已接入 settings token，但仍未形成一套覆盖 toolbar、dropdown、badge、table、toggle 的完整 settings 设计系统。

参考素材：

- 当前截图: `docs/bug_img/bug1.png`
- 当前截图: `docs/bug_img/bug2.png`
- 当前截图: `docs/bug_img/bug3.png`
- 参考方向: `docs/bug_img/gemini.png`
- 参考方向: `docs/bug_img/gemini2.png`
- 参考方向: `docs/bug_img/gemini3.png`
- Dropdown 参考: `docs/bug_img/image.png`

---

## 已确认约束

用户已明确确认以下约束：

- 采用 **B. 融合高级版**，不做完全自绘窗体，也不做仅改边框的保守修补。
- 主题策略继续跟随 `obsidian` 主色体系，不单独切成蓝色主题。
- 如果需要新增颜色或层级语义，必须纳入主题系统，便于以后其他主题统一替换。
- 只有系统层中“无法精细控制颜色”的区域才使用原生暗色能力，典型场景是原生标题栏。
- 只要是 WebView 内可控区域，必须使用我们自己的 theme token 和组件设计，不依赖“原生暗色凑效果”。
- Commands 页筛选区采用“首排精简 + 次级收纳”的信息密度，不保留所有筛选项横向平铺。
- General / Appearance / About 路由去掉页内重复的大标题；Tab 已经承担当前路由表达。
- Hotkeys 页保留真正有信息增量的分组标题，如“全局快捷键”“搜索区快捷键”。

---

## 方案对比

### A. 保守精修

只调整边框、间距、hover 和控件尺寸，尽量不动页面结构。

优点：

- 风险最低
- 代码改动相对最小

缺点：

- 很难解决 Commands 页首屏拥挤问题
- 很难把 Settings 做出真正统一的高级感

### B. 融合高级版（推荐，已选定）

保留系统标题栏，但通过系统暗色能力消除白色割裂；WebView 内部以完整的 settings 设计系统重构 topbar、General、Commands 与共享控件。

优点：

- 最接近用户给出的参考图方向
- 风险与收益平衡最好
- 可以同时解决头部割裂、下拉框粗糙、命令页拥挤与主题体系不完整的问题

缺点：

- 需要重构 Commands 工具栏结构
- 需要把 `SSelect` / `SFilterChip` 收口为统一 primitive

### C. 沉浸自绘版

回到完整自绘深色窗体，顶部系统区域与内容区完全统一。

优点：

- 沉浸感最强
- 理论视觉上限最高

缺点：

- 窗体层风险最高
- 跨平台细节成本明显增加

结论：采用 **B. 融合高级版**。

---

## 总体设计原则

### 1. 系统层只负责“不出戏”

- 原生标题栏等系统控制区，只在“我们无法精细控制颜色和材质”的前提下使用原生暗色能力。
- Windows 上 settings 窗口应显式切换到原生 dark theme，消除当前白色标题栏与深色内容区之间的割裂。
- 系统层的目标只是兜底，不承担“精美设计”的主要职责。

### 2. 可控内容层全部进入 design system

- 所有 WebView 可控区域都必须使用自定义 token 和组件系统实现，包括：
  - topbar
  - tab
  - section card
  - row hover
  - dropdown trigger / popover
  - toolbar filter
  - search input
  - badge
  - toggle
  - table row
  - status block
- 不允许把这些区域简单交给“原生暗色”处理。

### 3. 目标不是“更暗”，而是“更细”

- 以 obsidian 的深色基底为基础。
- 通过更弱但更准确的边界、背景层次、hover 反馈、阴影、毛玻璃与排版节奏，实现更现代、更精美、更克制的桌面设置页。

### 4. 路由标题去冗余

- 当顶部 Tab 已明确当前页面时，页内不再重复显示同名路由标题。
- 保留的标题只能是“真正提供信息增量的分组标题”。

---

## 一、窗口头部与整体壳体

### 设计

- 保留原生系统标题栏，不做完整自绘头部。
- Settings 窗口创建时显式设置窗口主题为暗色，让原生标题栏与 obsidian 基底尽量接近。
- WebView 内保留一条应用级 topbar，承载 Tab 导航。
- 顶部只保留一条明确边界：
  - 系统标题栏
  - 应用 topbar
  - 内容区
  三者在色阶和分隔上收敛成一个连续的“窗口头部块”。
- 修掉当前 Tab 下方残留的浅色层，不再让头部像双层叠壳。

### 目的

- 解决 `bug1.png` 中最突兀的头部割裂问题。
- 在不承担完整自绘风险的前提下，让 settings 从顶部开始就更统一。

---

## 二、General Settings

### 设计

- 页面不再显示重复的“通用”大标题。
- 页面直接进入 3 个信息分组：
  - 启动
  - 终端
  - 界面

### `SettingSection`

- 每个分组由 section label + card shell + item list 组成。
- 外层卡片不使用粗重描边，而是使用极弱边框、轻微背景层次与小阴影。
- Section 容器禁止使用 `overflow-hidden`，避免 dropdown popover 被裁切。

### `SettingItem`

- 每一行统一支持：
  - `label`
  - `description`
  - `control`
- 左侧是标题 + 副标题双层信息结构。
- 右侧是尺寸受控的控件区域。
- 副标题不再散落成卡片底部的单独 hint 段落，而是收进 item 内部。

### 启动区

- `自动检查更新`
- `开机自启`
- 两项都使用更精细的小尺寸 macOS/iOS 风格 toggle。
- 说明文字直接附着在对应 item 下方。

### 终端区

- `默认终端` 使用 `SDropdown variant="default"`。
- Trigger 固定宽度，桌面设置控件化，不再像网页表单。
- 下拉项只显示终端名称，不显示路径。
- 当前终端路径拆成独立只读 item，右侧是单行截断的 mono capsule。
- “选择器”和“详情展示”职责彻底分离。

### 界面区

- `界面语言` 作为独立小分组。
- 与终端区分开，形成更清楚的节奏和留白。

### 目的

- 让 General 页从“传统设置表单”变成“精致桌面偏好设置”。
- 解决下拉框粗糙、信息层级不清、提示文字散乱的问题。

---

## 三、Commands List

### 页面定位

Commands 页不再表现为“很多筛选 pill + 一堆卡片行”的设置表单，而是重构为轻量管理列表。

### 顶部工具栏

- 工具栏做成独立 `sticky` 区域，层级高于列表内容。
- 第一行只有一个全宽搜索框：
  - 左侧搜索图标
  - 无重边框
  - 深色低对比背景
  - 更强调内容检索，而不是表单输入
- 第二行是筛选控制区：
  - 首排仅保留 3~4 个高频筛选，优先为：来源、分类、状态、排序
  - `文件`、`冲突状态`、`问题状态`、`覆盖状态` 等低频筛选收进 `更多筛选`
  - 不再横向平铺所有条件
- 右侧 summary 变为更轻的统计 badge，不抢视线。

### ghost dropdown 筛选器

- 所有筛选器统一改为 `SDropdown variant="ghost"`。
- Trigger 更像 toolbar button，而不是输入框：
  - 宽度自适应
  - 极弱背景
  - 无重边框
  - hover 微微加深
- 激活态使用主题强调色文字、轻底色与弱描边表达，不用重 pill 形态。

### 列表结构

- 表头与数据行统一走 `grid-cols-12` 对齐模型。
- 推荐列分布：
  - 命令信息：6
  - 分类：2
  - 来源：2
  - 启用开关：2
- 整体列表作为一个轻量容器，内部用极弱 `divide-y` 区分行，而不是“一行一个厚卡片”。

### 行内内容

- 命令列：
  - 上方命令名
  - 下方命令 id（mono、小字号、低对比）
- 分类改为细小 badge，而非裸文本或大 pill。
- 来源也降噪，保留小圆点或轻量文本标记。
- 启用开关右对齐，使用 compact toggle。

### hover 反馈

- 行 hover 时：
  - 背景轻微提亮
  - 命令名向主题强调色靠近
  - badge / 来源标记略提亮
- 不做夸张位移或缩放，保持安静高级。

### 目的

- 解决 `bug3.png` 中“没有呼吸感、输入框不现代化、筛选控件很突兀”的问题。
- 让命令页更接近 Raycast / GitHub 的数据管理体验。

---

## 四、共享控件体系

### 统一为 `SDropdown`

- 现有 `SSelect` 与 `SFilterChip` 收口为一个统一 primitive：`SDropdown`。
- 统一共享以下交互能力：
  - 打开 / 关闭
  - 键盘导航
  - 点击外部关闭
  - Teleport 浮层
  - 定位逻辑
  - 选中项 check

### `variant="default"`

- 用于 General 等标准设置输入。
- 固定宽度、深色底、弱描边、轻微内凹感。
- 更像桌面偏好设置控件，而不是网页表单。

### `variant="ghost"`

- 用于 Commands 工具栏。
- 像 toolbar button：
  - 宽度自适应
  - 极弱背景
  - 几乎无边框
  - 激活态仍克制

### Popover 规范

- 深色半透明背景
- `backdrop-blur-xl`
- 更细内边距
- 弱边框
- 柔和阴影
- 入场动画为轻量 `fade + scale(0.96 -> 1)`
- 提供 `prefers-reduced-motion` 降级
- 选中项右侧显示 check
- hover 时轻微提亮主题色

### Click Outside

- 必须稳定处理点击外部关闭。
- 该逻辑只保留一套，不允许 `default` / `ghost` 分别维护两套关闭行为。

---

## 五、Toggle 精修

### 设计

- 保留 switch 语义不变。
- 视觉上更靠近 macOS / iOS：
  - 更小
  - 更圆
  - 滑块更细
  - 阴影更克制
  - 开启 / 关闭对比更清楚
- 开启态使用当前主题强调色，但要从“功能黄块”收敛为更高级的亮面强调。
- Commands 表格中的 compact toggle 使用同一套语言，只缩小尺寸。

### 目的

- 把当前偏粗的 toggle 收口成真正统一的 settings 控件。

---

## 六、Theme Token 体系

### 原则

- 只要是我们能控制的内容区，都必须接入 settings token。
- 不允许在 settings 组件里散写颜色。

### 建议新增的 theme 层

- `--theme-settings-surface-*`
- `--theme-settings-toolbar-*`
- `--theme-settings-dropdown-*`
- `--theme-settings-badge-*`
- `--theme-settings-focus-*`
- `--theme-settings-toggle-*`
- `--theme-settings-table-*`
- `--theme-settings-status-*`

### 建议语义映射

- 主题层：`--theme-settings-*`
- UI 语义层：`--ui-settings-*`

例如：

- `--theme-settings-toolbar-bg`
- `--theme-settings-toolbar-sticky-bg`
- `--theme-settings-dropdown-bg`
- `--theme-settings-dropdown-border`
- `--theme-settings-dropdown-hover`
- `--theme-settings-badge-bg`
- `--theme-settings-badge-text`
- `--theme-settings-focus-ring`
- `--theme-settings-toggle-off`
- `--theme-settings-toggle-thumb`
- `--theme-settings-table-row-hover`

### 结果

- obsidian 下可得到完整的 settings 深色高级风。
- 未来其他主题只需要覆盖 `--theme-settings-*`，无需重写组件结构。

---

## 七、层级与遮挡规则

### 设计

- 设置独立的 settings 内部层级体系，而不是到处写任意大 z-index。
- 建议语义层级：
  - `settings-topbar`: 30
  - `settings-sticky-toolbar`: 40
  - `settings-popover`: 100
  - `settings-overlay`: 110

### 要求

- Commands 工具栏必须高于列表。
- Dropdown popover 必须高于工具栏和数据行。
- 任何 section/card 容器都不能通过 `overflow-hidden` 截断浮层。

### 目的

- 彻底解决 dropdown 被父级遮挡、被 sticky 区域压住或被卡片裁切的问题。

---

## 八、去掉重复页标题的规则

以下页面不再显示与当前 Tab 同名的页内大标题：

- General
- Appearance
- About

保留标题的条件：

- 必须提供新的信息层级或分组含义。
- 不能只是把当前路由名再说一遍。

因此：

- General 直接进入 `启动 / 终端 / 界面`
- Appearance 直接进入 `主题 / 效果 / 预览`
- About 直接进入品牌区 / 信息卡 / 更新卡
- Hotkeys 保留 `全局快捷键 / 搜索区快捷键 / 执行流快捷键`

---

## 影响文件

- `src-tauri/src/windowing.rs`
  - 为 settings 窗口补充暗色窗口主题能力，并保留原生 decorations。
- `src/components/settings/SettingsWindow.vue`
  - 继续承担顶层壳体与 route 切换，但顶部视觉需要配合新 topbar 收口。
- `src/components/settings/parts/SettingsGeneralSection.vue`
  - 去掉重复页标题，引入 `SettingSection / SettingItem` 结构。
- `src/components/settings/parts/SettingsCommandsSection.vue`
  - 重写 toolbar、筛选区和数据列表结构。
- `src/components/settings/parts/SettingsAppearanceSection.vue`
  - 去掉重复页标题。
- `src/components/settings/parts/SettingsAboutSection.vue`
  - 去掉重复页标题与重复“关于”信息卡标题。
- `src/components/settings/ui/SSelect.vue`
  - 并入统一 dropdown primitive。
- `src/components/settings/ui/SFilterChip.vue`
  - 并入统一 dropdown primitive，或由其重命名迁移。
- `src/components/settings/ui/SToggle.vue`
  - 精修为更细腻的设置页风格。
- `src/styles/themes/obsidian.css`
  - 扩展 settings 专属主题变量。
- `src/styles/tokens.css`
  - 扩展 `--ui-settings-*` 语义映射。
- `src/styles/settings.css`
  - 统一窗口头部、General、Commands、共享控件与层级规则。

---

## 非目标

- 不改 settings 数据结构或持久化逻辑。
- 不新增设置项。
- 不重做整个 settings 的路由结构。
- 不把系统原生标题栏完全替换为自绘窗体。
- 不改 launcher 主窗口。

---

## 风险与注意点

- Dropdown 统一后，必须确保现有键盘导航、外部点击关闭、滚动定位和 Teleport 行为不回归。
- Commands 页筛选收纳后，要确保核心筛选仍然高频可达，不能因“更干净”而损伤效率。
- About 页去掉重复标题后，品牌区和信息卡的节奏要重新平衡，避免显得内容断裂。
- 原生暗色标题栏只能解决系统层不出戏，真正的精致感必须来自 WebView 内部 token 和控件实现。
- 原生标题栏暗色能力在不同平台的表现可能不同；planning 阶段需要明确 Windows 为显式 dark theme，其他平台采用“跟随系统/应用主题且不破坏头部融合”的降级口径。

---

## 验收标准

1. Windows 上 settings 原生标题栏切为暗色，不再出现明显的白色割裂。
2. Tab 下方残留浅色层消失，窗口头部视觉收敛为一个连续的深色块。
3. General / Appearance / About 路由不再重复显示与 Tab 同名的大标题。
4. General 页形成清晰的 `启动 / 终端 / 界面` 三段结构，信息层级稳定。
5. Dropdown 统一为单一 primitive，并支持 `default` / `ghost` 两种变体。
6. Dropdown popover 具备深色毛玻璃质感、正确层级、点击外部关闭与键盘导航。
7. Commands 页首排筛选精简，其余筛选收纳到次级入口，整体更有呼吸感。
8. Commands 列表改为更轻的数据管理风格，移除粗 pill 与重卡片行。
9. 所有新增颜色与层级语义都进入 `--theme-settings-* -> --ui-settings-*` 体系。
10. 方案足够清晰，可直接进入 `writing-plans` 产出实现计划。
