# Launcher 参数面板 / 执行流面板高度 Contract 更正设计

> 日期：2026-03-20
> 状态：approved
> 范围：Launcher `SearchPanel` / `CommandPanel` / `FlowPanel` 的统一最高高度、各自最低高度、首次锁高、结构收口与残留空白修复
>
> 关联设计：
> - `docs/superpowers/specs/2026-03-19-launcher-command-panel-height-lock-design.md`
> - `docs/superpowers/specs/2026-03-19-launcher-command-return-height-restore-design.md`

---

## 1. 背景与问题

当前 Launcher 已经具备统一的 panel 最大高度 cap，但仍存在一组互相关联的问题：

1. 参数面板进入时仍会出现不符合产品语义的收缩。
2. 参数面板的总高度口径不完整，视觉上仍像是只算了 `header + content`，`footer` 没被完整纳入。
3. 参数面板按钮区上方仍残留空白区域。
4. 执行流面板虽然可以从搜索面板或参数面板单独打开，但当前高度并未严格跟随“最近一个面板的实际总高度”。
5. 执行流面板底部内容区仍存在空白/遮挡。
6. 当前高度逻辑同时散落在 CSS、layout metrics、window sizing、面板 DOM 和列表独立估算中，导致可维护性和鲁棒性不足。

用户重新确认后的真实产品语义是：

> 全局只统一最高高度，不统一最低高度。
> 搜索面板最低高度就是搜索框本身；
> 参数面板与执行流面板各自处理自己的最低可用高度；
> 两者的补高都不能超过统一最高高度；
> 参数面板与执行流面板一旦完成首次锁高，就只允许中间内容区滚动，不再让外框继续缩放。

其中执行流面板还有一个额外约束：

> 执行流卡片高度并不固定，因此它的最低高度不能继续依赖静态等高估算，而必须基于真实内容实时测量。

---

## 2. 目标与非目标

### 2.1 目标

1. 保留并明确单一的全局 `panelMaxHeight`，来源继续是“搜索框 + 最大搜索结果展示高度”。
2. 搜索面板不引入额外最低高度，最低就是搜索框自身高度。
3. 参数面板打开时先继承当前面板实际总高度；若不够容纳完整盒子，则只在首次 settled 时补高一次，且不得超过统一 cap。
4. 执行流面板打开时先继承当前面板实际总高度；若低于自己的最低可用高度，则只在首次 settled 时补高一次，且不得超过统一 cap。
5. 参数面板完整盒子必须包含 `header + content + footer + divider`。
6. 执行流面板最低高度必须支持异高卡片，按空态或前 2 张真实卡片实时测量。
7. 清理参数面板与执行流面板底部残留空白，让中间内容区成为唯一滚动区。
8. 将高度规则收口为明确、可测试、长期可维护的 contract。

### 2.2 非目标

1. 不修改搜索结果区的视觉样式与交互语义。
2. 不改执行流拖拽、内联编辑、toast 等业务行为，只修正其布局和高度 contract。
3. 不重做现有 `CommandPanel -> Search` 的统一退出恢复链路，仅复用其既有恢复机制。
4. 不把全局 cap 进一步改造成“全局统一最低高度”。

---

## 3. 用户确认的产品决策

| 决策项 | 结论 |
|---|---|
| 全局统一规则 | 只统一最高高度 |
| 全局最高高度来源 | 搜索框 + 最大搜索结果展示高度 |
| 搜索面板最低高度 | 搜索框自身高度 |
| 参数面板默认高度 | 打开前当前面板实际总高度 |
| 参数面板补高时机 | 仅首次 settled 时，完整盒子放不下时 |
| 参数面板补高上限 | 不得超过统一最高高度 |
| 参数面板锁高策略 | 首次锁定后固定，后续只允许内容区滚动 |
| 执行流默认高度 | 打开前当前面板实际总高度 |
| 执行流最低高度 | 独立规则，按真实内容实时测量 |
| 执行流最小内容密度 | `header + 前 2 张真实卡片 + footer`，空态时改为 `header + empty-state + footer` |
| 执行流补高上限 | 不得超过统一最高高度 |
| 执行流锁高策略 | 首次锁定后固定，后续只允许列表区滚动 |

