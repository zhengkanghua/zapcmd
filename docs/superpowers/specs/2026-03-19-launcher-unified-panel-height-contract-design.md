# Launcher 统一面板高度 Contract 设计

> 日期：2026-03-19
> 状态：approved
> 范围：Launcher 主窗口 `SearchPanel / CommandPanel / FlowPanel` 的统一最大高度、参数面板内部滚动结构与返回搜索页高度恢复
>
> 关联设计：
> - `docs/superpowers/specs/2026-03-15-command-panel-nav-stack-design.md`
> - `docs/superpowers/specs/2026-03-19-launcher-command-return-height-restore-design.md`

---

## 1. 背景与问题

当前 Launcher 已经具备搜索面板、参数面板与执行流面板三种主视图，但这三者在高度语义上仍不一致：

1. 外层 Launcher 视觉盒子当前没有在窗口内水平居中，而是左对齐。
2. 搜索面板已经具备明确的最大高度口径：
   - 搜索框高度
   - 搜索结果最大展示条数对应的高度
3. 参数面板虽然可以在搜索结果较少时按需增高，但其底部操作区（取消 / 加入执行流 / 直接执行）目前落在统一高度口径之外，导致面板总体高度会在既定上限下方额外再长出一截。
4. 参数面板返回搜索面板的锁高恢复逻辑已经覆盖返回按钮、取消和 `Esc`，但“填写参数后加入执行流”与“填写参数后直接执行”这两条成功路径，本质上同样是在回到搜索页，却没有复用同一条退出链路，因此仍存在高度恢复语义不一致的风险。

这造成的产品问题不是某个单点 bug，而是：

- 同一 Launcher shell 内，多个面板没有共享统一的最大高度 contract；
- 参数面板 footer 没有被视为面板盒子的一部分；
- 不同返回入口使用了不同的高度恢复路径。

---

## 2. 目标与非目标

### 2.1 目标

1. Launcher 外层视觉盒子在窗口内部只做**水平居中**，保持当前顶部对齐与 drag strip 逻辑不变。
2. 为 `SearchPanel / CommandPanel / FlowPanel` 建立同一份**全局最大高度 cap**。
3. 该 cap 的唯一产品口径为：
   - `搜索框高度 + 搜索结果最大展示条数对应的高度`
4. 参数面板允许在搜索结果较少时按需长高，但最高不能超过该全局 cap。
5. 参数面板 footer 固定可见，但必须属于统一高度盒子的一部分；超出空间时，仅允许 content 区内部滚动。
6. 所有“参数面板回到搜索页”的路径统一复用同一条退出锁高链路，包括：
   - 返回按钮
   - `Esc`
   - 取消按钮
   - 参数填写后加入执行流成功
   - 参数填写后直接执行成功

### 2.2 非目标

1. 不修改 Tauri 窗口本身是否居中的配置。
2. 不改变搜索面板结果条数上限与现有搜索结果展示密度。
3. 不重做 FlowPanel 的交互结构，仅让其继续消费统一高度 contract。
4. 不引入新的通用 PanelShell 抽象层；本轮只建立共享 contract 与必要接线。

---

## 3. 用户已确认的产品决策

| 决策项 | 结论 |
|---|---|
| 外层盒子居中范围 | 仅 Launcher UI 外框盒子水平居中，不改顶部对齐 |
| 参数面板 footer 行为 | 固定底栏，但必须在统一高度盒子内部 |
| 参数面板溢出策略 | 仅 content 区滚动，header/footer 不滚 |
| 全局最大高度来源 | 搜索框高度 + 搜索结果最大展示条数高度 |
| 参数面板可变高度 | 搜索结果较少时可按需增高，但最高不超过全局 cap |
| 成功提交返回链路 | 加入执行流成功 / 直接执行成功都必须复用返回锁高链路 |
| 目标风格 | 商业化、稳定预期、统一 shell 语义 |

---

## 4. 方案对比

### A. 局部修补

做法：

- 单独修 `launcher-root` 的对齐；
- CommandPanel 单独把 footer 收进去；
- 提交成功后手动补一条退出锁高调用。

优点：

- 实现快，改动少。

缺点：

- “全局最大高度”仍停留在隐性约定，不是统一 contract；
- 未来 Search / Command / Flow 任意一方继续演进时，容易再次偏离；
- 成功路径与取消路径仍有继续分叉的风险。

### B. 统一高度 contract + 参数页三段式结构 + 统一退出链路（采用）

做法：

- 将“搜索框 + 最大结果条数高度”提升为 Launcher 统一 cap；
- Search / Command / Flow 都消费同一 cap；
- CommandPanel 采用 `header / content / footer` 三段式；
- 所有返回搜索页的入口统一走 `requestCommandPanelExit()` 链路。

