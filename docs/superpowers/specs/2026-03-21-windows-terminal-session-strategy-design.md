# Windows 终端新开/复用策略设计

> 日期：2026-03-21
> 状态：设计已确认，待规划
> 范围：Windows 下 Launcher 单命令 / 执行流终端拉起策略、`tauri:dev` 宿主控制台脱离、`wt` 应用自管窗口复用
>
> 明确不在本轮范围：
> - `adminRequired` 的真实 UAC / `runas` 提权
> - 传统控制台（`powershell` / `pwsh` / `cmd`）窗口复用
> - 接管或复用用户手动打开的任意终端

---

## 1. 背景与问题

当前桌面端命令执行链路已经能够：

1. 从 Settings 读取用户设置的默认终端；
2. 在 Launcher 中执行单条命令或执行流批量命令；
3. 把最终命令通过 Tauri 命令下发到 Rust 端，再由系统启动对应终端。

但在 Windows 上仍有两个关键体验问题：

1. `npm run tauri:dev` 从 VSCode 集成终端启动时，`powershell` / `pwsh` / `cmd` 往往直接复用宿主控制台，导致看起来不像桌面应用在“打开终端”；
2. 终端拉起策略完全依赖系统默认行为，ZapCmd 自己没有“新开还是复用”的稳定产品语义。

用户希望建立一个明确且一致的规则：

1. 始终以 **Settings 中当前选中的默认终端** 为准；
2. 如果该终端类型支持应用自管复用，则复用 ZapCmd 自己上次拉起且仍存在的终端；
3. 如果该终端类型不支持复用，则始终新开独立终端；
4. `tauri:dev` 与 release 的终端体验应尽量一致，不能因为从 VSCode 启动就退化到吃宿主控制台。

---

## 2. 方案选择

评估 3 种思路后，选择 **方案 A：混合式终端会话管理**。

| 方案 | 思路 | 结论 |
|---|---|---|
| A. 混合式终端会话管理 | `wt` 复用应用自管窗口；`powershell` / `pwsh` / `cmd` 统一强制新开 | **采用** — 能稳定解决 `tauri:dev` 问题，同时把“复用”限制在最容易做稳的终端上 |
| B. 所有终端统一复用 | 传统控制台和 `wt` 都做窗口发现、状态跟踪与命令回投 | 否决 — 传统控制台复用成本高、误判风险大、测试困难 |
| C. 只修 `tauri:dev` 脱离宿主控制台 | 所有终端都统一新开，不做复用 | 否决 — 不能满足“上次开的终端还在就复用”的产品诉求 |

采用方案 A 后，产品语义会变成：

1. `wt`：复用 **ZapCmd 自己管理的固定窗口**；
2. `powershell` / `pwsh` / `cmd`：始终新开独立控制台窗口；
3. 所有策略都以用户当前设置的默认终端为准，不写死具体终端。

---

## 3. 用户确认的产品语义

### 3.1 唯一输入：Settings 中的默认终端

ZapCmd 不新增“执行时覆盖终端类型”的入口。

执行时始终读取当前 Settings 里的 `defaultTerminal`：

1. 用户切到 `wt`，后续命令按 `wt` 策略执行；
2. 用户切到 `powershell` / `pwsh` / `cmd`，后续命令立即按对应策略执行；
3. 终端策略切换不需要重启应用。

### 3.2 “复用终端”的真实含义

本轮“复用”只定义为：

> 复用 **ZapCmd 自己上次拉起且仍存活的终端宿主窗口**。

它**不**等价于：

1. 复用用户手动打开的任意终端；
2. 复用系统中“看起来像同类”的某个终端窗口；
3. 复用上一次 tab 内部的 shell 会话并把命令直接注入已有提示符。

### 3.3 `wt` 的复用语义

对 `wt`，ZapCmd 维护一个固定窗口标识，例如：

```text
zapcmd-main-terminal
```

执行时总是向这个固定窗口标识发送命令：

1. 如果窗口存在，则在该窗口内新开 tab 执行；
2. 如果窗口不存在，则由 `wt` 自动按同一标识创建窗口；
3. ZapCmd 不自己维护 `wt` 窗口句柄，也不扫描其他 `wt` 窗口。

因此，“复用”指的是：

> 后续命令进入同一个 ZapCmd 管理的 Windows Terminal 窗口，而不是每次创建一组彼此无关的新窗口。

### 3.4 传统控制台的行为

