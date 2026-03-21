# Windows 管理员终端路由设计

> 日期：2026-03-21
> 状态：设计已确认，待规划
> 范围：Windows 下 `adminRequired` 命令/执行流的管理员终端路由、最近终端复用语义、UAC 取消/失败反馈、Settings 管理员终端开关
>
> 依赖前置能力：
> - `wt` 固定窗口复用
> - `powershell` / `pwsh` / `cmd` 的独立控制台启动
> - 现有命令模板中的 `adminRequired` 元数据
>
> 明确不在本轮范围：
> - 将 ZapCmd 主进程整体提升为管理员权限
> - macOS / Linux 的提权执行设计
> - 命令模板体系新增更多权限等级
> - 在同一执行流中跨普通终端 / 管理员终端拆分投递

---

## 1. 背景与问题

上一轮 Windows 终端策略已经收口了两件事：

1. `wt` 复用 ZapCmd 自己管理的固定窗口；
2. `powershell` / `pwsh` / `cmd` 强制新开独立控制台，避免 `tauri:dev` 复用 VSCode 宿主控制台。

但当前与 `adminRequired` 相关的行为仍然只有“安全提示语义”，没有真正的管理员终端路由：

1. 命令模板可以标记 `adminRequired=true`；
2. 前端会把它作为安全确认原因展示；
3. 运行时不会拉起管理员终端，也不会触发 Windows UAC；
4. 设置页与命令文档中存在“会请求提权”的描述，和实际行为不一致。

用户期望的新产品语义不是“提升 ZapCmd 自身权限”，而是：

1. ZapCmd 仍以普通权限运行；
2. 只有在命令执行时，按需拉起管理员权限终端；
3. 若已有可复用管理员终端，则继续复用管理员终端；
4. 若当前最近终端不是管理员，而命令或执行流需要管理员权限，则在执行层整体升权。

这意味着本轮真正要解决的是：

> 把“普通应用”与“管理员终端执行”分离开，并在不破坏现有终端复用 contract 的前提下，把管理员路由语义收口成稳定、可测试、可维护的状态机。

---

## 2. 方案选择

评估 3 种思路后，选择 **方案 A：单开关 + 最近终端路由 + 队列整体升权**。

| 方案 | 思路 | 结论 |
|---|---|---|
| A. 单开关 + 最近终端路由 | 只保留“始终调用管理员权限终端”；否则默认复用最近终端，但遇到 `adminRequired` 时整体升权 | **采用** — 规则最少，队列语义稳定，容易测试 |
| B. 双开关分权运行 | 再增加“命令分权运行”，普通/管理员命令走两套独立复用链 | 否决 — 状态组合多，UI 与执行层分支都更复杂，维护成本高 |
| C. 真正逐步分裂队列 | 队列内每一步按权限分别发到普通/管理员终端 | 否决 — 破坏当前“整队一次投递”的核心语义，也更容易出现顺序和反馈混乱 |

采用方案 A 后，管理员终端行为被收口为：

1. 单条命令：按当前策略决定是否整体升权；
2. 执行流队列：若任一步 `adminRequired=true`，则整条队列整体升权；
3. 一旦最近终端已经切到管理员终端，后续普通命令也继续复用该权限语义；
4. 最近权限态只在“成功投递后”更新，UAC 取消或启动失败都不改写状态。

---

## 3. 用户确认的产品语义

### 3.1 ZapCmd 主进程始终不提权

本轮目标不是把 ZapCmd 变成管理员应用。

明确规则：

1. ZapCmd 主进程仍以普通权限运行；
2. 管理员权限只出现在“被拉起的终端进程”上；
3. Windows 的 UAC 提示由系统自己弹出；
4. ZapCmd 只负责决定“这次应该把命令发到普通终端还是管理员终端”。

### 3.2 Settings 只保留一个管理员终端开关

新增设置项：

```text
始终调用管理员权限终端
```

默认值为 `false`。

行为定义：

1. 打开后，所有命令与执行流都通过管理员终端运行；
2. 关闭后，默认按最近终端复用；
3. 关闭时，如果当前命令或执行流需要管理员权限，则本次整体切到管理员终端。

本轮不再保留“命令分权运行”开关。

### 3.3 单条命令的路由语义

当 `alwaysElevated=false` 时：

