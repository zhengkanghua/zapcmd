# builtin prerequisite 审计与 shell 最小闭环设计

> 日期：2026-04-01
> 状态：设计确认后实施
> 范围：builtin prerequisite 误拦截收口、`shell` 最小可用支持、authoring 规则补强

---

## 1. 背景

当前 builtin prerequisite 已进入真实 preflight 链路，但 builtin 数据与 probe 能力之间仍有明显错位：

1. builtin 命令共 `379` 条，全部都带了 prerequisite。
2. prerequisite 分布为：
   - `binary = 405`
   - `shell = 25`
   - `env/network/permission = 0`
3. Rust probe 当前真实支持 `binary/env`，此前 `binary:ipconfig` 前缀误判已修复。
4. `shell` 仍未完成闭环，之前统一返回 `unsupported-prerequisite`。
5. runtime loader 仍会报告 `shell field is ignored at runtime`，说明“命令声明壳类型”尚未驱动执行路由。

进一步审计 builtin 生成产物后，已确认至少两类问题：

### 1.1 明显错误的 binary prerequisite

这类 prerequisite 把 shell builtin 或 PowerShell cmdlet 当成“外部软件”检查，属于错误建模。已确认样本包括：

- `echo`
- `get-childitem`
- `get-content`
- `measure-object`
- `get-process`
- `get-psdrive`
- `stop-process`
- `get-nettcpconnection`
- `test-netconnection`
- `compress-archive`
- `expand-archive`

这类条目会直接制造“明明系统能跑，但 preflight 先拦掉”的误判。

### 1.2 generic shell prerequisite 过度建模

当前存在 `shell:shell` 这种 prerequisite。它表达的不是“外部依赖存在性”，而是“命令运行在普通 shell 上”这一事实，和 design 里“prerequisites 只表达外部依赖”不一致。

---

## 2. 目标

本轮目标只做“先止血、再收口”：

1. 减少 builtin preflight 的误拦截。
2. 让 `shell` 不再因为“未实现”而一律阻断命令。
3. 明确 builtin prerequisite authoring 规则，避免继续写出错误建模。

本轮不做：

1. 不重做执行链。
2. 不在本轮实现“按命令自动切换终端/壳”。
3. 不补 `network/permission/env` 的完整 builtin 覆盖。

---

## 3. 设计决策

### 3.1 `binary` 只允许表达外部可执行依赖

保留 `binary` 的场景：

- `git`
- `docker`
- `kubectl`
- `curl`
- `python3`
- `ipconfig`
- `findstr`
- `netstat`

禁止写入 `binary` 的场景：

- shell builtin，例如 `echo`
- PowerShell cmdlet，例如 `Get-Content`
- 语法能力，例如 pipe、变量展开、重定向

### 3.2 generic shell 不再作为 builtin prerequisite

`shell:shell` 不属于“外部依赖存在性”，因此本轮从 builtin source 中移除。

### 3.3 `shell` probe 先补最小可用，不扩成完整路由器

本轮对 `shell` 的最小支持如下：

1. `shell:powershell` / `shell:cmd` / `shell:bash` / `shell:zsh`
   - 先按“对应 shell 可执行是否存在”检查。
2. `shell:shell`
   - 视为 generic shell，不再在 builtin 中使用；probe 层保留兼容，按 satisfied 处理。

这样做的目的不是把 shell 路由彻底做完，而是先避免 builtin 命令因为“类型未实现”而被一刀切阻断。

### 3.4 shell 自动切终端留作后续独立议题

由于当前执行链仍按 default terminal 派发，`powershell` prerequisite 只能证明“环境里有 PowerShell”，还不能证明“本次一定走 PowerShell 执行”。

这个问题保留为下一轮独立设计：

1. 命令级壳要求如何进入执行模型。
2. 单条与队列命令在 mixed-shell 场景下如何路由。
3. `command.shell` 与 prerequisite 的职责如何去重。

---

## 4. 实施范围

### 4.1 probe

修改 `src-tauri/src/command_catalog/prerequisites.rs`：

1. 为 `shell` 增加最小支持。
2. 保留 `network/permission` 继续返回 `unsupported-prerequisite`。

### 4.2 builtin source / generated runtime

修改以下 source 文件中的 prerequisite 声明：

1. `docs/command_sources/_dev.md`
2. `docs/command_sources/_file.md`
3. `docs/command_sources/_network.md`
4. `docs/command_sources/_system.md`
5. `docs/command_sources/README.md`

并刷新：

1. `assets/runtime_templates/commands/builtin/*.json`
2. `docs/builtin_commands.generated.md`

---

## 5. 验收标准

1. `shell` prerequisite 不再统一报 `unsupported-prerequisite`。
2. builtin 中不再把 `echo`、`Get-Content`、`Stop-Process` 之类误建模为 `binary` prerequisite。
3. builtin 中不再出现 `shell:shell`。
4. `git` / `docker` / `curl` / `ipconfig` 这类真正外部命令的 `binary` prerequisite 保持不变。
5. 所有相关测试和仓库总门禁通过。
