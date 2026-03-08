# 03. Chosen Solution - B4

## 决策结论

本次界面大重构已正式锁定为：

**B4 = Overlay Review Mode with Floor Height Protection**

后续所有 Demo、设计讨论、工程规划都以 B4 为唯一主方案。

## B4 的一句话定义

- **搜索态**：保持当前动态高度。
- **Review 态**：在保留搜索上下文的前提下，进入一个只在内部 shell 中出现的右侧 Overlay Review 面板；如果当前高度不足，则先补足到 Review 下限，再拉出 Review。

## 为什么选择 B4

### 1. 比纯 A 更适合 ZapCmd
- 纯 A 会把用户带入一个相对隔离的 Review 工作态。
- 对 ZapCmd 来说，用户进入暂存区时，仍然需要保留“我刚刚搜到了什么”的上下文。
- B4 保留背景搜索语境，因此更连续。

### 2. 比当前常驻右栏更成熟
- 当前右栏的问题是两个同等级工作区长期并列。
- B4 让搜索态和 Review 态分时出现，避免双焦点竞争。

### 3. 比底部常驻暂存区更稳
- 底部常驻暂存区会和搜索结果一起争夺垂直空间。
- 结果多时挤压严重，结果少时视觉上也不稳定。
- B4 只在需要时打开 Review，不污染首页。

## B4 的结构定义

### 搜索态（Search State）
- 搜索框和结果抽屉保持当前动态高度逻辑。
- 结果数量少，窗口矮一些；结果数量多，窗口高一些。
- 当队列非空时，只显示一个轻量入口，例如：`3 queued`。

### Review 态（Review State）
- 背景仍能看到搜索框和搜索结果轮廓。
- 但背景不可操作，只保留上下文感知。
- 前景出现更宽的右侧 Review Overlay，用于：
  - 查看暂存命令
  - 调整顺序
  - 编辑参数
  - 删除项目
  - 执行全部

### 关键原则
- **看得到背景，不等于背景还能交互。**
- Review 打开时，当前唯一可交互层就是 Review Overlay。

## 高度规则

## 1. 搜索态高度
- 保持现有动态策略。
- 当前实现中，搜索抽屉高度与结果行数联动，不需要改变这个基本特征。

## 2. Review 下限保护

本次已明确采用：

- **搜索抽屉 floor height = “4 条结果高度 + 搜索框高度”**
- 搜索框高度口径：以 `.search-form` 整块容器的渲染高度为准（含 padding，非 `.search-input` 高度）。
- floor height **不写死具体 px**，按布局常量/DOM 计算得到（并且不计顶部拖拽区）。

因此：

- `drawerFloorHeight = searchFormHeight + drawerViewportHeightFor4Rows`（计算值）
- `drawerViewportHeightFor4Rows = 4 × resultRowHeight + drawerChromeHeight + drawerHintHeight`

### 这个 floor height 的用途
- 它是 **Review 态中左侧搜索抽屉的视觉下限**。
- 它不是“真的补 4 条假结果数据”。
- 它是对抽屉容器高度做 floor protection，让左侧视觉不会过矮。

## 3. Review 面板高度
- Review 面板自身内容区也采用同一个最低可视高度：floor height（同上计算）
- Review 卡片列表在面板内部滚动
- 因此不会因为卡片多就继续强制拉高窗口

### 为什么这次允许 Review 自己滚动
- 现在的 Review 面板宽度会做大，不再像当前窄右栏那样局促
- 既然横向空间充足，纵向就可以采用“固定最小视口 + 内部滚动”的方式
- 这能显著降低窗口抖动和尺寸不稳定感

## 4. 高度不包含拖拽区

这个点已经明确：

- 搜索框上方的拖拽区不是内容区
- Review 高度下限的比较与补齐，**不应把拖拽区计入内容高度**
- 拖拽区保持为 shell 顶部的独立区域，不能被 Review 吞掉

## 最终高度算法

进入 Review 时：

1. 读取当前搜索态内容高度
2. 计算 `drawerFloorHeight`（按“4 条结果高度 + 搜索框高度”得到）
3. 计算 `targetContentHeight = max(currentSearchContentHeight, drawerFloorHeight)`
4. 如果当前高度不足：
   - 先把左侧搜索抽屉补到 `drawerFloorHeight`
   - 再拉高窗口到对应目标值
