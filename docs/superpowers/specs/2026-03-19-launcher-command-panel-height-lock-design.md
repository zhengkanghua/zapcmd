# Launcher 参数面板锁高 Contract 设计

> 日期：2026-03-19
> 状态：approved
> 范围：Launcher `CommandPanel` 进入参数态时的高度继承、首次锁定、footer 内收与退出恢复
>
> 关联设计：
> - `docs/superpowers/specs/2026-03-19-launcher-unified-panel-height-contract-design.md`
> - `docs/superpowers/specs/2026-03-19-launcher-command-return-height-restore-design.md`

---

## 1. 设计更正说明

本设计用于**更正** `2026-03-19-launcher-unified-panel-height-contract-design.md` 中对 `CommandPanel` 高度语义的错误理解。

上一版误解点是：

1. 将参数面板理解为“按内容驱动，可在进入后缩小”；
2. 将底部 footer 的空间与参数面板主体拆开处理，导致继承搜索高度时只覆盖 `header + content`，footer 仍长到统一盒子外；
3. 将“进入前搜索高度”误降级成一次性的参考值，而不是参数面板进入后的默认继承高度。

用户重新确认后的真实产品语义是：

> 参数面板进入时，先继承“进入前搜索面板的实际总高度”。
> 如果这块高度已经足够容纳参数面板完整盒子，则保持不变；
> 如果不够，则只允许向上增高一次，最高不超过全局 cap；
> 参数面板打开后高度固定，不再因内容增减而回缩或再次增高。

这里的“完整盒子”必须包含：

- `header`
- `content`
- `footer`

而不是只计算前两者。

---

## 2. 背景与问题

当前 Launcher 已具备：

- 搜索面板 `SearchPanel`
- 参数面板 `CommandPanel`
- 执行流面板 `FlowPanel`

其中全局最大高度 cap 已定义为：

> 搜索框高度 + 最大可展示搜索结果高度

但 `CommandPanel` 仍有两类残留问题：

1. **进入参数面板时不应缩小**
   用户从某个搜索态进入参数面板后，如果当前搜索面板的总高度已经足够容纳参数面板完整盒子，参数面板应直接沿用该高度，而不是切入后缩小到更矮的内容驱动高度。

2. **footer 必须属于同一高度盒子**
   当前问题不是“参数页不该继承搜索高度”，而是继承时只覆盖了标题与内容区，最下方按钮区域没有被纳入同一套总高度计算，导致视觉上像在原有高度下面额外再长出一截。

因此这次修正的目标不是“改成完全内容驱动”，而是：

> 让 `CommandPanel` 先继承进入前搜索面板总高度，再以完整盒子口径进行一次锁高决策。

---

## 3. 目标与非目标

### 3.1 目标

1. `CommandPanel` 进入时先继承进入前搜索面板的**实际总高度**。
2. 该高度若足够容纳参数面板完整盒子，则参数面板保持该高度不变。
3. 若该高度不足，则参数面板只允许**首次向上增高一次**。
4. 增高上限仍是全局 cap，不引入新的独立上限。
5. `footer` 必须属于参数面板统一高度盒子的一部分，不能再额外长出去。
6. 参数面板打开后外框高度固定：
   - 不再回缩
   - 不再因为后续内容变化继续增高
   - 仅允许 `content` 区滚动
7. 退出搜索页时，仍复用现有统一退出锁高恢复链路。

### 3.2 非目标

1. 不修改 Search / Flow 的全局 cap 定义。
2. 不重做参数面板内部字段布局与按钮文案。
3. 不改已有“成功提交后返回搜索页”的统一退出路径，只修正其高度起点来源。
4. 不把“8 条结果”之类例子写死成固定业务常量，所有规则都基于动态实测高度。

---

## 4. 用户确认的产品决策

| 决策项 | 结论 |
|---|---|
| 参数面板进入默认高度 | 继承进入前搜索面板的实际总高度 |
| 高度是否允许进入后缩小 | 不允许 |
| 高度是否允许进入后再次增高 | 不允许，首次锁定后固定 |
| 何时允许增高 | 仅在首次锁定时，完整参数面板盒子放不下时 |
| 完整参数面板盒子口径 | `header + content + footer + 必要分隔线` |
| footer 是否必须算在盒子内 | 必须 |
| 内容变化后的处理 | 仅 `content` 内部滚动 |
| cap 口径 | 继续沿用搜索框 + 最大搜索结果高度 |

---

## 5. 高度 Contract

### 5.1 动态量定义

本设计只使用以下动态量，不写死任何固定结果条数示例：

1. `entrySearchFrameHeight`
   - 进入 `CommandPanel` 前，当前搜索面板的实际总高度

2. `commandPanelFullNaturalHeight`
   - 参数面板完整盒子自然高度
   - 必须包含 `header + content + footer + divider`

3. `globalCapFrameHeight`
   - 全局统一最大高度 cap
   - 来源保持不变，即搜索框 + 最大搜索结果展示高度