对 `powershell` / `pwsh` / `cmd`：

1. 第一版统一只保证 **新开独立控制台**；
2. 不做窗口复用；
3. 不做命令注入；
4. 不允许因为 `tauri:dev` 从 VSCode 启动就退化为复用宿主控制台。

### 3.5 单条命令与执行流

单条命令与执行流批量命令继续复用当前统一执行链路：

1. 单条命令：一次执行对应一次终端投递；
2. 批量命令：整批命令仍然先拼成一个 payload，再只投递一次；
3. 如果默认终端是 `wt`，整批命令在同一个 ZapCmd 管理窗口中新开一个 tab 执行；
4. 如果默认终端是传统控制台，则整批命令在一个新开的独立窗口里执行。

---

## 4. 架构设计

### 4.1 前端职责保持不变

前端继续只负责：

1. 读取 Settings 中的 `defaultTerminal`；
2. 构造单条或批量命令 payload；
3. 调用统一的 Tauri 执行命令。

前端**不新增**终端复用判断，也不保存终端会话状态。

### 4.2 Rust 端新增 Windows 终端策略层

在 `src-tauri/src/terminal.rs` 的 Windows 分支引入一个薄策略层，例如：

```rust
enum WindowsTerminalStrategy {
    ReuseManagedWtWindow,
    AlwaysOpenNewConsole,
}
```

由 `terminal_id` 决定策略：

1. `wt` -> `ReuseManagedWtWindow`
2. `powershell` / `pwsh` / `cmd` -> `AlwaysOpenNewConsole`
3. 未来若新增终端类型，可继续在此层扩展

### 4.3 应用自管 `wt` 会话

对 `wt`，不保存 PID，不做窗口枚举，而是把“应用自管会话”收敛成固定窗口 ID：

```text
wt -w zapcmd-main-terminal new-tab ...
```

原因：

1. `wt` 官方已经提供以窗口 ID/名称路由命令的能力；
2. 让 `wt` 自己决定“命中现有窗口还是创建新窗口”比我们自己追踪窗口句柄更稳定；
3. 这能把“会话状态”从 ZapCmd 内部状态机收敛为一个常量约定。

### 4.4 传统控制台统一强制新开

对 `powershell` / `pwsh` / `cmd`：

1. 不再使用当前完全依赖系统默认控制台继承的启动方式；
2. 统一带上“创建新控制台”的 Windows 创建标志；
3. 让 `tauri:dev` 和 release 都表现为“桌面应用主动拉起新终端”。

这一步的目标不是复用，而是消除宿主控制台耦合。

---

## 5. Windows 启动 Contract

### 5.1 `wt`

`wt` 使用固定窗口 ID + 新 tab：

```text
wt -w zapcmd-main-terminal new-tab cmd /K <command>
```

说明：

1. 当前仓库已经对 `wt` 使用 `new-tab` 语义；
2. 本轮只是在此前面补上固定窗口 ID；
3. 这样第一次执行会创建 ZapCmd 管理窗口，后续执行会继续落到同一个窗口里。

### 5.2 `cmd`

`cmd` 继续使用 `/K` 保留窗口，但必须显式强制新控制台：

```text
cmd /K <command>
```

并附带 Windows 新控制台创建标志。

### 5.3 `powershell` / `pwsh`

`powershell` / `pwsh` 继续使用：

```text
-NoExit -Command <command>
```

同样附带 Windows 新控制台创建标志，确保：

1. `tauri:dev` 不复用 VSCode 集成终端；
2. release 直接双击启动时仍然保持独立窗口行为。

---

## 6. 数据流

### 6.1 单条命令

```text
Launcher
  -> useTerminalExecution
  -> commandExecutor.run({ terminalId, command })
  -> invoke("run_command_in_terminal", { terminalId, command })
  -> WindowsTerminalStrategy::from(terminalId)
  -> 按策略启动/路由终端
```

### 6.2 批量命令

```text
Flow 执行
  -> useTerminalExecution.runCommandsInTerminal(renderedCommands)
  -> 组装批量 payload
  -> commandExecutor.run({ terminalId, command })
  -> Rust 端按同一策略执行
```

区别只在 payload 内容，不在终端策略本身。

---

## 7. 与 `tauri:dev` 的关系

### 7.1 当前问题

`tauri:dev` 运行的是 debug 版桌面进程，当前 Windows 分支没有强制新控制台标志，因此：

