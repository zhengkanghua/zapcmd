# 08. B4 Interaction and State Machine

> 本文定义 `B4 = Overlay Review Mode with Floor Height Protection` 的交互契约、状态机、键盘语义与实现边界。
> 目标是让后续 Demo 评审与代码开发都基于同一套交互模型，而不是边做边猜。

## 适用范围

本文只讨论 **主窗口（launcher）**。

不覆盖：
- Settings 窗口内部交互
- Rust 执行实现
- 命令目录 schema
- 非主窗口类弹层以外的新业务功能

## 当前实现基线（供迁移参考）

现有主窗口交互基线：

- `toggleQueue`、`switchFocus`、`executeQueue`、`clearQueue` 等热键已在主窗口中存在
- `Esc` 当前顺序为：安全确认 → 参数弹层 → 清空查询 → 收起队列 → 隐藏主窗
- `Ctrl+Tab` / `switchFocus` 当前语义更接近“切到 staging 焦点”
- 参数弹层与安全确认层已经各自具备 focus trap

相关代码入口：

- 热键定义：`src/composables/app/useAppCompositionRoot/constants.ts`
- 主窗 `Esc`：`src/composables/launcher/useMainWindowShell.ts`
- 主窗口键盘分发：`src/features/hotkeys/windowKeydownHandlers/index.ts`
- 主窗口搜索 / staging 分区热键：`src/features/hotkeys/windowKeydownHandlers/main.ts`
- 参数弹层 focus trap：`src/components/launcher/parts/LauncherParamOverlay.vue`
- 安全确认层 focus trap：`src/components/launcher/parts/LauncherSafetyOverlay.vue`

## B4 的核心交互原则

### 1. 搜索上下文保留
- 打开 Review 时，用户仍能看到当前搜索词和结果轮廓。
- Review 不是完全切走的独立页面。

### 2. 只保留一个当前可交互层
- 搜索态：搜索区可交互，Review 不存在。
- Review 态：Review 可交互，背景搜索区仅作为上下文层存在。
- 安全确认 / 参数弹层：它们一旦打开，优先级高于 Review 和搜索态。

### 3. 高度先稳定，再动画
- 若当前搜索态内容高度不足以承载 Review，则先补足到 floor height。
- 然后再打开 Review Overlay。

### 4. 遮罩只在内部 shell
- 遮罩与 dim 只作用在内部圆角 shell。
- 绝不做整窗遮罩。

### 5. 拖拽区不是内容区
- 搜索框上方拖拽区不参与 Review 内容高度计算。
- Review 打开后也不能破坏拖拽区语义。

## 状态模型（推荐用正交状态描述）

B4 不建议再只用一个“页面状态”去描述全部交互，而是拆成 4 个正交维度。

## 1. 窗口可见状态

- `hidden`
- `visible`

说明：
- 主窗口未唤起时为 `hidden`
- 用户通过 launcher 热键唤起后为 `visible`

## 2. 搜索内容状态

- `idle`
- `results`

说明：
- `idle`：无查询，或查询为空
- `results`：有查询，结果抽屉打开

注：这里只描述搜索抽屉内容是否存在，不描述 Review。

## 3. Review 覆盖层状态

- `closed`
- `preparing`
- `opening`
- `open`
- `closing`

说明：
- `preparing`：正在计算 floor height、补 filler、同步窗口高度
- `opening`：内部 shell 已锁背景，Review 开始右滑进入
- `open`：Review 已成为当前唯一可交互层
- `closing`：Review 正在退出

## 4. 顶层阻断层状态

- `none`
- `param`
- `safety`

说明：
- `param`：参数弹层打开，优先级高于 Review
- `safety`：高风险确认层打开，优先级最高

## 推荐的组合状态理解

虽然内部实现建议用正交状态，但对产品和测试来说，可以理解为以下用户可见状态：

1. `Hidden`
2. `Search Idle`
3. `Search Results`
4. `Review Preparing`
5. `Review Open`
6. `Param Dialog`
7. `Safety Dialog`

## 层级优先级

从高到低：

1. `Safety Dialog`
2. `Param Dialog`
3. `Review Overlay`
4. `Search Shell`
5. `Window Background`