### 5.2 最终锁高公式

参数面板进入后的最终锁定高度为：

```text
commandPanelLockedFrameHeight =
  clamp(
    max(entrySearchFrameHeight, commandPanelFullNaturalHeight),
    commandPanelMinFrameHeight,
    globalCapFrameHeight
  )
```

语义解释：

1. 先继承进入前搜索高度；
2. 若完整参数面板盒子更高，则允许首次向上补齐；
3. 最高不能超过全局 cap；
4. 一旦锁定完成，参数面板生命周期内高度固定。

### 5.3 生命周期规则

参数面板存活期间，外框高度满足：

1. 不回缩；
2. 不因后续参数输入、预览变长、危险提示变化而再次增高；
3. 只允许 `content` 区滚动消化内容波动。

---

## 6. 布局结构

### 6.1 参数面板结构

`LauncherCommandPanel` 必须保持三段式：

```text
CommandPanel
├── header
├── content
└── footer
```

其中：

- `header` 固定，不滚动
- `content` 负责承接剩余空间，允许滚动
- `footer` 固定贴底，但属于同一高度盒子内部

### 6.2 布局语义

布局应满足：

1. `.launcher-frame`
   - 持有参数面板最终锁定后的总高度

2. `.command-panel`
   - 填满 `.launcher-frame`

3. `.command-panel__content`
   - `flex: 1`
   - `min-height: 0`
   - `overflow-y: auto`

4. `.command-panel__footer`
   - 固定在面板底部
   - 高度计入 `commandPanelFullNaturalHeight`

这样在“继承搜索高度已足够”的场景下：

- 参数面板不缩小；
- footer 不会掉出盒子外；
- 中间剩余空间由 `content` 吃掉；
- 用户仍能看到固定底栏。

---

## 7. 进入参数面板的时序

### 7.1 进入前

从搜索页进入参数页时，先捕获：

```text
entrySearchFrameHeight = 当前搜索面板实际总高度
```

这是参数面板进入后的默认基线高度，不是可被忽略的参考值。

### 7.2 切入参数页

参数页切入的第一帧：

1. 先直接沿用 `entrySearchFrameHeight`
2. 不允许先缩一下再增高

### 7.3 `command-page-settled` 后首次锁定

待参数页实际挂载完成后：

1. 测量 `commandPanelFullNaturalHeight`
2. 按公式计算 `commandPanelLockedFrameHeight`
3. 若需要增高，仅此一次
4. 完成后锁定高度，后续不再改变

---

## 8. 退出搜索页的恢复规则

现有统一退出链路保留：

- 返回按钮
- `Esc`
- 取消按钮
- 加入执行流成功
- 直接执行成功

但退出锁高的起点应调整为：

1. 优先使用 `commandPanelLockedFrameHeight`
2. 若尚未完成首次锁定，再回退到 `entrySearchFrameHeight`

这样搜索页恢复时，锁住的总高度才与用户在参数页实际看到的完整盒子高度一致。

---

## 9. 测试策略

### 9.1 必测行为

1. 进入参数页时继承当前搜索面板实际高度，而不是缩小。
2. 参数面板完整高度计算必须包含 footer。
3. 当继承高度不足时，参数页仅在首次锁定时增高一次。
4. 参数页首次锁定后，后续内容变化不会再触发外框高度变化。
5. 内容溢出时仅 `content` 区滚动。
6. 退出搜索页时继续走统一退出锁高恢复。

### 9.2 示例测试场景

1. 搜索面板当前高度较高，参数页内容较少：
   - 参数页保持原搜索高度
   - footer 仍在同一盒子内部

2. 搜索面板当前高度较低，参数页完整盒子更高：
   - 参数页首次进入后增高到完整盒子高度或 cap

3. 参数页打开后输入参数导致预览变长：
   - 外框高度不变
   - `content` 内部滚动

4. 参数页打开后危险提示消失：
   - 外框高度不变
   - 不回缩

---

## 10. 验收标准

满足以下条件即视为完成：

1. 从任意搜索态进入参数面板时，不再出现“先缩小”的视觉回退。
2. 参数面板底部按钮区始终处于统一面板高度盒子内部。
3. 参数页完整高度不够时只会在首次锁定时增高一次。
4. 参数页打开后内容变化不再改变外框高度。
5. 搜索页返回恢复链路无回归。
6. 自动化测试覆盖上述 contract，且 `npm run check:all` 全绿。

---

## 11. 实施建议

实现阶段建议将旧的“floor”语义拆分为两个明确状态：

- `entrySearchFrameHeight`
- `commandPanelLockedFrameHeight`

避免继续沿用模糊的 `commandPanelFrameHeightFloor` 概念，否则执行阶段容易再次把：

- “进入前继承基线”
- “参数页生命周期锁高”

这两个不同职责混在一起，重复引发错误。