1. 如果 ZapCmd 从 VSCode 集成终端启动；
2. 再调用 `powershell` / `pwsh` / `cmd`；
3. 子进程就可能直接复用宿主控制台。

这会让用户误以为 ZapCmd 没有“打开终端”。

### 7.2 本轮目标

本轮改造后，`tauri:dev` 下也必须满足：

1. `wt`：进入固定窗口 ID 对应的 ZapCmd 管理窗口；
2. `powershell` / `pwsh` / `cmd`：始终新开独立控制台；
3. 不再因为从 VSCode 启动就吃宿主控制台。

这意味着 dev 行为不再依赖外部启动器，而由 ZapCmd 自己保证。

---

## 8. 错误处理与边界情况

### 8.1 `wt` 不可用

如果用户设置了 `wt` 但运行时不可用：

1. 保持当前错误上抛链路；
2. 前端继续显示终端不可用的执行反馈；
3. 本轮不做“自动降级到其他终端”的隐式切换。

原因：设置中的默认终端是用户显式选择，失败应直面，而不是悄悄换终端。

### 8.2 用户执行时切换默认终端

若用户在 Settings 中修改默认终端：

1. 下次执行时立即生效；
2. 不影响已经打开的旧终端窗口；
3. ZapCmd 也不会主动关闭旧的 `wt` 管理窗口。

### 8.3 关闭 `wt` 管理窗口

如果用户手动关闭了 ZapCmd 管理的 `wt` 窗口：

1. ZapCmd 不需要显式感知“窗口已死”；
2. 下一次继续对同一固定窗口 ID 调用 `wt`；
3. 由 `wt` 自动新建同名窗口。

### 8.4 `adminRequired`

本轮只保留当前已有的前端确认语义，不改变其行为：

1. 仍然作为安全确认原因展示；
2. 不会触发真正的 UAC 提权；
3. 不会改变终端启动策略。

---

## 9. 测试策略

### 9.1 Rust 单元测试

新增或更新 Windows 分支测试，锁定：

1. `wt` 生成的命令参数包含固定窗口 ID 与 `new-tab`；
2. `powershell` / `pwsh` / `cmd` 走“新控制台”启动分支；
3. 空命令与现有错误处理语义不变。

### 9.2 TypeScript 单元测试

保持并补强以下 contract：

1. 终端执行仍然每次读取最新 `defaultTerminal`；
2. 单条命令与批量命令仍通过同一执行入口；
3. Settings 切换默认终端后，后续调用的 `terminalId` 立即切换。

### 9.3 人工验收

Windows 手工验收矩阵：

1. `npm run tauri:dev` 从 VSCode 启动，默认终端=`powershell`，执行命令，应弹独立 PowerShell，不得跑进 VSCode 控制台；
2. `npm run tauri:dev` 从 VSCode 启动，默认终端=`cmd`，执行命令，应弹独立 CMD；
3. 默认终端=`wt`，首次执行应创建 ZapCmd 管理窗口；
4. 默认终端=`wt`，再次执行应进入同一 `wt` 窗口，而不是再起一组无关窗口；
5. 执行流批量命令在三类终端下都只能触发一次终端投递；
6. Settings 中切换默认终端后，下次执行立即生效。

---

## 10. 风险与后续

### 10.1 本轮已接受的限制

1. `wt` 复用的是“窗口宿主”，不是“同一 tab 的 shell 会话”；
2. 传统控制台仍然不复用；
3. `adminRequired` 真提权留到后续专题。

### 10.2 后续可独立展开的专题

1. `adminRequired=true` 的真实 Windows UAC / `runas` 支持；
2. 传统控制台的应用自管复用；
3. `wt` 更细粒度的 tab/pane 路由策略；
4. 终端会话状态在 UI 中的可见反馈（例如“正在复用 ZapCmd Terminal”）。

---

## 11. 设计结论

本轮设计的核心收敛为：

1. **始终以 Settings 中当前默认终端为准**；
2. **`wt` 复用 ZapCmd 自己管理的固定窗口**；
3. **`powershell` / `pwsh` / `cmd` 统一强制新开独立控制台**；
4. **`tauri:dev` 也必须脱离 VSCode 宿主控制台**；
5. **不把管理员提权混入本轮目标**。

这样可以先把“终端由谁拉起、何时复用、dev 和 release 是否一致”三个核心问题收口成稳定 contract，再把管理员提权作为下一轮单独实现。