1. 普通命令默认复用最近一次终端；
2. 若最近终端不存在，则按当前默认终端类型新开普通终端；
3. 若命令 `adminRequired=true` 且最近终端不是管理员终端，则新开或复用管理员终端；
4. 管理员终端一旦成功接管这次执行，它就成为新的“最近终端”。

因此：

1. 普通命令可以先落到普通终端；
2. 某次管理员命令会把最近终端切到管理员终端；
3. 切换后，后续普通命令也继续复用这个管理员终端。

### 3.4 执行流队列的语义

执行流保持当前“整队一次投递”的 contract，不在队列内部做权限拆分。

规则：

1. 队列中只要有任意一步 `adminRequired=true`，整条队列都视为需要管理员终端；
2. 队列整体升权后，在同一个管理员终端中顺序执行；
3. 不允许前几步在普通终端、后几步跳去管理员终端；
4. 这样可以维持现有输出收口、失败汇总和用户心智的一致性。

### 3.5 “最近终端”语义

Windows 端需要维护一个极小的运行态状态：

1. 最近一次成功投递使用的是普通终端还是管理员终端；
2. 对 `wt` 来说，还要能区分普通窗口 ID 和管理员窗口 ID；
3. 对传统控制台来说，“复用最近终端”复用的是“最近权限语义”，不是复用同一个控制台进程。

这一定义比“保存所有历史终端”更小，也足够满足产品需求。

### 3.6 最近权限态的生命周期

为保证行为稳定，最近权限态必须满足以下约束：

1. 仅保存在应用运行时内存中；
2. 只有当命令真正成功投递到目标终端时，才更新为新的权限态；
3. 如果 UAC 被取消或终端启动失败，则保持旧状态不变；
4. 应用重启后重置为 `null`，重新回到“尚无最近终端”的起点。

另外，用户手动关闭目标终端窗口时：

1. ZapCmd 不强制实时侦测“窗口已死”；
2. 下次仍按最近权限态路由到对应目标；
3. `wt` 由固定窗口 ID 机制负责“命中现有窗口或重建窗口”；
4. 传统控制台则按该权限态重新新开一个对应权限的新控制台。

---

## 4. 平台约束

### 4.1 Windows Terminal 的管理员窗口限制

Windows Terminal 不支持在同一窗口内混跑普通权限和管理员权限 tab。

这直接带来两个设计约束：

1. `wt` 必须有两套固定窗口标识：普通 / 管理员；
2. 命令一旦要走管理员终端，就必须路由到管理员窗口，而不是塞回现有普通窗口。

建议固定窗口标识如下：

```text
zapcmd-main-terminal
zapcmd-main-terminal-admin
```

### 4.2 Windows 提权方式

Windows 端管理员终端拉起必须使用系统级提权机制：

1. `ShellExecuteEx` / `runas`；
2. 由系统显示 UAC 弹窗；
3. 若用户取消，则视为“未执行”，不是普通命令运行失败。

### 4.3 不把终端类型差异扩散到前端

`wt`、`cmd`、`powershell`、`pwsh` 的差异必须收口在 Rust 的 Windows 路由层。

前端不应知道：

1. `wt` 需要两个窗口 ID；
2. 哪个终端用 `runas`，哪个终端走普通 `spawn`；
3. 如何判断最近权限态。

否则维护成本会迅速失控。

---

## 5. 架构设计

### 5.1 前端职责

前端只负责两件事：

1. 读取 Settings 中的 `defaultTerminal` 与 `alwaysElevatedTerminal`；
2. 计算本次执行是否 `requiresElevation`。

判断规则：

1. 单条命令：`requiresElevation = command.adminRequired === true`
2. 执行流队列：`requiresElevation = items.some(item => item.adminRequired === true)`

随后把以下数据交给 Tauri：

```ts
{
  terminalId,
  command,
  requiresElevation,
  alwaysElevated
}
```

前端不做任何“最近终端”或“终端权限态”的判断。

### 5.2 Rust Windows 路由层

Rust Windows 分支新增一层纯路由判断，核心输入为：

1. `terminal_id`
2. `command`
3. `requires_elevation`
4. `always_elevated`
5. `last_session_kind`

核心输出为：

1. 本次目标会话类型：`normal` 或 `elevated`
2. 具体终端启动计划
3. 若需要 UAC，则采用管理员启动分支

建议引入以下概念：

