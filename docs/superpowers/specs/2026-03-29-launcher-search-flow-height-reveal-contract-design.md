# Launcher 搜索结果高度 Contract 与 Flow Reveal 时序重构设计

> 日期：2026-03-29
> 状态：approved
> 范围：Launcher `SearchPanel` 搜索抽屉 10 条高度 contract、`FlowPanel` 最低可见高度测量、`FlowPanel` 打开 reveal 时序、Rust 扩窗完成门闩
>
> 关联设计：
> - `docs/superpowers/specs/2026-03-20-launcher-command-flow-height-contract-correction-design.md`
> - `docs/superpowers/specs/2026-03-20-launcher-search-effective-height-inheritance-design.md`
> - `docs/superpowers/specs/2026-03-13-window-resize-rust-animation-design.md`

---

## 1. 背景与问题

当前 Launcher 的高度 contract 已经收口了一轮，但在搜索页与 FlowPanel 交界处仍存在 3 个直接影响体验的问题：

1. 搜索页结果未超过 10 条时，仍可能提前出现滚动条。
2. 无搜索结果时打开 FlowPanel，窗口会先扩到接近 3 条命令的高度，再回缩到 2 条命令门槛，首帧错误明显。
3. FlowPanel 当前会在窗口扩高完成前先出现在视口中，导致裁切、动画不连贯和被切割的观感。

用户确认后的真实产品语义是：

1. 搜索结果项高度可以固定；这是一条设计 token，不应被随意改成逐项实测。
2. SearchPanel 的“10 条前不滚动”必须是硬规则，而不是“大致接近 10 条”。
3. FlowPanel 的命令卡片高度天然异构，因此最低可见高度必须按真实内容测量。
4. FlowPanel 打开时必须先完成扩窗，再让面板进入可见 opening 阶段。
5. FlowPanel 的最低门槛是“前两条真实命令可见”；如果上级面板本来更高，则继承更高高度；超出的内容统一内部滚动。

---

## 2. 目标与非目标

### 2.1 目标

1. 保留搜索结果项固定行高 token，并明确其为 Search 高度体系的唯一结果行高来源。
2. 明确 Search 抽屉的 chrome 高度 contract，保证 10 条结果前不出现滚动条。
3. 让 FlowPanel 最低可见高度只由空态、前 1 条或前 2 条真实命令卡片高度决定。
4. 取消 Flow 打开时基于静态估高的首帧错误扩高。
5. 将 Flow 打开过程改成“预挂载测量 -> Rust 扩窗 -> reveal opening”。
6. 保持普通响应式窗口 resize 的轻量动画路径，同时新增可等待的 reveal 扩窗门闩。

### 2.2 非目标

1. 不修改搜索结果的视觉样式层级、选中逻辑与键盘导航语义。
2. 不修改 FlowPanel 的拖拽排序、参数编辑、执行反馈等业务行为。
3. 不把 SearchPanel 改成逐条实测高度模型。
4. 不在本次设计中重做 CommandPanel 的业务布局，只要求它继续提供可靠的上级继承高度。

---

## 3. 架构结论

本次设计采用以下长期原则：

### 3.1 稳定内容用 token

适合被设计系统定义的尺寸，必须由单一 token 驱动，而不是靠 DOM 临场测量。

适用对象：

1. 搜索结果行高
2. 搜索结果最大可视条数
3. Search capsule 高度
4. Search 抽屉固定 chrome 高度
5. Launcher 外层 window chrome 高度

### 3.2 异构内容用实测

天然由内容决定、且行高不可稳定预估的区域，才允许进入测量链。

适用对象：

1. Flow 空态内容高度
2. Flow 第 1 张真实命令卡片高度
3. Flow 前 2 张真实命令卡片合计高度

### 3.3 测量与 reveal 解耦

测量层只负责回答“最小门槛是多少”，不负责决定“什么时候用户能看到面板”。

reveal 时序必须由独立状态机控制，不能依赖 Vue 挂载时序和固定 timeout 猜测 Rust 扩窗是否结束。

---

## 4. SearchPanel 高度 Contract

### 4.1 保留固定结果项行高 token

保留现有搜索结果项固定行高设计：

```text
SEARCH_RESULT_ROW_HEIGHT = 44px
SEARCH_RESULT_MAX_VISIBLE_ROWS = 10
```

这两个值继续作为 SearchPanel 高度系统的稳定事实源。

其含义是：

1. 搜索结果列表属于规则化高频扫描区，固定密度优于逐项实测。
2. 后续若要全局调整搜索结果密度，只修改 token，而不是修改业务公式。

### 4.2 Search 抽屉 chrome 高度也必须 contract 化

当前问题不在于结果项高度固定，而在于结果项以外的 chrome 预算没有被严格收口。

Search 抽屉高度应拆成两部分：

```text
resultsViewportRowsHeight =
  min(resultCount, SEARCH_RESULT_MAX_VISIBLE_ROWS) * SEARCH_RESULT_ROW_HEIGHT

searchDrawerChromeHeight =
  hintBarFixedHeight + drawerVerticalPadding + drawerBorder
```

