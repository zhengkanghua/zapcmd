# Launcher 参数面板返回搜索页高度恢复设计

> 日期：2026-03-19
> 状态：approved
> 范围：Launcher 主窗口 `CommandPanel -> Search` 返回链路的窗口高度与外框高度恢复
>
> 关联设计：
> - `docs/superpowers/specs/2026-03-15-command-panel-nav-stack-design.md`
> - `docs/superpowers/specs/2026-03-16-launcher-frame-height-unification-design.md`

---

## 1. 背景与问题

当前 Launcher 已经具备以下正确行为：

1. 从搜索页进入参数面板（`CommandPanel`）时，窗口默认保持与搜索页一致高度；
2. 只有参数内容确实不够放下时，窗口才按需增高；
3. 最大高度仍受统一的 LauncherFrame 设计上限约束。

但在 **从参数面板返回搜索页** 时，用户观察到明显的不合理体验：

1. 返回瞬间窗口会先缩小；
2. 随后又恢复或再次调整到搜索页最终高度；
3. 视觉上形成“缩小一下再复原”的抖动。

结合当前实现链路，问题本质是：

- 返回时 `pendingCommand` 会先被清空；
- `launcher-frame` 的临时固定高度也随之释放；
- 但搜索页由于 `nav-slide` 的 `out-in` 切页与 DOM 重挂仍处于过渡中；
- sizing 在搜索页尚未稳定时提前拿到了一次偏小的临时高度，于是先触发一次缩小，下一轮再拉回正确高度。

这说明现有设计已经有“进入参数页时的 floor 保护”，但还缺少“退出参数页时的锁高与统一回落调度”。

---

## 2. 目标与非目标

### 2.1 目标

1. 从参数面板返回搜索页时，**先保持参数面板当前高度**，不允许立即缩小。
2. 等搜索页切回并稳定后，再**一次性平滑动画回落**到搜索页最终高度。
3. 所有返回入口都必须走同一条共用逻辑，避免按钮、`Esc`、点击搜索框等路径各自维护时序。
4. 该逻辑应抽离为可复用的过渡协调机制，而不是散落在多个组件和事件处理里。

### 2.2 非目标

1. 不改变“进入参数面板时同高，不够才增高”的现有规则。
2. 不修改搜索页结果高度计算口径、designCap 口径或 FlowPanel/SafetyOverlay 的既有 sizing 设计。
3. 不重做导航栈动画，仅在现有动画链路上增加退出期高度协调。

---

## 3. 已确认决策

| 决策项 | 结论 |
|---|---|
| 返回主方案 | 退出期高度锁 + 统一回落调度 |
| 返回中间态 | 先保持参数面板当前高度 |
| 最终落点 | 搜索页最终高度 |
| 最终高度变化方式 | 平滑动画回落 |
| 适用入口 | 所有从参数面板回到搜索页的路径统一适用 |
| 代码组织 | 抽离共用逻辑，避免多处修改 |

---

## 4. 方案对比

### A. 退出期高度锁 + 统一回落调度（采用）

思路：

- 将“返回搜索页”抽象成统一退出动作；
- 在 sizing 层建立明确的退出期状态；
- 先锁住当前参数面板高度；
- 等搜索页稳定后，再用现有窗口动画能力回落到搜索页最终高度。

优点：

- 所有返回入口统一接入；
- 真实窗口高度与 `launcher-frame` 高度保持一致；
- 方案与现有 `CommandPanel floor` 设计天然衔接；
- 最符合“抽离共用逻辑、不要多处分叉”的要求。

缺点：

- 需要在导航切页与 sizing 之间新增明确的过渡协调状态。

### B. 仅锁 `launcher-frame` CSS 高度，切页后再释放

优点：

- 视觉改动面小；
- 主要集中在 DOM/CSS。

缺点：

- 真实窗口高度与内部 frame 高度容易失步；
- 不能从根上解决 Tauri 窗口先缩再回调的问题；
- 更像表层补丁。

### C. 延迟清理 `pendingCommand` 或延迟返回

优点：

- 实现最快。

缺点：

- 业务态与过渡态耦合；
- 后续在返回按钮、`Esc`、点击搜索框等路径上容易继续分叉；
- 长期维护风险高。

结论：采用 **A. 退出期高度锁 + 统一回落调度**。

---