```rust
enum WindowsSessionKind {
    Normal,
    Elevated,
}

enum WindowsRoutePolicy {
    FollowLatest,
    AlwaysElevated,
}

struct WindowsRoutingInput {
    terminal_id: String,
    command: String,
    requires_elevation: bool,
    always_elevated: bool,
    last_session_kind: Option<WindowsSessionKind>,
}

struct WindowsRoutingDecision {
    target_session_kind: WindowsSessionKind,
    launch_plan: WindowsLaunchPlan,
}
```

### 5.3 路由规则

先把 UI 布尔开关收敛成稳定策略：

1. `alwaysElevated=true` -> `AlwaysElevated`
2. `alwaysElevated=false` -> `FollowLatest`

再做路由：

#### `AlwaysElevated`

1. 所有命令都进入管理员终端；
2. 若已有管理员终端可复用，则直接复用；
3. 若没有，则触发 UAC 并新开管理员终端；
4. 成功后把最近会话标记为 `Elevated`。

#### `FollowLatest`

1. 若 `requiresElevation=true`，则目标一定是管理员终端；
2. 若 `requiresElevation=false` 且已有最近会话，则直接沿用最近会话；
3. 若 `requiresElevation=false` 且没有最近会话，则目标为普通终端；
4. 成功后把最近会话更新为本次真实使用的权限态。

这个规则精确匹配用户要求：

1. 默认先走普通终端；
2. 需要管理员权限时整体升权；
3. 升权后普通命令也继续复用管理员终端。

### 5.4 终端类型差异收口

#### `wt`

1. 普通会话 -> `zapcmd-main-terminal`
2. 管理员会话 -> `zapcmd-main-terminal-admin`
3. 两条链都通过 `wt -w <window-id> new-tab ...` 进入各自窗口

#### `cmd`

1. 普通会话 -> 普通 `cmd.exe /V:ON /K ...`
2. 管理员会话 -> 通过 `runas` / `ShellExecuteEx` 启动管理员 `cmd.exe`

#### `powershell` / `pwsh`

1. 普通会话 -> 当前已有的新控制台启动分支
2. 管理员会话 -> 通过 `runas` / `ShellExecuteEx` 启动管理员 `powershell.exe` / `pwsh.exe`

对传统控制台：

1. 本轮仍不尝试复用同一个控制台进程；
2. “复用最近终端”只表示沿用最近权限语义；
3. 这能保证语义统一，而不会引入控制台窗口句柄追踪。

---

## 6. Windows 启动 Contract

### 6.1 `wt` 普通窗口

继续使用现有固定窗口复用语义：

```text
wt -w zapcmd-main-terminal new-tab cmd /V:ON /K <command>
```

### 6.2 `wt` 管理员窗口

当需要管理员权限时，路由到管理员窗口：

```text
wt -w zapcmd-main-terminal-admin new-tab cmd /V:ON /K <command>
```

但启动方式必须走管理员拉起分支，而不是普通 `spawn`。

### 6.3 传统控制台普通会话

保持当前独立控制台策略：

1. `cmd` -> `/V:ON /K <command>`
2. `powershell` / `pwsh` -> `-NoExit -Command <command>`
3. 同时保留当前“创建新控制台”标志

### 6.4 传统控制台管理员会话

管理员会话与普通会话使用同一套参数模板，但启动入口切到系统提权：

1. `cmd` -> 管理员 `cmd.exe`
2. `powershell` -> 管理员 `powershell.exe`
3. `pwsh` -> 管理员 `pwsh.exe`

这保证“终端内容 contract”与“权限拉起 contract”相互独立：

1. 命令 payload 如何拼装，不受提权实现影响；
2. 提权如何发生，也不污染现有 failure-first 输出逻辑。

---

## 7. 错误与反馈 Contract

### 7.1 结构化错误类型

Windows 管理员终端执行需要把错误收口成结构化类型，而不是让前端猜字符串。

建议错误语义至少包括：

1. `elevation-cancelled`
2. `elevation-launch-failed`
3. `terminal-launch-failed`

### 7.2 UAC 取消

如果系统 UAC 弹窗出现后用户点击取消：

1. 本次命令或队列不执行；
2. 前端收到 `elevation-cancelled`；
3. UI 明确提示“已取消管理员授权，本次未执行”；
4. 不应被归类为普通运行失败。

### 7.3 启动失败

如果管理员终端无法拉起：

1. 前端收到 `elevation-launch-failed` 或 `terminal-launch-failed`；
2. UI 应展示明确错误；
3. 不能假装命令已经发到终端，也不能复用“命令执行失败”的泛化文案。

### 7.4 成功复用