5. 然后从右侧滑出 Review Overlay

## 重要实现约束

### 不允许的做法
- 不允许在结果数组中插入假结果
- 不允许在 DOM 中伪造额外 `.result-item`
- 不允许用“看起来像 4 条数据”的方式污染键盘导航和可访问性

### 正确做法
- 真实结果仍然只有真实数量
- 左侧抽屉高度通过 **filler / spacer / visual floor layer** 补齐
- 所谓“补充搜索抽屉数据条数”只作为视觉尺寸概念，不作为真实数据语义

## 遮罩与圆角规则

这个点也已经锁定：

- 遮罩不能是“整个原生窗口层”的遮罩
- 必须是 **内部 shell 层级** 的遮罩 / dim / blur / overlay

### 原因
- 当前产品使用圆角和半透明背景
- 如果直接做整窗遮罩，会暴露原生窗口真实边界和底层形状
- 视觉上会像把产品外壳掀开，体验很差

### 结论
- Review 的 dim、遮罩、过渡都应限制在内部圆角 shell 中
- 原生窗口本身仍只是承载容器，不参与遮罩表达

## 打开时序

推荐时序如下：

### Open Review
1. 用户点击 `queued` 入口或按快捷键
2. 锁定背景交互
3. 如果当前左侧内容高度 < `drawerFloorHeight`：
   - 左侧抽屉先扩展到 `drawerFloorHeight`
   - 触发窗口 resize
4. 当高度达到目标后：
   - 内部 shell 出现 dim / overlay 背景层
   - 右侧 Review Overlay 滑入
5. 焦点落到 Review 首个可操作项

### Close Review
1. 用户按 `Esc` 或点击关闭
2. Review Overlay 右滑退出
3. 移除内部 shell 遮罩
4. 焦点返回搜索态的既有位置
5. 是否恢复窗口更小高度，可在实现阶段评估：
   - 若恢复时抖动明显，可延后到下一次查询变化再回收

## 动画策略

### 推荐策略
- 优先允许尝试“实时动态调整窗口高度”
- 但这只用于验证用户感受，不保证作为最终实现方式

### 如果出现问题
若出现以下问题：
- Windows 下 resize 抖动
- Tauri 窗口边缘闪烁
- 多次重复计算导致连跳

则退回更稳的方案：
- 一次性切到目标高度
- 再让内部内容层做动画

### 结论
- **先试动态**，不行再退回一步到位 resize
- 这点属于工程落地策略，不影响 B4 结构本身

## 宽度规则

### 搜索态
- 保持当前主搜索区宽度基线
- 不因队列存在而常驻扩宽

### Review 态
- Review Overlay 宽度应显著大于当前 staging 侧栏
- 目标是让暂存卡片在可读性上不再受窄栏压迫

### 原则
- 用更大的 Review 宽度解决长命令问题
- 用固定最低高度 + 内部滚动解决纵向稳定性问题

## 键盘规则（B4 版）

### 搜索态
- `↑ / ↓`：结果导航
- `Enter`：执行当前命令
- `→` / 自定义快捷键：加入队列
- `Ctrl+Tab`：打开 Review

### Review 态
- `↑ / ↓`：队列项导航
- `Enter`：按当前焦点语义执行主动作
- `Delete / Backspace`：删除队列项
- `Esc`：关闭 Review，回到搜索态

### 关键语义
- `Ctrl+Tab` 不再只是“切到 staging 焦点”
- 它要升级为“进入 Review 这个 overlay 工作层”

## 技术可行性判断

### 产品可行性
- 高

### 前端实现可行性
- 高

### 风险等级
- 中等

### 为什么不是高风险
- 执行链路和 Rust 后端不用重写
- 主要变化发生在：
  - 主窗口壳层结构
  - 窗口尺寸计算
  - 键盘焦点契约
  - staging/review 的视觉语义迁移

## 工程实现提示

后续实现时建议优先新增或重构这几类概念：

- `reviewMode`
- `reviewOverlayOpen`
- `drawerFloorHeight`
- `searchDrawerFiller`
- `reviewPanelWidth`

并优先保持：
- 旧的执行逻辑可复用
- 旧的 staging 数据结构尽量先不动
- 先换 UI shell，再考虑 staging -> review 的全面命名迁移
