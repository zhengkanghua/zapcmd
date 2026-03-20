# Launcher 搜索有效高度与参数页继承设计

> 日期：2026-03-20
> 状态：approved
> 范围：Launcher `SearchPanel` 底部留白、搜索有效高度口径、`CommandPanel` 进入继承高度、共享最高高度 contract
>
> 关联设计：
> - `docs/superpowers/specs/2026-03-19-launcher-command-panel-height-lock-design.md`
> - `docs/superpowers/specs/2026-03-20-launcher-command-flow-height-contract-correction-design.md`
> - 参考截图：`docs/bug_img/bug5.png`

---

## 1. 背景与问题

当前 Launcher 已经具备：

1. `SearchPanel / CommandPanel / FlowPanel` 共享统一最高高度。
2. `CommandPanel` 在 settled 后按完整盒子口径锁高。
3. `FlowPanel` 的“跟随当前面板高度，不够再补高”语义基本正确。

但用户在 `docs/bug_img/bug5.png` 中观察到一个更具体的问题：

1. 搜索页左侧面板底部仍存在一块明显的空白区域。
2. 从搜索页进入参数页时，参数页 footer 恰好落在这块空白区域上。
3. 因此视觉上像是“按钮区又额外长出了一节”。

这说明现有问题不是：

- `CommandPanel` footer 没计入完整盒子高度。

而是：

- 搜索页当前左侧面板高度里仍包含一块不应参与继承的无效底部留白；
- 参数页进入时继承了这块留白对应的高度。

---

## 2. 用户确认的产品语义

用户重新确认后的真实口径如下：

### 2.1 搜索页有效高度

`SearchPanel` 的有效高度只等于：

```text
搜索框 + 搜索结果区域
```

明确不包含：

1. 顶部拖拽区；
2. 底部呼吸留白；
3. 外层 shell / frame 的额外安全边距；
4. 任何为了视觉呼吸感保留的外围空白。

### 2.2 进入参数页的继承规则

从搜索页进入参数页时：

1. 先继承当前 `SearchPanel` 的有效高度；
2. 如果该高度不足以容纳参数页完整盒子，再允许补高；
3. 补高只由参数页自身内容需求触发，不允许因为搜索页底部留白而变高。

### 2.3 全局最高高度

无论是搜索页、参数页还是执行流，统一最高高度都只来源于：

```text
搜索框 + 设定的“最高展示多少条搜索结果”
```

这就是共享的 `sharedPanelMaxHeight`。

### 2.4 执行流约束

执行流当前语义是正确参考：

1. 跟随当前面板高度；
2. 不够再补高；
3. 不携带底部呼吸留白高度；
4. 仍受 `sharedPanelMaxHeight` 限制。

---

## 3. 根因审查结论

本次问题的根因分两层：

### 3.1 视觉层

旧的 filler / floor 占位虽然已经删除，但搜索页当前左侧外框高度仍可能大于真实搜索内容高度，因此底部会出现一块视觉空白。

### 3.2 继承层

参数页进入时，当前实现继承的是“左侧当前 frame 总高度”，而不是“搜索页有效高度”。

因此：

1. 搜索页底部空白先被算进当前左侧面板高度；
2. 参数页第一帧继承了这块高度；
3. settled 后参数页 footer 落在这块原本空白的区域里；
4. 用户视觉上感知为“按钮区多长出一节”。

结论：

> 需要修正的不是 `CommandPanel` footer 测量，而是 `SearchPanel` 的有效高度口径，以及 `Search -> Command` 的继承基线来源。

---

## 4. 高度术语定义

### 4.1 `searchPanelEffectiveHeight`

仅表示搜索页左侧内容的有效高度：

```text
searchPanelEffectiveHeight =
  searchCapsuleHeight + resultDrawerEffectiveHeight
```

说明：

1. `searchCapsuleHeight` 表示搜索框所在区域；
2. `resultDrawerEffectiveHeight` 表示当前结果区的可见有效高度；
3. 不包含拖拽区；
4. 不包含底部呼吸留白；
5. 不包含外层窗口安全边距。

### 4.2 `sharedPanelMaxHeight`

三类面板共享的唯一最高高度：

```text
sharedPanelMaxHeight =
  searchCapsuleHeight + maxSearchResultsViewportHeight
```

说明：

1. `maxSearchResultsViewportHeight` 来自产品设定的最大结果展示量；
2. 这是 Search / Command / Flow 共用的硬上限；
3. 不包含拖拽区和底部呼吸留白。

### 4.3 `windowChromeHeight`

只表示窗口外围非业务内容高度，例如：

1. 顶部拖拽区；
2. 底部极小呼吸留白。

这部分：

1. 可以参与窗口最终显示；
2. 不能参与 `Search -> Command` 的继承基线；
3. 不能参与 `sharedPanelMaxHeight`。

---

## 5. 统一 Contract

### 5.1 SearchPanel

搜索页的内容高度 contract：

```text
resolvedSearchPanelHeight =
  min(sharedPanelMaxHeight, searchPanelEffectiveHeight)
```

语义：

1. 搜索页只按自身真实有效内容决定高度；
2. 底部呼吸留白不属于有效高度；
3. 允许保留极小视觉呼吸感，但它只能属于 `windowChromeHeight`。

### 5.2 CommandPanel

参数页进入后：

```text
commandPanelInheritedHeight = searchPanelEffectiveHeight
```