---

## 4. 高度 Contract

### 4.1 动态量定义

1. `panelMaxHeight`
   - 全局唯一最高高度
   - 来源保持不变：搜索框高度 + 最大搜索结果区高度 + 既有 chrome / gap

2. `inheritedPanelHeight`
   - 打开目标面板前，当前正在显示的面板实际总高度
   - 若从搜索面板进入，则取搜索面板当前实际总高度
   - 若从参数面板打开执行流，则取参数面板当前锁定后的实际总高度

3. `panelMinHeight`
   - 目标面板自己的最低可用高度
   - 搜索面板、参数面板、执行流面板各自独立定义

4. `resolvedPanelHeight`
   - 目标面板最终外框高度

### 4.2 统一公式

除搜索面板外，参数面板与执行流面板统一采用：

```text
resolvedPanelHeight =
  min(
    panelMaxHeight,
    max(inheritedPanelHeight, panelMinHeight)
  )
```

语义解释：

1. 先优先继承“最近一个面板的实际总高度”。
2. 若继承高度已足够，则保持不变。
3. 若继承高度不足，则仅补到目标面板自己的最低可用高度。
4. 无论如何都不能超过全局 `panelMaxHeight`。

### 4.3 搜索面板特殊规则

搜索面板不参与“首次锁高”：

1. 最低高度就是搜索框自身高度。
2. 搜索结果为 0 条时不额外撑高。
3. 搜索结果增加时自然增高，但仍受 `panelMaxHeight` 限制。

---

## 5. 各面板最低高度定义

### 5.1 SearchPanel

`SearchPanel` 没有额外最低高度。

```text
searchMinHeight = searchCapsuleHeight
```

即：

- 只有搜索框时，面板最低就是搜索框；
- 不因为“统一高度”额外补高。

### 5.2 CommandPanel

`CommandPanel` 的最低高度不再只是一个静态常量，而是以“完整盒子自然高度”为主，静态常量仅作为兜底：

```text
commandPanelMinHeight =
  max(
    commandPanelFallbackMinHeight,
    commandPanelFullNaturalHeight
  )
```

其中：

- `commandPanelFullNaturalHeight`
  - 必须包含 `header + content + footer + divider`
- `commandPanelFallbackMinHeight`
  - 仅作为测量未就绪时的兜底，不再作为主规则

### 5.3 FlowPanel

`FlowPanel` 的最低高度必须按真实内容测量，不再继续依赖“等高卡片 × 行数”作为主依据：

```text
flowPanelMinHeight =
  max(
    flowPanelFallbackMinHeight,
    flowPanelMeasuredMinHeight
  )
```

其中：

- 空态时：

```text
flowPanelMeasuredMinHeight = header + empty-state + footer
```

- 非空态时：

```text
flowPanelMeasuredMinHeight = header + firstTwoVisibleCards + gap + footer
```

注意：

1. 这里的 `firstTwoVisibleCards` 必须取真实 DOM 高度，而不是固定估算值。
2. 若第 1、2 张卡片高度不同，直接按真实高度求和。
3. 若当前只有 1 张卡片，则按 1 张真实卡片计算。
4. 若测量结果超过 `panelMaxHeight`，仍以 `panelMaxHeight` 为最终上限，剩余内容通过内部滚动处理。

---

## 6. 生命周期与锁高时机

### 6.1 进入参数面板

1. 进入前先捕获 `inheritedPanelHeight`。
2. 参数面板切入的第一帧先直接沿用该高度，不允许先缩一下。
3. 待参数页挂载并 settled 后，测量 `commandPanelMinHeight`。
4. 仅在这一刻按统一公式计算一次 `resolvedPanelHeight`。
5. 完成后记录 `commandPanelLockedHeight`。
6. 在参数面板生命周期内，不再因内容变化继续增高或回缩。