最终抽屉高度：

```text
drawerViewportHeight =
  resultsViewportRowsHeight + searchDrawerChromeHeight
```

共享的左侧面板上限：

```text
sharedPanelMaxHeight =
  searchCapsuleHeight +
  SEARCH_RESULT_MAX_VISIBLE_ROWS * SEARCH_RESULT_ROW_HEIGHT +
  searchDrawerChromeHeight
```

### 4.3 Keyboard hint 区固定单行高度

为了让“10 条前不滚动”长期稳定，Search 抽屉内部的 keyboard hint 区不得再参与不受控换行增高。

采用策略：

1. hint 区固定为单行高度
2. 超出可视宽度时，允许更紧凑排版、裁切、渐隐或横向溢出处理
3. hint 区高度必须纳入 `searchDrawerChromeHeight`

结论：

> SearchPanel 继续坚持“固定结果项高度 + 固定抽屉 chrome 高度”的商业化桌面产品做法，不改成高抖动的 DOM 实测模型。

---

## 5. FlowPanel 最低可见高度 Contract

### 5.1 Flow 最低高度只认真实内容

FlowPanel 的最低门槛由真实内容定义，不再允许静态估高主导首帧。

定义：

```text
flowMeasuredMinHeight =
  header + measuredBody + footer
```

其中 `measuredBody` 的口径如下：

1. `0 条命令`

```text
measuredBody = empty-state
```

2. `1 条命令`

```text
measuredBody = firstRealCommandCard
```

3. `2 条及以上命令`

```text
measuredBody = firstTwoRealCommandCards + interCardGap
```

### 5.2 Flow 最终高度遵循“继承优先，门槛补高”

Flow 最终高度公式统一为：

```text
resolvedFlowHeight =
  min(
    sharedPanelMaxHeight,
    max(inheritedPanelHeight, flowMeasuredMinHeight)
  )
```

语义解释：

1. 若上级面板高度本来已经高于“前两条真实命令”的门槛，Flow 直接继承上级高度。
2. 若上级面板高度不足，则只补到“前两条真实命令”的最低门槛。
3. 超过该高度的命令列表统一内部滚动。
4. 一旦 Flow 完成 reveal 并锁高，后续卡片增删、内联编辑、toast 等都不得让外框高度来回抖动。

### 5.3 废弃旧的静态 fallback 首帧预抬高语义

本次设计明确废弃以下旧策略：

1. 从纯搜索胶囊打开 Flow 时，先用静态卡片估高把窗口抬到一个“接近两条卡片”的猜测高度
2. 等 settled 后再用真实测量结果回缩

原因：

1. 这会制造用户明确可见的错误中间态
2. 它把“为了避免裁切”的目标错误地建立在“先猜一个可能更高的高度”上
3. 这类回缩不是动画细节，而是 contract 错误

---

## 6. Flow Reveal 状态机

### 6.1 状态定义

Flow 打开流程改为以下状态机：

```text
closed
-> preparing
-> resizing
-> opening
-> open
-> closing
-> closed
```

### 6.2 各状态语义

#### `closed`

1. FlowPanel 不参与显示
2. 不保留 reveal 中间态

#### `preparing`

1. 允许 FlowPanel 挂载到 DOM
2. 允许读取真实卡片与空态高度
3. 面板必须完全不可见

要求：

1. `visibility: hidden`
2. `pointer-events: none`
3. scrim 不可见
4. 不播放 opening 动画

#### `resizing`

1. Search/Command 当前有效高度被冻结为 `inheritedPanelHeight`
2. FlowPanel 完成最小门槛测量
3. 计算 `resolvedFlowHeight`
4. 调用 Rust reveal 扩窗命令并等待其完成

用户在此阶段依然看不到 FlowPanel。

#### `opening`

1. 仅当 Rust 扩窗完成后，FlowPanel 才允许进入可见态
2. 此时才播放现有 opening 动画

#### `open`

1. FlowPanel 已完全可见
2. 外框高度锁定
3. 后续只允许内部滚动，不再改变外框

#### `closing`

1. 播放关闭动画
2. 关闭完成后清理 Flow session
3. 恢复到底层 Search 或 Command 的正确高度语义

### 6.3 硬约束

本次设计增加一条强硬约束：

> FlowPanel 在 `preparing` 和 `resizing` 阶段即使已挂载，也不得向用户泄漏任何可见首帧。

这包括：

1. 面板主体
2. scrim
3. opening 位移动画起始帧
4. 被窗口裁切的边缘

---

## 7. Rust 扩窗完成门闩

### 7.1 保留现有普通动画 resize 路径

现有 `animate_main_window_size` 仍然保留，用于：

1. 搜索输入导致的普通响应式高度变化
2. 非 reveal 场景下的平滑 resize

原因：

1. 它当前是轻量异步路径，适合高频变化
2. 不应让所有普通 resize 都转成阻塞式等待

### 7.2 新增 reveal 专用阻塞式扩窗命令

新增一个 Rust 专用命令，语义为：

