# 队列执行完成语义 / fresh preflight / session 脱敏 / Windows 管理员复用约束设计

> 日期：2026-04-28
> 状态：draft
> 范围：Launcher 队列执行 contract、执行前 prerequisite 复检、session 持久化脱敏、Windows 管理员终端复用边界

---

## 1. 背景

本轮基于运行时审计确认的 4 个真实问题收口：

1. 队列执行把“终端成功拉起”误报成“队列执行成功”，并在未知真实结果时提前清空队列。
2. 队列 prerequisite 只在入队时缓存，执行时不再 fresh probe，存在陈旧状态放行风险。
3. Launcher session 会把命令参数和渲染后的命令明文写入 `localStorage`。
4. Windows 管理员终端复用只依赖内存里的历史成功标记，缺少当前存活性证据。

本轮目标不是重做执行架构，而是先把错误语义和越界状态收回来。

---

## 2. 设计决策

### 2.1 队列成功只表示“整队完成且无失败”

队列执行 contract 改为：

1. Rust 端默认 fail-fast，某一步失败后停止后续步骤。
2. 前端 `queueSuccess` 只在“整队全部成功”时显示。
3. 新增设置项 `queueAutoClearOnSuccess`，默认 `true`。
4. 只有“整队成功 + 开关开启”时才清空队列。
5. 失败时一律保留队列，便于用户修正后重试。

### 2.2 preflight 缓存降级为展示层，真正执行前必须 fresh probe

`preflightCache` 的职责调整为：

1. 入队时继续生成缓存，用于 Flow 面板展示环境提示。
2. 点击“执行全部”时，对当前快照重新批量 probe prerequisite。
3. `required=true` 的失败阻断整队执行。
4. `required=false` 的失败仅作为 warning 附加到反馈中。
5. fresh probe 完成后，同步回写最新 `preflightCache`，避免 UI 长期显示旧结论。

### 2.3 session 持久化默认不落敏感参数

Launcher session 最小快照继续保留命令 identity，但删除明文敏感内容：

1. 不再持久化 `argValues`。
2. 不再持久化 `renderedPreview`。
3. 保留 `id`、`sourceCommandId`、`title`、`rawPreview` 作为最小可见恢复信息。
4. 恢复时若命令模板仍存在，则按当前 catalog 重建；参数恢复为空或默认值。
5. 模板缺失时继续恢复为 stale 且阻断执行。

这意味着重启后用户需要重新填写参数，这是有意的安全收口，不是回归。

### 2.4 Windows 管理员终端复用先保守降级

本轮不尝试实现“管理员会话探活协议”，先做保守修复：

1. 普通终端复用保持不变。
2. 管理员终端不再因为历史 `elevated=Some("wt")` 自动进入复用车道。
3. Windows `NormalAndElevated` 策略临时退化为“普通终端可复用，管理员终端每次重新提权”。
4. 后续如果要恢复管理员复用，必须补窗口/进程探活和权限态确认。

---

## 3. 测试策略

本轮必须先补红灯测试覆盖：

1. 队列成功/失败/自动清空开关。
2. 队列执行前 fresh preflight 复检和 required 阻断。
3. session 持久化不再包含 `argValues` / `renderedPreview`。
4. Windows `normal-and-elevated` 不再因为历史 elevated lane 直接复用管理员车道。