### 6.2 进入执行流面板

1. 打开前先捕获 `inheritedPanelHeight`。
2. 执行流面板切入的第一帧先直接沿用该高度。
3. 待执行流挂载并 settled 后，测量 `flowPanelMinHeight`。
4. 仅在这一刻按统一公式计算一次 `resolvedPanelHeight`。
5. 完成后记录 `flowPanelLockedHeight`。
6. 在执行流面板生命周期内，不再因卡片增删、编辑、toast、滚动条出现而继续改变外框高度。

### 6.3 关闭执行流 / 返回搜索

1. 关闭执行流时：
   - 若底层是参数面板，则恢复参数面板已锁定高度语义；
   - 若底层是搜索面板，则回到搜索面板当前自然高度语义。
2. 从参数面板返回搜索页时，继续沿用既有 `requestCommandPanelExit() -> search-page-settled -> 单次回落` 链路。
3. 本次设计不新增第二套退出恢复路径。

---

## 7. 结构与模块职责

### 7.1 规则层：`panelHeightContract`

职责：

1. 接收 `panelMaxHeight / inheritedPanelHeight / panelMinHeight`。
2. 产出 `resolvedPanelHeight`。
3. 保持纯规则、无 DOM、可单测。

### 7.2 测量层：`panelMeasurement`

职责：

1. 测量 `CommandPanel` 完整盒子自然高度。
2. 测量 `FlowPanel` 空态最小高度或前 2 张真实卡片最小高度。
3. 对测量未就绪场景提供兜底值。

### 测量失败或时序未就绪时的处理

1. 目标面板 DOM 未挂载时，不允许回退读取旧面板高度。
2. 应等待下一次 settled / nextTick 后重试。
3. 若仍无法得到实测值，临时使用 fallback min height，但后续一旦获取到实测值，也不能再改写已锁定的外框高度。

### 7.3 会话层：`panelHeightSession`

职责：

1. 存储 `inheritedPanelHeight`。
2. 存储 `commandPanelLockedHeight`。
3. 存储 `flowPanelLockedHeight`。
4. 防止切页后误用上一轮面板的高度状态。

### 状态隔离要求

1. `CommandPanel` 与 `FlowPanel` 的锁高状态必须分离。
2. 不再继续用一个模糊变量混合表达：
   - “进入前继承基线”
   - “当前面板锁定高度”
   - “退出恢复锁高”

---

## 8. 组件结构要求

### 8.1 CommandPanel

`CommandPanel` 必须保持统一三段式：

```text
CommandPanel
├── header
├── body(content)
└── footer
```

布局要求：

1. 面板整体使用 `grid-template-rows: auto minmax(0, 1fr) auto`。
2. `footer` 必须属于同一总高度盒子内部。
3. 只有 `body` 允许滚动。

### 8.2 FlowPanel

`FlowPanel` 也必须保持统一三段式：

```text
FlowPanel
├── header
├── body(list / empty-state)
└── footer
```

布局要求：

1. 面板整体使用 `grid-template-rows: auto minmax(0, 1fr) auto`。
2. 空态与列表态都挂在中间 `body` 区域内。
3. 只有 `body` / `list` 允许滚动。
4. 不允许再让列表高度估算反向主导面板总高度。

### 8.3 SearchPanel

`SearchPanel` 保持现有自然高度策略，仅继续消费统一的 `panelMaxHeight` 变量。

---

## 9. 风险点与处理策略