```text
resize_main_window_for_reveal(width, height) -> Promise resolves only after resize settled
```

要求：

1. 前端 `await` 返回时，窗口已达到目标尺寸
2. 该命令专用于 Flow reveal gate
3. 它可以复用 Rust 动画引擎，但不能像当前 `animate_main_window_size` 一样 spawn 后立刻返回

### 7.3 推荐实现方式

推荐做法：

1. 保留当前 generation/cancel 机制
2. 将 reveal 命令直接 `await` 内部动画过程
3. 只有动画循环到达最终目标尺寸后才返回

不推荐做法：

1. 前端固定 sleep 某个毫秒数后猜测动画结束
2. 继续复用当前非阻塞命令再叠加任意 timeout
3. 让 reveal 逻辑绑定在浏览器侧 `setTimeout`

结论：

> 普通 resize 继续异步合并，关键 reveal 使用阻塞式门闩。这是本次时序重构的核心边界。

---

## 8. 模块职责调整

### 8.1 `useLauncherLayoutMetrics`

职责调整：

1. 保留 Search 结果行高 token
2. 计算 Search 抽屉固定 chrome 高度
3. 输出严格统一的 `drawerViewportHeight`
4. 输出与 Search 抽屉同口径的 `sharedPanelMaxHeight`

### 8.2 `LauncherSearchPanel`

职责调整：

1. hint 区固定单行高度
2. 不再通过换行、padding 漂移破坏抽屉 contract
3. 保持结果项固定高度消费 token

### 8.3 `panelMeasurement`

职责调整：

1. Search 不再测结果项高度
2. Flow 只测空态 / 前 1 条 / 前 2 条真实卡片
3. 不参与 reveal 决策

### 8.4 `sessionCoordinator`

职责调整：

1. 保留上级面板有效高度继承
2. 取消基于静态 fallback 的首帧预抬高
3. 按真实测量结果生成 Flow 最低门槛

### 8.5 `useStagingQueue` / `LauncherWindow`

职责调整：

1. Flow 挂载状态与可见状态分离
2. 新增 `preparing` / `resizing` reveal 状态
3. `v-if` 不再简单绑定 `stagingExpanded`

### 8.6 Rust `animation` / `windowing`

职责调整：

1. 保留普通异步动画 resize 能力
2. 新增 reveal 专用等待完成命令
3. 确保前端可以把该命令当作“扩窗已完成”的可靠信号

---

## 9. 测试策略

### 9.1 Search contract 回归

1. `1..10` 条结果时，不出现滚动条
2. `11` 条及以上时，只允许内部滚动
3. keyboard hint 区不会因为换行破坏 10 条 contract
4. `sharedPanelMaxHeight` 与 `drawerViewportHeight` 使用同一口径

### 9.2 Flow 高度回归

1. `0 条` 时按空态真实高度
2. `1 条` 时按真实 1 条高度
3. `2 条` 时按真实 2 条高度
4. `3 条及以上` 时仍只要求两条门槛，剩余内部滚动
5. 上级面板更高时继承上级高度，不回落到两条门槛

### 9.3 Reveal 时序回归

1. Flow 打开时 `preparing/resizing` 阶段对用户完全不可见
2. Rust reveal 扩窗未完成前，不得进入 `opening`
3. 不再出现“面板先出、窗口后扩”的首帧裁切
4. 不再出现“先接近 3 条，再缩回 2 条”的错误中间态

### 9.4 关闭恢复回归

1. Flow 关闭后仍恢复到底层 Search 高度语义
2. 若底层是 Command，则恢复到底层 Command 已锁高度
3. 关闭动画不会污染下一轮 Flow reveal

---

## 10. 风险与收口原则

### 10.1 风险

1. 若 reveal 命令与普通动画命令共享取消代纪处理不当，可能导致等待中的 Promise 被提前打断
2. 若挂载状态与可见状态拆分不彻底，仍可能泄漏不可见阶段的首帧内容
3. 若 Search hint 区仍允许换行，高度 contract 仍会继续漂移

### 10.2 收口原则

1. Search 保持 token 化，不进入高频实测
2. Flow 保持真实测量，不再静态猜高
3. reveal 必须以 Rust 完成门闩为准，而不是前端 timeout
4. 任何新高度逻辑都必须明确属于 token、contract、measurement 或 reveal 其中一层，禁止跨层污染

---

## 11. 最终决策摘要

1. Search 继续采用固定结果项高度 token，这是正确且商业化常见的桌面产品做法。
2. Search 的问题不在“固定 44px”，而在抽屉 chrome 没被严格 contract 化。
3. Flow 改为真实测量空态 / 前 1 条 / 前 2 条命令卡片，取消静态 fallback 首帧猜高。
4. Flow 打开时采用 `preparing -> resizing -> opening -> open` 的 reveal 状态机。
5. Rust 保留普通异步动画 resize，同时新增 reveal 专用阻塞式扩窗门闩。
6. 本次设计追求的是“稳定内容 token 化，异构内容实测化，reveal 时序状态机化”。