settled 后：

```text
resolvedCommandPanelHeight =
  min(
    sharedPanelMaxHeight,
    max(commandPanelInheritedHeight, commandPanelFullNaturalHeight)
  )
```

语义：

1. 第一帧先继承搜索页有效高度；
2. 仅当参数页完整盒子放不下时才补高；
3. `commandPanelFullNaturalHeight` 继续包含 `header + content + footer + divider`；
4. 最高不得超过 `sharedPanelMaxHeight`。

### 5.3 FlowPanel

执行流继续维持现有正确语义，只把口径明确化：

```text
resolvedFlowPanelHeight =
  min(
    sharedPanelMaxHeight,
    max(currentPanelEffectiveHeight, flowPanelMinHeight)
  )
```

语义：

1. 先跟随当前面板有效高度；
2. 不够再补高；
3. 不携带底部呼吸留白；
4. 仍受共享上限限制。

---

## 6. Search -> Command 时序

### 6.1 进入前

从搜索页进入参数页时，先冻结：

```text
entrySearchPanelEffectiveHeight = 当前搜索页有效高度
```

注意：

1. 这里不能再直接使用整个 `lastWindowSize`；
2. 也不能从包含底部留白的 frame 总高度反推；
3. 必须只采样“搜索框 + 搜索结果区域”。

### 6.2 切入参数页第一帧

参数页第一帧直接继承：

```text
commandPanelInheritedHeight = entrySearchPanelEffectiveHeight
```

要求：

1. 不允许因为旧搜索页空白而偏高；
2. 也不允许因为时序竞争拿到滞后的旧搜索高度。

### 6.3 `command-page-settled`

参数页挂载完成后：

1. 测量 `commandPanelFullNaturalHeight`；
2. 用统一公式只计算一次 `resolvedCommandPanelHeight`；
3. 写入 `commandPanelLockedHeight`；
4. 后续参数输入、危险提示显隐、预览变化都只允许 `content` 区滚动，不再改变外框高度。

---

## 7. 搜索页底部留白策略

### 7.1 目标

搜索页底部留白要明显缩小。

允许：

1. 保留极小的视觉呼吸感；
2. 让窗口不至于贴边过死。

不允许：

1. 留白大到能肉眼看成一整块“空 panel”；
2. 这块留白继续参与搜索页有效高度；
3. 这块留白被参数页继承后，恰好变成 footer 的落脚区。

### 7.2 设计约束

因此需要做到：

1. 搜索页底部留白属于 `windowChromeHeight`；
2. 其大小独立、可控、可单测；
3. 它不进入 `searchPanelEffectiveHeight`；
4. 它不进入 `sharedPanelMaxHeight`；
5. 它不进入 `commandPanelInheritedHeight`。

---

## 8. 测试策略

### 8.1 必测场景

1. 搜索页只有搜索框时：
   - 有效高度仅为搜索框；
   - 底部呼吸留白不进入有效高度。

2. 搜索页结果较多但未达到上限时：
   - 有效高度仅等于搜索框 + 当前结果区；
   - 不包含底部留白。

3. 搜索页达到最大结果展示时进入参数页：
   - 参数页第一帧高度直接等于当前搜索页有效高度；
   - 不再出现“按钮区额外长高”。

4. 搜索页较矮时进入参数页：
   - 参数页只在完整盒子放不下时补高；
   - 补高上限为 `sharedPanelMaxHeight`。

5. 搜索页进入执行流：
   - 继续保持“跟随当前面板高度，不够再补高”的正确体验；
   - 不携带底部呼吸留白。

6. 参数页进入执行流再关闭：
   - 回到参数页已锁定高度；
   - 不回退到带搜索页空白的旧高度口径。

### 8.2 需要新增的 contract 测试

1. `SearchPanel` 底部呼吸留白不进入 `searchPanelEffectiveHeight`。
2. `Search -> Command` 时继承基线使用 `searchPanelEffectiveHeight`，而不是外层 frame/window 高度。
3. `sharedPanelMaxHeight` 的定义只来自搜索框 + 最大结果展示量。
4. 当搜索页底部存在外围视觉留白时，参数页继承高度仍不包含这块留白。

---

## 9. 验收标准

满足以下条件即视为完成：

1. 搜索页底部空白明显缩小，仅保留极小呼吸感。
2. 搜索页底部呼吸留白不再参与搜索页有效高度。
3. 搜索页进入参数页时，参数页继承的是搜索页有效高度，而不是整个外框高度。
4. 搜索页已达最大高度时，进入参数页不再额外长出 footer 区域。
5. 搜索页较矮时，参数页仍可在必要时补高，但不得超过共享最高高度。
6. 执行流当前正确体验不回归。
7. 自动化测试覆盖新的有效高度与继承 contract，且实现阶段验证通过。

---

## 10. 实施建议

实现阶段建议显式拆出两个来源：

1. `searchPanelEffectiveHeight`
2. `windowChromeHeight`

避免继续用单一的：

- `lastWindowSize`
- `frameHeight`
- `shellHeight`

去同时承担：

1. 搜索页真实业务内容高度；
2. 窗口外围视觉留白；
3. 参数页继承基线；
4. 共享最高高度。

否则后续仍会重复出现：

- 搜索页看起来空一截；
- 参数页 footer 正好掉进这截空白里；
- 用户误以为 footer 自己长高了。