当管理员终端已经存在且本次成功复用时：

1. UI 不需要二次确认；
2. 仍保持现有“命令已发送到终端”的反馈；
3. 最近会话态更新为 `Elevated`。

---

## 8. Settings 与文案

### 8.1 新设置项

Settings General 中新增：

1. `始终调用管理员权限终端`

它应位于“默认终端”设置附近，因为两者共同定义运行目标。

### 8.2 文案要求

必须修正文案，避免误导成“ZapCmd 自身会提权”。

推荐语义：

1. 默认终端：命令优先发送到此终端
2. 始终调用管理员权限终端：开启后，所有命令都会通过管理员终端运行；关闭时，仅在命令或执行流需要管理员权限时才触发系统提权

### 8.3 文档同步

至少同步更新：

1. Settings 文案
2. `docs/command_sources/README.md` 的 `adminRequired` 说明
3. README 中 Windows 终端行为说明

---

## 9. 测试策略

### 9.1 TypeScript 单元测试

需要锁定：

1. 新设置的默认值、迁移与持久化；
2. 单条命令 `requiresElevation` 的传递；
3. 队列“任一步 `adminRequired` 则整队升权”的 contract；
4. 前端对结构化错误的反馈映射。

### 9.2 Rust 单元测试

需要锁定：

1. `alwaysElevated=true` 时所有终端都走管理员会话；
2. `requiresElevation=true` 时单条命令切到管理员会话；
3. 队列整体升权；
4. `FollowLatest` 下普通命令会跟随最近管理员会话；
5. `wt` 普通/管理员窗口 ID 分离；
6. `cmd` / `powershell` / `pwsh` 的普通/管理员启动分支正确；
7. UAC 取消与启动失败被映射为稳定错误类型。

### 9.3 手工验收

Windows 必须覆盖以下 smoke：

1. 普通命令首次执行，走普通终端；
2. 管理员命令首次执行，系统弹 UAC；
3. UAC 取消后，命令不执行且 UI 有明确提示；
4. 管理员命令成功后，后续普通命令继续复用管理员终端；
5. 开启“始终调用管理员权限终端”后，普通命令也直接走管理员终端；
6. 队列中只要包含 `adminRequired`，整队都在管理员终端执行；
7. `wt` 与 `powershell` / `pwsh` / `cmd` 都符合各自语义。

---

## 10. 可维护性要求

本轮实现必须以“规则少、边界清、分层明确”为优先级，而不是追求表面功能堆砌。

明确要求：

1. 前端只做布尔判定与参数透传，不做终端权限状态机；
2. Rust Windows 路由层必须是可单测的纯决策逻辑，不把状态判断散落到 `spawn` 代码里；
3. `wt` 与传统控制台的差异只能存在于一处中心路由，不允许到处复制 `if terminal_id == ...`；
4. 错误必须结构化，禁止靠文案字符串匹配驱动业务逻辑；
5. 队列语义必须保持“一次投递、同一终端、顺序执行”，不因提权引入隐式分裂。

这几条不是代码风格偏好，而是保证后续还能继续演进而不失控的必要条件。

---

## 11. 风险与后续

### 11.1 本轮已接受的限制

1. 传统控制台仍不做进程级复用；
2. 最近会话态主要服务于“最近权限语义”，不是完整的窗口会话管理；
3. macOS / Linux 的 sudo / pkexec 等提权体验不在本轮处理。

### 11.2 后续可独立展开的专题

1. 非 Windows 平台的提权终端体验；
2. 传统控制台真正的会话复用；
3. UI 中显式展示“当前最近终端为管理员终端”的状态提示；
4. 更细粒度的权限分级，而不只是 `adminRequired` 布尔值。

---

## 12. 设计结论

本轮采用：

1. **单管理员开关**
2. **最近终端复用**
3. **单条按需升权**
4. **队列整体升权**
5. **ZapCmd 主进程不提权**
6. **Windows 提权与终端差异统一收口在 Rust 路由层**

这样既满足用户对管理员终端的真实需求，又能把状态复杂度控制在可验证、可维护的范围内。

---

## 参考

1. Windows Terminal FAQ
   https://learn.microsoft.com/en-gb/windows/terminal/faq
2. Windows Terminal command line arguments
   https://learn.microsoft.com/en-us/windows/terminal/command-line-arguments
3. Launching Applications (Shell / `runas`)
   https://learn.microsoft.com/zh-cn/windows/win32/shell/launch