## 5. 详细设计

## 5.1 统一退出入口

新增一个统一语义动作，建议命名为：

`requestCommandPanelExit()`

该动作表达的含义不是“某个按钮被点击”，而是：

> “我要从参数面板回到搜索页，请走完整的退出链路。”

所有返回入口必须只调用这一条共用动作：

1. `LauncherCommandPanel` 左上角返回按钮；
2. `Esc`；
3. 点击搜索框触发回退；
4. 未来任何新增的“从参数面板回到搜索页”入口。

这些入口不再各自直接：

- `popPage()`
- `cancelParamInput()`
- 清 `pendingCommand`
- 手动调高度同步

而是统一发起退出请求，由协调器接管后续流程。

---

## 5.2 状态模型

返回链路新增一个明确的过渡状态机，建议至少覆盖 3 个阶段：

### `command-active`

含义：

- 当前处于参数面板；
- 继续沿用现有进入时 floor 规则。

### `command-exiting`

含义：

- 用户已触发返回；
- 搜索页尚未完全切回并稳定。

规则：

1. 捕获当前参数面板时的 `frameHeight` 作为退出锁定高度；
2. 在这一阶段，窗口和 `launcher-frame` 都必须继续保持该高度；
3. 允许业务态退出，但 sizing 层不能立即按搜索页临时高度生效。

### `search-settling`

含义：

- 搜索页已切回；
- 正在等待搜索页 DOM、drawer/floor/filler 和布局计算稳定。

规则：

1. 重新按搜索页标准口径计算目标高度；
2. 如果目标高度小于当前锁定高度，则执行一次平滑回落；
3. 如果目标高度大于等于当前锁定高度，则无需回落，直接释放退出锁；
4. 完成后回到普通搜索态 sizing。

---

## 5.3 标准时序

返回链路统一为：

1. 用户触发返回；
2. 调用 `requestCommandPanelExit()`；
3. 退出协调器进入 `command-exiting`，记录当前锁定高度；
4. 业务态退出：清理 `pendingCommand`，导航栈回到 `search`；
5. 等待搜索页真正完成切回并稳定；
6. 按搜索页口径重新计算目标高度；
7. 若目标高度更小，则触发一次平滑回落；
8. 回落完成后释放退出锁，恢复普通搜索页动态 sizing。

要求：

- 中间不得出现“先按临时小高度缩一下，再重新放大/回调”的行为；
- 回落只能发生一次；
- 回落目标必须是搜索页最终高度，而不是某个切页中的临时值。

---

## 5.4 稳定点判定

是否允许开始回落，必须由明确的“搜索页已稳定”条件控制，而不是由某个按钮点击时机直接触发。

建议稳定点满足以下条件：

1. `navCurrentPage.type === 'search'`；
2. 搜索页对应 DOM 已重新挂回，至少经过一轮 `nextTick()`；
3. 已按搜索页标准 sizing 口径重新计算过一次目标高度。

推荐实现方式：

- 由 `LauncherWindow` 的导航切页生命周期提供“搜索页进入完成”的主信号；
- sizing 协调器在收到该信号后，再发起一次标准 `scheduleWindowSync()`；
- 只有这一轮得到的搜索页高度，才允许作为回落目标。

这能避免在 `out-in` 切页期间提前拿到偏小高度，从而复现抖动。

---

## 5.5 高度协调器职责

建议在 launcher sizing 侧新增独立的“参数面板退出协调器”职责单元，而不是继续把状态零散堆在组件点击逻辑中。

该协调器的职责只限于：

1. 在退出开始时捕获当前参数面板高度；
2. 在退出过程中继续把这个高度作为临时锁；
3. 在搜索页稳定后计算目标搜索高度；
4. 用现有窗口动画能力执行一次平滑回落；
5. 回落结束后释放锁。

建议其内部显式维护：

- `isCommandPanelExiting`
- `lockedExitFrameHeight`
- `restoreTargetFrameHeight`
- `isRestoringToSearch`

该协调器不关心返回是由谁触发，只接受统一的退出请求与“搜索页稳定”信号。

---

## 5.6 模块职责划分

### `LauncherCommandPanel.vue`

职责：

- 仅发出退出意图；
- 不再自己直接 `popPage()`。

### `useMainWindowShell.ts` / 热键层

职责：