| 风险点 | 为什么会出问题 | 本次必须处理的策略 |
|---|---|---|
| `nav-slide out-in` 时序读取到旧 DOM | 新面板未挂载时误采旧面板高度，导致空白或误锁高 | 目标面板 DOM 缺席时宁可等待下一拍，也不回退读取旧 shell 高度 |
| 异高卡片仍按静态行高估算 | FlowPanel 最低高度会偏小，出现底部遮挡 | 前 2 张卡片一律取真实 DOM 高度求和，静态常量只做兜底 |
| `stagingListMaxHeight` 与统一 contract 重复控制 | 总高度和列表高度两套逻辑互相打架，产生空白 | 将列表高度降级为“消费剩余空间”，删除其对总高度的主导职责 |
| toast / 编辑态 / 滚动条干扰 FlowPanel 测量 | 最低高度采样不稳定 | 最小高度测量只聚焦 `header + 空态/前2卡 + footer`，不把短暂反馈态写进外框 contract |
| `CommandPanel` footer 继续脱离总高度 | 看起来像 `header + content` 才是面板，footer 额外长出去 | 强制 `CommandPanel` 三段式布局，footer 明确计入完整盒子高度 |
| 关闭执行流后拿到脏的上一轮锁高状态 | 返回到底层面板时高度错乱 | `commandPanelLockedHeight` 与 `flowPanelLockedHeight` 分离，并在切换边界显式清理 |

---

## 10. 测试策略

### 10.1 规则测试

补充纯规则测试，锁定：

1. `resolvedPanelHeight = min(panelMaxHeight, max(inheritedPanelHeight, panelMinHeight))`
2. `panelMaxHeight` 始终为硬上限
3. 搜索面板不走额外锁高公式

### 10.2 测量测试

补充测量与 sizing 测试，覆盖：

1. `CommandPanel` 完整盒子高度必须包含 `footer`
2. `FlowPanel` 空态最小高度测量
3. `FlowPanel` 前 2 张异高卡片最小高度测量
4. DOM 未挂载时不会错误读取旧面板高度

### 10.3 组件测试

补充组件级 contract：

1. `CommandPanel` 与 `FlowPanel` 都是三段式结构
2. 只有中间 `body/list` 区滚动
3. 参数面板 footer 上方无额外空白
4. 执行流底部无额外空白或遮挡

### 10.4 交互测试

补充跨面板路径：

1. 搜索 -> 参数：继承当前高度，不够才补高
2. 搜索 -> 执行流：继承当前高度，不够才补到执行流最小高度
3. 参数 -> 执行流：执行流继承参数面板当前锁定高度
4. 执行流关闭：回到底层面板正确高度语义
5. 参数 -> 搜索：继续复用统一退出恢复链路

---

## 11. 验收标准

满足以下条件即视为完成：

1. `panelMaxHeight` 仍然是 Search / Command / Flow 共用的唯一最高高度来源。
2. 搜索面板最低高度就是搜索框，不出现额外补高。
3. 参数面板进入时先继承当前面板高度，不够才补高，且补高不超过统一 cap。
4. 参数面板完整高度计算必须包含 `header + content + footer + divider`。
5. 参数面板首次锁高后，后续内容变化不再改变外框高度，footer 上方不再出现空白。
6. 执行流面板从搜索或参数打开时，都先继承最近面板的实际总高度。
7. 执行流最低高度按真实内容实时测量，支持异高卡片，不再依赖固定等高假设。
8. 执行流补高不能超过统一 cap；若触顶，则内部列表滚动。
9. 执行流底部不再出现空白或遮挡。
10. 高度职责边界清晰，可通过自动化测试稳定锁住，不再需要在多个模块重复修同一类问题。

---

## 12. 下一阶段建议

下一步进入 `writing-plans` 时，建议按以下顺序拆解：

1. 先锁规则：
   - `panelMaxHeight`
   - `panelMinHeight`
   - `resolvedPanelHeight`
2. 再做测量收口：
   - `CommandPanel` 完整盒子测量
   - `FlowPanel` 空态 / 前 2 张卡片测量
3. 再做状态收口：
   - `inheritedPanelHeight`
   - `commandPanelLockedHeight`
   - `flowPanelLockedHeight`
4. 最后做组件结构与测试回归，确保不再出现底部空白和重复高度职责。