优点：

- 三个问题一次收口；
- 产品语义更一致；
- 交互稳定性更接近成熟商业化 Launcher。

缺点：

- 需要同步调整布局样式、sizing 计算和提交成功路径接线。

### C. 提前抽象共享 PanelShell

做法：

- 为 Search / Command / Flow 新建统一 shell 抽象，统一管理布局与高度。

优点：

- 长期结构最整洁。

缺点：

- 对当前问题来说过度设计；
- 会扩大本轮改动范围，稀释交付目标。

结论：采用 **B. 统一高度 contract + 参数页三段式结构 + 统一退出链路**。

---

## 5. 统一高度 Contract

## 5.1 全局 cap 定义

Launcher 的全局最大高度 cap 统一定义为：

```text
search input capsule height
+ max visible search rows height
+ drawer chrome / hint height
```

对当前实现语义而言，可直接理解为：

> 搜索面板在“展示最大允许搜索条数”时的整体可视高度，就是所有主面板共享的最高高度。

这是一个**产品语义值**，不是 CommandPanel 或 FlowPanel 自己推导出来的局部常量。

## 5.2 适用范围

该 cap 对以下面板全部生效：

1. `LauncherSearchPanel`
2. `LauncherCommandPanel`
3. `LauncherFlowPanel`

约束如下：

- SearchPanel：
  可低于 cap，结果少时保持动态高度。
- CommandPanel：
  可从当前搜索态高度继续增高，但最高不超过 cap。
- FlowPanel：
  继续在现有设计下消费同一 cap，不再拥有独立的“更高上限”语义。

## 5.3 外层盒子定位

外层 Launcher 视觉盒子在窗口中应调整为：

- 水平方向居中；
- 垂直方向仍保持当前顶部对齐；
- drag strip 的位置、命中区与顶部偏移逻辑不变。

换言之，本轮不是把整个窗口内容做“水平垂直双居中”，而是：

> 保持原先的顶端停靠体感，只把主视觉盒子从左贴齐修正为水平居中。

---

## 6. CommandPanel 三段式结构

## 6.1 结构定义

`LauncherCommandPanel` 调整为固定三段：

```text
CommandPanel
├── header   固定，不滚动
├── content  唯一允许滚动的区域
└── footer   固定，不滚动，但属于总高度的一部分
```

各区域职责：

- `header`
  - 返回按钮
  - 标题
  - 危险态 badge
  - 队列按钮
- `content`
  - 执行反馈 toast
  - 危险提示 banner
  - 参数表单
  - 命令预览
  - danger reasons
- `footer`
  - `Esc` 提示
  - 取消按钮
  - 加入执行流 / 直接执行 / 确定执行按钮

## 6.2 高度规则

CommandPanel 的高度必须满足以下规则：

1. 面板总高度受全局 cap 约束。
2. footer 固定在面板底部，但 footer 的高度要计入面板总高度。
3. 如果内容不足：
   - 面板可低于 cap；
   - 但不能低于“进入前搜索态高度 floor”。
4. 如果内容超出：
   - 只滚动 `content`；
   - 不滚 `header`；
   - 不滚 `footer`；
   - 不允许继续把外层面板往下撑高。

## 6.3 为什么采用固定 footer

固定 footer 且计入总盒子高度，是为了同时满足两点：

1. 关键操作始终可见，符合商业化产品的稳定预期；
2. footer 不再额外长出面板外部，保持与 Search / Flow 一致的统一外框语义。

本轮明确不采用“footer 作为内容一部分跟随滚动”的方案，因为那会让提交动作在内容较长时离开视口，降低高频使用效率。

---

## 7. 返回搜索页的统一退出链路

## 7.1 统一入口

所有从 CommandPanel 回到 SearchPanel 的路径统一收口到：

`requestCommandPanelExit()`

统一入口覆盖：

1. 返回按钮
2. `Esc`
3. 取消按钮
4. 参数填写后加入执行流成功
5. 参数填写后直接执行成功

任何上述路径都不应再自行各自处理：

- 清空 `pendingCommand`
- `popPage()` / `resetToSearch()`
- 手动触发一次单独的 sizing

而应统一交给退出协调器处理。

## 7.2 统一行为

统一退出链路的标准时序为：

1. 捕获当前 CommandPanel 高度并锁住；
2. 业务态退出，切回搜索页；
3. 等待搜索页稳定；
4. 只执行一次平滑回落；
5. 释放退出锁，恢复普通搜索态 sizing。

该逻辑与 `docs/superpowers/specs/2026-03-19-launcher-command-return-height-restore-design.md` 保持一致，但本轮将其适用范围明确扩展到**成功提交返回**路径。

## 7.3 为什么成功提交也必须并入

