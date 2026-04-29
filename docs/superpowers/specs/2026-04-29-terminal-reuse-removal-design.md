# 终端复用移除与管理员终端语义收口设计

> 日期：2026-04-29
> 状态：draft
> 范围：Settings 通用设置、前端执行 contract、Windows terminal runtime、settings schema / migration

---

## 1. 背景

当前项目的“终端复用”能力已经出现 3 个明显问题：

1. 产品语义和真实行为不一致。Settings 暴露了三档 `terminalReusePolicy`，且文案承诺“管理员终端也会复用”，但 Rust 运行时已经保守降级为“管理员终端永不复用”。
2. 用户心智混乱。队列执行实际上一直遵循“整队一次投递、同一终端、顺序执行”，是否复用只影响“下一次执行是否沿用上一个外部终端窗口”，但 UI 把二者混在同一设置里，容易让用户误以为混合权限队列会被拆开。
3. 可维护性差。当前只有 `wt` 有可寻址窗口模型，`pwsh` / `powershell` / `cmd` 仍是一次一开新 console。若继续保留“复用”功能，实际只会留下一个能力边界模糊、跨终端行为不一致的半成品。

本轮已确认的产品方向是：**彻底移除外部终端复用能力，未来若需要复用，再基于自研终端或受控 session host 重做。**

---

## 2. 目标与非目标

### 2.1 目标

1. 从产品层彻底移除“终端复用”能力与相关文案。
2. 保留并澄清两个真实有效的设置：
   - 默认终端
   - 始终使用管理员终端
3. 保持当前队列执行权限语义不变：
   - 队列任一步 `adminRequired=true` 时，整队统一走管理员终端。
4. 升级 settings schema，删除 `terminalReusePolicy` 持久化字段。
5. 删除前端、Rust 和测试中的复用状态、复用分支与死代码。

### 2.2 非目标

1. 本轮不建设自研终端或 session host。
2. 本轮不尝试让 `pwsh` / `powershell` / `cmd` 支持跨次窗口复用。
3. 本轮不改变队列反馈语义、preflight 机制或既有管理员权限判定规则。
4. 本轮不改变终端选择列表本身，只移除“复用”概念。

---

## 3. 方案比较

### 3.1 方案 A：只删 UI，保留底层复用代码

优点：

1. 改动面最小。
2. 短期内不需要重写 Rust 测试。

缺点：

1. 会保留一整套不可达或不再有入口的运行时代码。
2. 未来继续维护时很难区分“历史包袱”和“仍受支持能力”。
3. schema、前端 contract 与 Rust 状态仍然带着复用概念，产品事实源不干净。

### 3.2 方案 B：端到端移除复用能力

优点：

1. 产品语义、设置模型和运行时行为完全一致。
2. 可以同步删掉 `terminalReusePolicy`、Windows reusable session state 和相关测试负担。
3. 为后续“自研终端”保留干净起点，不再被旧抽象束缚。

缺点：

1. 改动面比“只删 UI”更大。
2. 需要做一次 schema 升级与迁移收口。

### 3.3 方案 C：保留抽象，为未来内置终端预留

优点：

1. 表面上更“前瞻”。

缺点：

1. 当前没有真实消费者，容易提前抽象。
2. 会把一次本该做减法的收口任务重新做复杂。

### 3.4 结论

选择 **方案 B：端到端移除复用能力**。

这符合当前产品阶段的最小真实能力边界：**支持选择外部终端，支持按需或始终管理员执行，但不再承诺跨次复用外部终端窗口。**

---

## 4. 设计决策

### 4.1 产品与设置层

Settings / 通用 / 终端区仅保留：

1. 默认终端
2. 当前终端路径
3. 始终使用管理员终端（仅 Windows 展示，保持现有平台边界）

删除项：

1. `terminalReusePolicy` 下拉框
2. 三档复用策略文案
3. “当前仅 Windows 生效”这类仅服务复用功能的提示

本轮完成后，产品层不再出现“复用普通终端”“复用管理员终端”“Windows-only reuse”这些概念。

### 4.2 Settings schema 与迁移

`SETTINGS_SCHEMA_VERSION` 从 `2` 升到 `3`。

变更点：

1. `PersistedSettingsSnapshot.general` 删除 `terminalReusePolicy`
2. 删除 `TerminalReusePolicy` 类型、默认值、normalize 与 store setter
3. 所有 v1 / v2 / legacy 快照迁移到 v3 时，统一**忽略并丢弃**旧 `general.terminalReusePolicy`

迁移原则：

1. 用户不需要手动操作。
2. 升级后回写的新快照中不再包含该字段。
3. 不做“保留旧字段但不再使用”的兼容层，避免长期拖尾。

### 4.3 前端执行 contract

前端执行 contract 只保留两个与权限相关的输入：