- `Esc` 命中参数面板返回时，也只发统一退出请求；
- 不再拼装单独的参数面板清理时序。

### `runtime.ts` / `viewModel.ts`

职责：

- 提供 `requestCommandPanelExit()`；
- 统一协调业务态退出与导航态回到搜索页。

### `useWindowSizing/controller.ts`

职责：

- 管理退出期锁高、搜索页稳定后的回落、以及回落完成后的释放。

### `LauncherWindow.vue`

职责：

- 提供“搜索页切回并完成进入”的生命周期信号；
- 供 sizing 协调器判断何时可以开始恢复到搜索页目标高度。

---

## 6. 影响文件

| 文件 | 改动方向 |
|---|---|
| `src/components/launcher/parts/LauncherCommandPanel.vue` | 返回按钮只触发统一退出动作，不再直接 `popPage()` |
| `src/components/launcher/LauncherWindow.vue` | 对外提供搜索页切回完成的生命周期信号 |
| `src/composables/app/useAppCompositionRoot/runtime.ts` | 组装统一退出动作与协调器接线 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 将取消返回收口为统一出口 |
| `src/composables/launcher/useMainWindowShell.ts` | `Esc` 返回路径改接统一退出动作 |
| `src/composables/launcher/useWindowSizing/controller.ts` | 增加退出锁高、稳定后回落、释放锁逻辑 |
| `src/composables/launcher/useWindowSizing/calculation.ts` | 如有必要，补充退出期 sizing 口径 |
| `src/features/hotkeys/windowKeydownHandlers/*` | 如需透传返回动作，保持热键路径与按钮路径一致 |

如 `controller.ts` 继续膨胀，应在本轮实现中新增单独的过渡协调模块，避免窗口 sizing 控制器进一步失焦。

---

## 7. 测试策略

## 7.1 窗口 sizing 控制器测试

重点补在：

- `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

新增断言：

1. 从参数面板返回时，先保持参数面板高度，不立刻缩小；
2. 搜索页稳定前，即使出现较小的临时搜索高度，也不会提前生效；
3. 搜索页稳定后只触发一次回落；
4. 回落完成后退出锁会被正确释放。

## 7.2 窗口 sizing 计算测试

重点补在：

- `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

新增断言：

1. 退出锁存在时，搜索页临时小高度不会覆盖当前锁定高度；
2. 锁释放后，恢复普通搜索页高度计算；
3. 若目标搜索高度大于等于当前锁定高度，则不触发回落。

## 7.3 入口统一性测试

重点补在：

- `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- `src/composables/__tests__/app/useAppWindowKeydown.test.ts`

新增断言：

1. 返回按钮走统一退出动作；
2. `Esc` 走统一退出动作；
3. 点击搜索框回退也走统一退出动作；
4. 三条路径最终都进入相同的退出协调流程。

---

## 8. 验收标准

1. 从搜索页进入参数面板时，继续保持“同高，不够才增高”的现有行为。
2. 从参数面板返回搜索页时，不再出现“先缩小再复原”的抖动。
3. 返回过程中，窗口先保持参数面板当前高度。
4. 搜索页稳定后，仅执行一次平滑动画回落到搜索页最终高度。
5. 返回按钮、`Esc`、点击搜索框回退三种入口表现一致。
6. 退出逻辑集中在一条共用链路中，不再分散在多个组件/事件处理器里。

---

## 9. 风险与注意点

1. 如果只锁 `launcher-frame` 而未同步真实窗口高度，可能出现“内部不抖，窗口外壳仍抖”的假修复。
2. 如果稳定点只依赖业务状态而不依赖搜索页实际挂回时机，仍可能提前拿到临时高度。
3. 不能通过延迟清理 `pendingCommand` 之类的业务态耦合手法替代过渡协调器，否则后续维护会继续分叉。
4. 若 `LauncherWindow` 的切页生命周期无法稳定提供进入完成信号，需要在实现阶段补充一个明确、可测试的过渡完成钩子。

---

## 10. 下一阶段建议

下一步进入 `writing-plans`，建议拆成以下实现顺序：

1. 先锁定 contract：
   - 统一退出入口
   - 退出锁高
   - 搜索页稳定后单次回落
2. 再落地 runtime / window sizing / LauncherWindow 接线；
3. 最后补回归测试并跑完整验证链路。