加入执行流成功与直接执行成功虽然不是“用户主动取消”，但从布局语义上看，它们同样完成了：

> CommandPanel -> SearchPanel 的页面回退

因此它们必须和取消返回共享同一条退出锁高链路；否则用户会遇到：

- 取消返回时平滑稳定；
- 成功提交返回时高度突变或恢复逻辑不同步。

这种不一致在商业化产品中是明显的交互瑕疵。

---

## 8. 模块职责调整

## 8.1 `src/styles/launcher.css`

职责：

- 修正最外层盒子的水平居中；
- 确保 CommandPanel 采用三段式布局；
- 让 `command-panel__content` 成为唯一滚动宿主；
- 让 `command-panel__footer` 固定且计入面板总高度。

## 8.2 `src/composables/launcher/useLauncherLayoutMetrics.ts`

职责：

- 持有统一 cap 的产品口径；
- 继续作为 Search / Command / Flow 的共享高度来源；
- 避免 CommandPanel 另行定义偏离搜索面板的独立最高高度。

## 8.3 `src/composables/launcher/useWindowSizing/*`

职责：

- 在 floor 与 cap 之间正确计算 CommandPanel 可用高度；
- 让成功提交后的返回也能复用现有 exit lock / settled / restore 协调逻辑；
- 保证搜索页稳定前不会提前吃到临时小高度。

## 8.4 `src/components/launcher/LauncherWindow.vue`

职责：

- 继续作为 Search / Command 切页容器；
- 将 CommandPanel 的 submit 成功路径也并入统一退出动作，而不是仅仅调用业务 submit。

## 8.5 `src/composables/execution/useCommandExecution/actions.ts`

职责：

- 保持参数提交成功后的业务语义：
  - execute 模式执行命令
  - stage 模式加入执行流
- 但布局返回动作不在这里单独拼接，而是由上层统一退出链路承接。

---

## 9. 测试策略

## 9.1 布局测试

需要新增或更新断言，验证：

1. Launcher 外层视觉盒子为水平居中，而非左对齐。
2. 顶部 drag strip 与顶部偏移逻辑不受影响。

## 9.2 高度 contract 测试

需要锁定以下行为：

1. 搜索结果很少时，CommandPanel 可以按需增高；
2. 但 CommandPanel 总高度永远不超过全局 cap；
3. FlowPanel 继续消费相同 cap，不出现比 SearchPanel 更高的独立上限。

## 9.3 CommandPanel 结构测试

需要验证：

1. footer 在面板内部固定可见；
2. 当内容超长时，滚动发生在 `command-panel__content`；
3. `header/footer` 不参与滚动。

## 9.4 退出链路测试

需要补充以下场景：

1. 返回按钮走统一退出链路；
2. `Esc` 走统一退出链路；
3. 取消按钮走统一退出链路；
4. 参数填写后点击“加入执行流”成功，走统一退出链路；
5. 参数填写后点击“直接执行 / 确定执行”成功，走统一退出链路；
6. 所有路径都满足：
   - 搜索页稳定前不提前缩小；
   - 只回落一次；
   - 最终落到搜索页实际高度。

---

## 10. 验收标准

1. Launcher 外层视觉盒子在窗口内水平居中。
2. Search / Command / Flow 三个面板共享同一最大高度 cap。
3. 参数面板在搜索结果较少时可按需增高，但最高不超过全局 cap。
4. 参数面板 footer 固定可见且属于统一高度盒子的一部分，不再在底部额外长出一截。
5. 参数过多或提示过长时，只有 content 区内部滚动。
6. 返回按钮、`Esc`、取消、加入执行流成功、直接执行成功五类返回搜索页路径全部复用统一退出锁高链路。
7. 从 CommandPanel 回到 SearchPanel 时，不出现“先缩一下再回弹”的高度抖动。

---

## 11. 风险与注意点

1. 如果只修样式不统一 cap 来源，后续仍可能出现面板各自维护上限的问题。
2. 如果只把 footer 固定而没有把它计入统一盒子高度，会继续复现“底部多长出一截”的旧问题。
3. 如果成功提交路径仍绕开 `requestCommandPanelExit()`，会让取消返回与成功返回继续出现不同的高度恢复语义。
4. 若 `useWindowSizing/controller.ts` 为支持这些逻辑继续明显膨胀，实现阶段应优先抽离局部协调单元，而不是继续堆进单文件。

---

## 12. 下一阶段建议

下一步进入 `writing-plans`，建议按以下顺序拆解：

1. 锁定 contract：
   - 统一 cap 来源
   - CommandPanel 三段式结构
   - 成功返回并入统一退出链路
2. 再落地样式、layout metrics、window sizing、LauncherWindow 接线；
3. 最后补齐布局/结构/退出链路回归测试与手动验证清单。