1. `requiresElevation`
2. `alwaysElevated`

删除：

1. `CommandExecutionRequest.terminalReusePolicy`
2. `useTerminalExecution` 对 settings `terminalReusePolicy` 的依赖
3. `commandExecutor` 向 Tauri payload 透传该字段的逻辑

不变项：

1. 单条执行仍按命令自己的 `adminRequired` 决定 `requiresElevation`
2. 队列执行仍按 `snapshot.some(item => item.adminRequired === true)` 聚合整队 `requiresElevation`
3. `alwaysElevatedTerminal=true` 时，单条和队列都统一走管理员终端

### 4.4 Rust 运行时简化

Windows terminal runtime 删除以下复用相关模型：

1. `AppState.windows_reusable_session_state`
2. `windows_routing::TerminalReusePolicy`
3. `windows_routing::WindowsReusableSessionState`
4. `reuse_existing_session`
5. `track_session_state`
6. `should_track_windows_reusable_session()`
7. `update_windows_reusable_session_state()`
8. `should_retry_windows_launch_without_reuse()`
9. `parse_terminal_reuse_policy()`

简化后保留的 Windows 执行事实：

1. 仍区分 `Normal` / `Elevated` 目标车道，因为这决定是否需要 `runas`
2. 终端程序仍来自当前选中的 terminal id
3. 每次执行都生成一份新的 launch plan
4. `wt` 仍可作为一个被选择的外部终端，但不再承担“复用宿主”职责

这意味着 `build_windows_launch_plan()` 不再需要“是否复用车道”输入，只需根据：

1. 终端程序
2. 命令内容
3. 目标权限态

来生成一次性启动计划。

### 4.5 保留不变的执行语义

本轮必须显式保留并锁定以下产品语义：

1. **队列是一次投递、同一终端、顺序执行**
2. **队列里只要有任一步需要管理员权限，整队统一走管理员终端**
3. **始终使用管理员终端** 只是把所有执行都抬到管理员车道，不影响“同一队列同一终端”的既有语义

这部分不是缺陷修复，不应在移除复用时被误删或回退。

### 4.6 文档与历史事实源

已有文档里凡是把“终端复用”描述为当前产品能力的内容，都需要更新或注明已废弃。尤其是：

1. Settings 文案
2. 与 `terminalReusePolicy` 相关的测试断言
3. `active_context` 中关于“普通 `wt` 可复用”的当前事实

历史设计文档可以保留，但不能继续被当作当前产品事实源引用。

---

## 5. 风险与防回归点

### 5.1 schema 升级回归

风险：旧本地快照升级后读取失败或字段遗漏，导致 settings 初始化异常。

防回归：

1. 增加 v2 -> v3 迁移测试
2. 增加 legacy payload 忽略旧字段测试
3. 保持默认终端与管理员开关旧值不丢失

### 5.2 队列提权语义被误伤

风险：删复用链路时，把 `requiresElevation` 聚合或 `alwaysElevated` 透传一并删错。

防回归：

1. 保留单条执行 `adminRequired` -> `requiresElevation` 测试
2. 保留队列 `some(adminRequired)` -> 整队提权测试
3. 保留 settings 恢复链路里 `alwaysElevatedTerminal` 能透传到执行器的测试

### 5.3 Windows 启动路径改坏

风险：删除 reuse fallback 后，`wt/cmd/pwsh` 新启动路径被误改。

防回归：

1. Rust 纯逻辑测试覆盖 `wt` / `cmd` / `pwsh` 的 launch plan
2. 保留管理员取消 / 提权失败的结构化错误映射测试

---

## 6. 测试策略

本轮至少需要覆盖以下层级：

### 6.1 前端 / Store

1. settings 默认快照不再包含 `terminalReusePolicy`
2. migration 把带旧字段的快照迁到 v3
3. `SettingsGeneralSection` 不再渲染复用策略 UI
4. `useTerminalExecution` / `commandExecutor` payload 不再包含该字段

### 6.2 前端 / 执行语义

1. 单条执行仍透传 `requiresElevation`
2. 队列执行仍按任一步 `adminRequired` 聚合整队提权
3. `alwaysElevatedTerminal` 仍能覆盖普通命令执行路径

### 6.3 Rust / Windows runtime

1. 不再存在复用路由与 reusable session state 相关断言
2. `wt/cmd/pwsh` 启动计划仍可正确构建
3. 提权错误映射保持不变

---

## 7. 后续演进边界

如果未来要恢复“终端复用”，不应在当前抽象上补丁式回填，而应走新设计：

1. 要么只支持受控宿主（例如自研终端）
2. 要么引入明确的 session host / IPC / 探活协议
3. 不再把“能否命中一个外部已打开窗口”当作通用终端能力来建模

本轮设计的目标正是把系统收回到这个干净边界之内。