### 关键约束
- 上层打开时，下层不能响应输入。
- Review 打开时，背景搜索区不可点击、不可滚动、不可接受焦点。
- Safety / Param 打开时，Review 也只能作为视觉背景。

## B4 打开 Review 的状态机

### 事件：`OPEN_REVIEW_REQUEST`

来源：
- 点击 `queued` 摘要入口
- 触发 `toggleQueue` 热键（搜索态）
- 触发 `switchFocus` 热键（搜索态，兼容期）
- 其他显式“进入 Review”的动作

### Guard
- 当前窗口可见
- 当前不存在 `param` / `safety` 顶层阻断层
- 当前 `reviewOverlayState !== open/opening/preparing`

### Action 顺序

1. 锁定背景搜索区交互
2. 记录当前搜索态内容高度快照
3. 计算 `drawerFloorHeight = 322px`
4. 计算 `targetContentHeight = max(currentSearchContentHeight, 322px)`
5. 若当前高度不足：
   - 设置 `searchDrawerFillerHeight`
   - 触发窗口 resize
6. 进入 `reviewOverlayState = opening`
7. 内部 shell 渐显 dim 层
8. 右侧 Review Overlay 滑入
9. 焦点落到 Review 首个可操作项
10. 状态切为 `reviewOverlayState = open`

## 事件：`CLOSE_REVIEW_REQUEST`

来源：
- `Esc`
- 点击关闭按钮
- 点击允许关闭的 overlay 空白区（若最终保留该行为）

### Guard
- `reviewOverlayState === open`
- 当前不存在 `param` / `safety`

### Action 顺序

1. `reviewOverlayState = closing`
2. Review 右滑退出
3. 移除内部 shell dim
4. 焦点返回搜索态既有位置
5. Review 状态切回 `closed`
6. 是否回收额外高度：
   - 默认允许延后回收
   - 若后续验证稳定，可在关闭后回收

## 顶层阻断层状态机

## 事件：`OPEN_PARAM_DIALOG`

来源：
- 用户在搜索态对“需要参数”的命令执行立即执行/加入队列动作

### 规则
- `param` 打开时，优先级高于搜索态与 Review
- 若未来允许在 Review 中触发参数弹层，也遵循同样优先级
- `Tab` 在参数弹层内部循环
- `Esc` 关闭参数弹层，回到其来源层

## 事件：`OPEN_SAFETY_DIALOG`

来源：
- 执行高风险命令
- 执行高风险队列

### 规则
- `safety` 是全局最高优先级
- `Enter` 确认
- `Esc` 取消
- `Tab` 在确认层内部循环
- 安全确认关闭后，返回其来源层（搜索态或 Review）

## 键盘语义（B4 版）

## 一、全局优先级

优先级从高到低：

1. `Safety Dialog`
2. `Param Dialog`
3. `Review Open`
4. `Search State`

换句话说：
- 只要安全确认开着，就不要把按键分给其他层
- 参数弹层开着，也不要分给 Review 或搜索层

## 二、搜索态键盘表

| 热键 | 语义 | 备注 |
|------|------|------|
| `↑ / ↓` | 结果导航 | 仅在有结果时生效 |
| `Enter` | 执行当前结果 | 如需参数则进入 `Param Dialog` |
| `stageSelected` | 加入队列 | 默认 `ArrowRight` |
| `toggleQueue` | 打开 Review | 默认 `Tab`，仅搜索态承担此语义 |
| `switchFocus` | 打开 Review 并聚焦队列 | 默认 `Ctrl+Tab`，兼容期保留 |
| `executeQueue` | 执行队列 | 队列非空时可触发 |
| `clearQueue` | 清空队列 | 队列非空时可触发 |
| `Esc` | 分层后退 | 清空查询 ->（若无查询）隐藏主窗 |

### 关于 `toggleQueue` 与 `switchFocus`

B4 下，这两个键的语义不再完全相同于旧 staging 时代，但建议在第一阶段保留兼容：

- `toggleQueue`：搜索态下打开 Review
- `switchFocus`：搜索态下打开 Review，并把焦点直接放进 Review 列表

