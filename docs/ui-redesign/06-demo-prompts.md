# 06. Demo Prompts

> 下列 Prompt 目标不是生成最终产品代码，而是生成 **可讨论的高保真/中高保真界面 Demo**。
> 当前已锁定唯一结构方向：**B4 = Overlay Review Mode with Floor Height Protection**。

## 使用说明

- 输出目标优先：**桌面应用界面 Demo**
- 不是移动端
- 不是营销 landing page
- 不是后台管理系统
- 不要抄 Raycast / Alfred / Linear，但可以参考它们的气质与交互原则
- 不要使用 emoji 作为图标
- 不要再生成 A / C 等其他结构方向，避免讨论发散

---

## Prompt（唯一主方案）— B4 Overlay Review Mode

```text
你是一名资深产品设计师 + 前端设计工程师。

请为一个桌面命令启动器产品设计高保真 UI Demo，产品名为 ZapCmd。

产品背景：
- 桌面应用，不是网页产品
- 面向开发者 / 独立开发者 / 技术用户
- 核心能力：全局热键唤起、搜索命令、查看命令说明、参数填写、将多个命令加入队列、批量执行、独立 Settings 窗口
- 当前问题：主界面有一个常驻右侧暂存区，导致双焦点竞争；长命令在窄侧栏中显示不佳；界面过于依赖绿色；背景透明度过高；Settings 过像后台配置页

已经锁定的结构方案：B4 = Overlay Review Mode with Floor Height Protection

请严格遵循以下结构，不要改成其他方案：

1. 搜索态（Search State）
- 搜索框和搜索结果是唯一主舞台
- 窗口高度仍然是动态的，结果多就高，结果少就低
- 队列非空时，只显示一个轻量入口，例如“3 queued”

2. Review 态（Review State）
- 用户点击 queued 入口后，进入 Review 态
- Review 不是底部面板，不是常驻右栏，也不是完全切走的独立页面
- 它是一个在主界面内部 shell 中出现的右侧 overlay review panel
- 背景仍保留搜索框和结果上下文，但背景不可交互
- 当前唯一可交互层是 Review panel

3. 高度下限保护（非常重要）
- 当搜索结果只有 1 条、2 条时，当前搜索态窗口会比较矮
- 进入 Review 态前，如果左侧搜索抽屉内容高度小于 4 条结果高度，就要先补足到 4 条结果高度
- floor height 不写死具体 px：按“4 条结果高度 + 搜索框高度”计算得到
- 注意：这只是视觉上的高度保护，不代表真的补 4 条假数据
- 结果数据仍然是真实数量，只是抽屉容器被拉高，剩余空间用 filler/spacer 处理

4. Review panel 高度与滚动
- Review panel 的最小内容高度与 floor height 对齐
- Review 内部卡片允许滚动
- Review panel 宽度要明显大于当前窄右栏，避免长命令挤压

5. 拖拽区与遮罩规则（非常重要）
- 搜索框上方存在桌面窗口拖拽区，这块不属于内容区
- 高度保护和 Review 计算不要把拖拽区算进去
- 遮罩不是整个原生窗口的遮罩，而是内部圆角 shell 的遮罩
- 因为产品有圆角和背景透明，不能暴露原生窗口完整边界

视觉方向：
- 气质参考：Raycast 的克制、Linear 的专业、Alfred 的效率感
- 但不要直接模仿任何一个产品
- 风格关键词：dark, professional, calm, developer tool, premium, minimal, structured
- 不要赛博朋克，不要霓虹，不要大面积绿色，不要夸张发光，不要过度透明

配色要求：
- 使用以下主配色：
  - app background: #0B0E14
  - surface: #131824
  - elevated surface: #1A2130
  - border: #252C3B
  - primary text: #F3F6FF
  - secondary text: #A6AEC7
  - brand accent: #7C8CFF
  - accent soft fill: rgba(124, 140, 255, 0.16)
  - success: #31C48D
  - warning: #F2B94B
  - danger: #FF6B7A
- 品牌色与状态色必须分离
- 绿色不能作为主品牌色，只用于成功/已启用/执行成功

字体建议：
- UI font: IBM Plex Sans 或 Inter
- command/code font: JetBrains Mono

需要输出的界面：
1. 主窗口 - 空闲搜索态
2. 主窗口 - 只有 1 条搜索结果的搜索态
3. 主窗口 - 多条搜索结果的搜索态
4. 主窗口 - 从矮窗口进入 Review 态后的 B4 展开态
5. 主窗口 - Review 态（右侧 overlay 已展开）
6. Settings 窗口 - Hotkeys 页面
7. Settings 窗口 - Commands 页面

主窗口布局要求：
- 顶部大搜索输入框，明显成为视觉中心
- 结果列表单列展示
- 每条结果显示：标题、命令预览摘要、来源/分类/参数 badge
- 不要在主列表里显示完整长命令
- 选中态使用品牌色软底和轻量高亮线
- 左侧搜索抽屉在 Review 打开时可见，但必须变成不可交互背景
- Review panel 右侧滑出，内部可滚动

Review panel 要求：
- 标题区：队列总数、简短说明、关闭动作
- 列表区：每条卡片展示标题、命令摘要、参数、排序手柄、删除按钮
- 操作区：执行全部、清空、关闭
- 宽度足够大，使长命令和参数不再拥挤

Settings 要求：
- 左侧导航 + 右侧卡片化内容
- 顶部必须有页头区：标题 + 简短说明
- 导航使用统一 SVG 图标风格
- 底部操作区 sticky，包含“取消 / 应用 / 确定”
- 风格要像专业桌面应用设置中心，而不是后台管理页

输出要求：
- 做成可以直接展示的界面 Demo
- 如果输出代码，请优先用 HTML + CSS + 少量 JS，或 React 单页 Demo
- 不需要真实数据请求
- 重点是排版、层级、颜色、组件状态
- 附带简短设计说明：
  1. 为什么 B4 比常驻右栏更适合 ZapCmd
  2. 为什么 floor height protection 能解决 1 条结果时的 Review 打开问题
  3. 为什么遮罩必须只作用于内部 shell 而不是整个窗口
```

---

## 配色专项 Prompt

```text
请为一个桌面开发者工具 ZapCmd 提供 3 套商业化深色配色方案。

要求：
- 不要使用绿色作为主品牌色
- 绿色只能作为 success 语义色
- 风格要参考现代专业软件，而不是游戏 UI
- 每套配色都需要包含：
  - app background
  - primary surface
  - elevated surface
  - border
  - primary text
  - secondary text
  - brand accent
  - success
  - warning
  - danger
  - selection soft fill
- 每套配色都要说明适合什么气质：
  - 更像 Raycast 的克制专业
  - 更像 Linear 的冷静精密
  - 更像高级工具箱的沉稳感

额外要求：
- 给出 hex 值
- 给出使用建议
- 指出哪些颜色绝对不能混用
```
