# 09. B4 Hotkey Migration Map

> 本文专门定义 B4 方案下的热键迁移策略。
> 目标不是立即重命名所有概念，而是先把“当前热键在 B4 下到底代表什么”讲清楚，避免实现阶段出现语义漂移。

## 文档目标

本文回答 4 个问题：

1. 当前主窗口默认热键是什么
2. 在 B4 第一阶段，这些热键的目标语义如何映射
3. 在 B4 第二阶段，哪些热键需要进一步收口
4. 后续代码与测试该落在哪些文件

## 适用范围

只讨论 **launcher 主窗口**。

不讨论：
- Settings 窗口内表单录制逻辑
- 全局 launcher 唤起热键之外的系统级快捷键
- Rust / Tauri 后端命令执行链路

## 当前默认热键基线

当前项目中，与主窗口高频交互相关的默认热键基线可归纳为：

| Hotkey ID | 当前默认值 | 当前文案语义 |
|-----------|------------|--------------|
| `launcher` | `Ctrl+V` / 用户可改 | 唤起窗口 |
| `toggleQueue` | `Tab` | 显示/隐藏暂存区 |
| `switchFocus` | `Ctrl+Tab` | 切换焦点区域 |
| `navigateUp` | `ArrowUp` | 上移选择 |
| `navigateDown` | `ArrowDown` | 下移选择 |
| `executeSelected` | `Enter` | 执行当前命令 |
| `stageSelected` | `ArrowRight` | 加入队列 |
| `escape` | `Escape` | 返回/隐藏窗口 |
| `executeQueue` | `Ctrl+Enter` | 执行队列 |
| `clearQueue` | `Ctrl+Backspace` | 清空队列 |
| `removeQueueItem` | `Delete` | 移除队列项 |
| `reorderUp` | `Alt+ArrowUp` | 队列上移 |
| `reorderDown` | `Alt+ArrowDown` | 队列下移 |

> 说明：默认值以当前测试与文案基线为主，后续若仓库默认值更新，以代码为准。

## 为什么需要迁移表

B4 方案下，最大的变化不是“新增热键”，而是：

- 旧时代的 `queue / staging` 是并列右栏
- B4 里的 `Review` 是 overlay 工作层

这会导致一些热键 **名字不变，但实际语义变了**。

最典型的两个就是：

- `toggleQueue`
- `switchFocus`

如果不单独立文档，后面很容易出现：
- 产品说的是 Review
- 文案写的是 queue
- 实现里还是 staging
- 测试里又按旧并列右栏逻辑断言

## 迁移原则

### 原则 1：先兼容，不立刻推翻旧名字
第一阶段允许：
- 数据结构继续叫 `staging`
- 某些设置项仍显示 `queue`
- 但用户实际体验已经切换到 B4 Review Overlay

### 原则 2：先稳定交互，再收口命名
优先保证：
- 热键行为正确
- 焦点层级正确
- Review 打开/关闭正确

命名与文案收口可以晚一波。

### 原则 3：搜索态与 Review 态分开定义
同一热键在不同状态下，允许拥有不同语义，但必须可预测、可解释。

## 第一阶段（B4-Stage 1）目标语义

> 第一阶段目标：不大规模改设置模型，不要求用户重新学习整套热键；优先让旧热键在 B4 下“行为正确”。

## 搜索态迁移表

| Hotkey ID | 当前名字 | B4 第一阶段语义 | 保留 / 修改 |
|-----------|----------|----------------|-------------|
| `toggleQueue` | 显示/隐藏暂存区 | **打开 Review Overlay** | 保留热键值，修改实际语义 |
| `switchFocus` | 切换焦点区域 | **打开 Review Overlay 并聚焦队列列表** | 保留热键值，修改实际语义 |
| `navigateUp` | 上移选择 | 搜索结果上移 | 保留 |
| `navigateDown` | 下移选择 | 搜索结果下移 | 保留 |
| `executeSelected` | 执行当前命令 | 执行当前选中结果 | 保留 |
| `stageSelected` | 加入队列 | 将当前结果加入队列 | 保留 |
| `executeQueue` | 执行队列 | 执行当前 Review/队列内容 | 保留 |
| `clearQueue` | 清空队列 | 清空当前 Review/队列内容 | 保留 |
| `escape` | 返回/隐藏窗口 | 分层后退：安全层 > 参数层 > 清空查询 > 隐藏主窗 | 保留 |

### 搜索态下的关键解释

#### `toggleQueue`
- 旧语义：显示/隐藏右侧并列暂存区
- 新语义：打开 B4 Review Overlay
- 这不是“错误”，而是结构升级后的语义迁移

#### `switchFocus`
- 旧语义：在搜索区与右侧 staging 焦点之间切换
- 新语义：直接打开 Review，并把焦点放到 Review 列表内部
- 兼容期内这样设计最自然，因为 B4 已不再存在“并列双焦点”场景

## Review 态迁移表

| Hotkey ID | 当前名字 | B4 第一阶段语义 | 保留 / 修改 |
|-----------|----------|----------------|-------------|
| `toggleQueue` | 显示/隐藏暂存区 | **关闭 Review Overlay**（可选，待实现确认） | 建议保留兼容 |
| `switchFocus` | 切换焦点区域 | Review 内部跳到列表首个活动项 / 关键区 | 建议弱化 |
| `navigateUp` | 上移选择 | Review 队列项上移焦点 | 保留 |
| `navigateDown` | 下移选择 | Review 队列项下移焦点 | 保留 |
| `executeQueue` | 执行队列 | 执行全部 | 保留 |
| `clearQueue` | 清空队列 | 清空全部 | 保留 |
| `removeQueueItem` | 移除队列项 | 删除当前选中项 | 保留 |
| `reorderUp` | 队列上移 | 当前项上移 | 保留 |
| `reorderDown` | 队列下移 | 当前项下移 | 保留 |
| `escape` | 返回/隐藏窗口 | 关闭 Review，回到搜索态 | 修改为更明确的 overlay 关闭语义 |