## 三、Review 态键盘表

| 热键 | 语义 | 备注 |
|------|------|------|
| `↑ / ↓` | 队列项导航 | 聚焦队列卡片 |
| `reorderUp / reorderDown` | 上下移动队列项 | 默认 `Alt+ArrowUp/Down` |
| `removeQueueItem` | 删除当前队列项 | 默认 `Delete` |
| `executeQueue` | 执行全部 | 默认 `Ctrl+Enter` |
| `clearQueue` | 清空队列 | 默认 `Ctrl+Backspace` |
| `Tab / Shift+Tab` | 在 Review 内部循环焦点 | 不再承担开关 queue 语义 |
| `Esc` | 关闭 Review | 返回搜索态 |

### B4 的一个重要变化
- **Review 打开后，`Tab` 应优先回归为标准焦点遍历键。**
- 也就是说：
  - 搜索态里，`toggleQueue` 默认仍可由 `Tab` 触发
  - Review 态里，`Tab` 不再关闭 Review，而是进行内部焦点循环

这点是 B4 的关键可达性改进。

## 四、Param Dialog 键盘表

| 热键 | 语义 |
|------|------|
| `Enter` | 提交参数 |
| `Esc` | 取消并关闭 |
| `Tab / Shift+Tab` | 在弹层内部循环 |

## 五、Safety Dialog 键盘表

| 热键 | 语义 |
|------|------|
| `Enter` | 确认执行 |
| `Esc` | 取消 |
| `Tab / Shift+Tab` | 在确认层内部循环 |

## 焦点恢复规则

### 关闭 Review 后
- 焦点应回到搜索输入框，或回到用户打开 Review 前的活动结果项
- 推荐第一阶段先简化为：回到搜索输入框
- 第二阶段若需要再优化为“恢复到上次 active result”

### 关闭 Param / Safety 后
- 回到其来源层
- 若来源层是 Review，则回到 Review 当前活动项
- 若来源层是搜索态，则回到搜索输入或当前结果项

## B4 的推荐实现事件名

后续实现时，建议引入更明确的事件和状态名：

### 状态名
- `reviewOverlayState`
- `reviewBackgroundLocked`
- `searchDrawerFillerHeight`
- `drawerFloorHeight`
- `reviewLastOrigin`

### 事件名
- `OPEN_REVIEW_REQUEST`
- `OPEN_REVIEW_CONFIRMED`
- `CLOSE_REVIEW_REQUEST`
- `OPEN_PARAM_DIALOG`
- `OPEN_SAFETY_DIALOG`
- `RESTORE_SEARCH_FOCUS`

## 迁移建议（从当前 staging 语义到 B4）

### 第一阶段：兼容迁移
- 数据结构继续沿用 `staging`
- 执行逻辑继续沿用 queue/staging 语义
- 但 UI 与交互文档统一改写为 `Review`

### 第二阶段：命名收敛
如果第一阶段验证稳定，再决定是否把以下命名统一迁移：

- `stagingExpanded` -> `reviewOpen`
- `stagingDrawerState` -> `reviewOverlayState`
- `focusZone` -> `interactionZone` 或更细粒度模型

## 手动验收清单

- [ ] 搜索态只有一个主交互区域
- [ ] Review 打开后，背景可见但不可交互
- [ ] `toggleQueue` / `switchFocus` 在搜索态都能进入 Review
- [ ] Review 打开后，`Tab` 在内部循环，而不是把焦点送回背景
- [ ] `Esc` 可以稳定关闭 Safety / Param / Review / Search 各层
- [ ] 关闭 Review 后焦点恢复符合预期
- [ ] 1 条结果时，Review 打开前会先补足 floor height
- [ ] floor height 的实现没有伪造假结果数据

## 给后续代码阶段的备注

### 优先做的不是动画，而是契约
先把下面 3 件事做正确：

1. 状态优先级
2. 焦点锁定与恢复
3. floor height + filler 的尺寸逻辑

### 动画属于第二优先级
- 动态 resize 可以先试
- 若抖动，则回退到一次性 resize + 内部过渡动画
- 不要让动画优先级高于交互稳定性