### Review 态下的关键解释

#### `Tab`
- 第一阶段起，`Tab` 在 Review 内应优先回归为标准焦点遍历
- 也就是说，`Tab` 不应再承担“开关 queue”这个角色

#### `toggleQueue` 是否在 Review 内关闭 overlay
建议：
- 第一阶段可兼容保留
- 这样用户仍然可以按同一个键开/关 Review
- 若后续觉得语义混乱，再在第二阶段收口

#### `switchFocus` 是否继续存在
建议：
- 第一阶段保留
- 但只把它当作 Review 内的焦点捷径，而不是“搜索区/队列区二元切换”
- 第二阶段可考虑弱化或彻底合并

## 第二阶段（B4-Stage 2）收口建议

> 第二阶段目标：在 B4 稳定后，让文案与热键语义更一致，减少历史 staging/queue 心智残留。

## 推荐收口方向

### 方案 1：最小收口（推荐）
- 保留热键 ID 不动
- 仅修改界面文案说明
- 例如：
  - `toggleQueue` 文案改为“打开/关闭 Review”
  - `switchFocus` 文案改为“进入 Review 并聚焦列表”

优点：
- 最少影响设置存储与兼容性
- 用户已有配置不受影响

### 方案 2：中度收口
- 代码内部继续保留旧 ID
- UI 文案和帮助文本全面改写为 Review 语义
- 开发文档中不再把 B4 称为 staging/queue focus 切换

优点：
- 工程风险较低
- 产品表达更统一

### 方案 3：完全收口（暂不推荐立即做）
- 将 `toggleQueue` / `switchFocus` 全面重命名到 `review` 语义
- 同步迁移设置项、文案、测试、帮助文本、存储映射

缺点：
- 影响面大
- 容易把本轮 B4 结构改造和命名迁移绑死在一起

## 推荐结论

建议采用：

- **第一阶段：方案 1 / 2 的混合体**
- **不立即做完全命名迁移**

也就是：
- 先让行为进入 B4
- 再逐步把用户可见文案收口到 Review
- 最后再视情况决定是否统一底层命名

## 实现建议

## 1. 热键处理层

主要关注：
- `src/features/hotkeys/windowKeydownHandlers/main.ts`
- `src/features/hotkeys/windowKeydownHandlers/index.ts`
- `src/composables/app/useAppWindowKeydown.ts`

建议：
- 增加 `OPEN_REVIEW_REQUEST` 语义入口
- `toggleQueue` / `switchFocus` 先都路由到 Review 打开逻辑
- 但在细节上区分是否把焦点直接放入 Review 列表

## 2. 文案层

主要关注：
- `src/i18n/messages.ts`

建议：
- 第一阶段先新增 B4 帮助文案，不急着删旧 queue 词汇
- 第二阶段再决定是否统一替换用户可见文案

## 3. 设置页层

主要关注：
- `src/components/settings/SettingsWindow.vue`
- `src/components/settings/parts/SettingsHotkeysSection.vue`
- `src/composables/settings/useSettingsWindow/viewModel.ts`

建议：
- 第一阶段只改说明，不改数据结构
- 热键字段 ID 继续沿用现有设置模型

## 4. 测试层

优先补和更新：
- `src/__tests__/app.hotkeys.test.ts`
- `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- `src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- `src/composables/__tests__/launcher/useMainWindowShell.test.ts`

### 推荐新增断言
- `toggleQueue` 在搜索态打开 Review
- `switchFocus` 在搜索态打开 Review 并直接聚焦队列列表
- Review 打开后，`Tab` 在内部循环，而不是回到背景
- `Esc` 在 Review 态优先关闭 Review，而不是直接隐藏主窗

## 用户学习成本判断

### 为什么第一阶段不急着改键位
因为对用户来说，真正难学的不是“键值”，而是“按下之后发生了什么”。

如果你们第一阶段同时做这三件事：
- 改结构
- 改文案
- 改默认热键

那学习成本会骤增。

更好的做法是：
- 先保持大部分键值不变
- 只让其行为迁移到 B4
- 等用户已经接受 Review 结构后，再考虑是否改默认说明或命名

## 推荐的最终策略

### 第一阶段（立刻执行）
- 保持现有 hotkey ID
- 保持大部分默认热键值
- 迁移实际行为到 B4
- 更新交互文档与测试

### 第二阶段（B4 稳定后）
- 统一用户可见文案
- 弱化 staging / queue 历史措辞
- 必要时再考虑是否迁移底层命名

## 一页结论

### 搜索态
- `toggleQueue` = 打开 Review
- `switchFocus` = 打开 Review 并聚焦列表

### Review 态
- `Tab` = 内部焦点循环
- `Esc` = 关闭 Review
- `toggleQueue` = 可兼容关闭 Review

### 暂不做
- 暂不立即改 hotkey ID
- 暂不立即改设置存储模型
- 暂不立即统一 staging -> review 全量重命名

## 手动验收清单

- [ ] 搜索态按 `toggleQueue` 能打开 Review
- [ ] 搜索态按 `switchFocus` 能打开 Review 并进入列表焦点
- [ ] Review 内 `Tab` 是标准焦点循环
- [ ] Review 内 `Esc` 是关闭 overlay，而不是隐藏主窗
- [ ] Settings 中的热键说明不会误导为旧并列右栏模型
- [ ] 文案与实际行为在第一阶段至少不冲突
