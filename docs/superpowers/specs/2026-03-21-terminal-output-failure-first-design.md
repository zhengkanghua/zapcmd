# 终端输出失败优先状态设计

> 日期：2026-03-21
> 状态：已完成设计，待用户审阅
> 范围：Launcher / Flow 注入到终端的状态提示 contract
> 关联：本设计用于下一轮提示语义收口，补充并替代后续实现应遵循的 [旧设计](./2026-03-21-terminal-output-status-clarity-design.md)

---

## 1. 背景

当前实现已经把 Windows 终端提示统一成 `run / exit N`，并修复了 `cmd/wt` 失败后仍显示 `finished` 的误导语义。

但真实使用反馈表明，`exit 1` 这类文案对普通用户并不直观，容易被误读成：

1. 一条额外执行的 `exit` 命令；
2. 命令序号；
3. 报错正文的一部分。

同时，PowerShell / pwsh 下并非所有失败都有数值退出码：

1. 原生命令失败时，通常可从 `$LASTEXITCODE` 拿到数值；
2. PowerShell cmdlet 失败时，可能只有失败状态，没有可用数值退出码。

因此，下一轮提示设计不能再把 `exit N` 作为核心反馈，也不能假设所有失败都一定有 `code N`。

---

## 2. 设计目标

本轮设计目标是：

1. 用用户更容易理解的状态词表达结果，优先让人看懂“是否失败”；
2. 将数值退出码降级为可选诊断信息，而不是主文案；
3. 保留轻量命令摘要，确保用户能快速知道当前报错属于哪条命令；
4. 继续保持 stdout / stderr 原样直出，不做包装、不吞错、不重排；
5. 让单条命令、批量命令、队列汇总三层语义彼此一致，不再让“最后一步成功”掩盖前面步骤失败。

---

## 3. 输出 Contract

### 3.1 单条命令

单条命令采用“开始必显、成功静默、失败显式”的策略：

1. 命令开始时输出：`[zapcmd][run] <summary>`
2. 命令成功时不输出尾标；
3. 命令失败时输出：`[zapcmd][failed] <summary>`
4. 仅当当前终端能稳定拿到数值退出码时，失败尾标才追加：`(code N)`

示例 1：有退出码的失败

```text
[zapcmd][run] docker ps
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
[zapcmd][failed] docker ps (code 1)
```

示例 2：无退出码的失败

```text
[zapcmd][run] Get-Item definitely-not-exists
Get-Item: Cannot find path ...
[zapcmd][failed] Get-Item definitely-not-exists
```

该 contract 的核心含义是：

1. `run` 只表示“开始执行哪条命令”；
2. `failed` 直接表达用户最关心的结果；
3. `code N` 仅作为补充诊断信息存在；
4. 成功场景保持安静，减少终端噪音。

### 3.2 批量命令

批量命令沿用相同语义，但增加步骤序号：

1. 每一步开始时输出：`[zapcmd][step/total][run] <summary>`
2. 某一步成功时不输出尾标；
3. 某一步失败时输出：`[zapcmd][step/total][failed] <summary>`
4. 若当前终端能拿到退出码，则失败步骤追加 `(code N)`

示例：

```text
[zapcmd][1/3][run] git status
<原始输出>
[zapcmd][2/3][run] docker ps
<原始报错>
[zapcmd][2/3][failed] docker ps (code 1)
[zapcmd][3/3][run] node -v
<原始输出>
```

### 3.3 队列汇总

队列汇总不再复用“最后一步命令的退出状态”，而是表达整个队列的总体结果：

1. 全成功时输出：`[zapcmd][queue][done] total: N`
2. 存在失败时输出：`[zapcmd][queue][failed] total: N, failed: M`

示例：

```text
[zapcmd][queue][failed] total: 3, failed: 1
```

这样可以避免“第 1 步失败、第 3 步成功、尾标却看起来成功”的再次误导。

---

## 4. 终端行为矩阵

### 4.1 PowerShell / pwsh

PowerShell / pwsh 的失败判断必须拆成两层：

1. 先判断命令是否失败；
2. 再判断当前是否存在可用数值退出码。

设计约束：

1. 原生命令失败时：
   - 输出 `[failed]`
   - 若 `$LASTEXITCODE` 可用，则追加 `(code N)`
2. PowerShell cmdlet 失败时：
   - 输出 `[failed]`
   - 若 `$LASTEXITCODE` 为空，则不追加 `(code N)`

这样可以覆盖以下真实场景：

1. `cmd /c exit 5`：失败，且有 `code 5`
2. `Get-Item definitely-not-exists`：失败，但没有稳定数值 code

### 4.2 cmd / wt

`cmd` / `wt` 继续依赖真实 `ERRORLEVEL`：

1. 开始时输出 `[run]`
2. 成功时不输出尾标
3. 失败时输出 `[failed] <summary> (code N)`

由于 `cmd` 路径可以稳定拿到 `ERRORLEVEL`，因此 `cmd/wt` 的失败尾标默认应带 `code N`。

---

## 5. 命令摘要规则

命令摘要继续保持轻量，不引入额外命名系统：

1. 继续复用现有 `summarizeCommand` 规则；
2. 摘要仍然是单行、截断、终端安全字符；
3. 提示结构只调整语义词，不扩展为更复杂的标签体系；
4. 本轮不引入命令别名、图标、分类徽标或供应商特定语义。

---

## 6. 实现边界

本轮实现边界保持克制：

1. 仅修改前端提示 contract，目标文件仍是 `src/composables/launcher/useTerminalExecution.ts`
2. 不修改 `src-tauri/src/terminal.rs`
3. 不把 stdout / stderr 回收进 UI 再格式化
4. 不改命令本身执行顺序
5. 不新增命令级重试、提示翻译或“智能错误解释”

---

## 7. 风险与处理

### 7.1 PowerShell 失败但无 code

风险：
如果仍把 `code N` 当必填字段，PowerShell cmdlet 失败场景会出现假信息或空值污染。

处理：
`failed` 作为主结果；`code N` 改为可选附加字段。

### 7.2 队列尾标误导

风险：
若继续用最后一步状态代表整个队列，可能出现“前面失败、最后成功、队列却显示成功”的误导。

处理：
队列尾标改为按失败条数汇总，独立表达总体结果。

### 7.3 成功尾标噪音

风险：
所有成功命令都打印尾标，会显著增加终端噪音，稀释失败信息。

处理：
成功场景不输出尾标，只保留失败显式提示与队列汇总。

---

## 8. 测试策略

实现阶段按 TDD 锁定以下 contract：

1. `useTerminalExecution.test.ts`
   - PowerShell 成功：只有 `[run]`
   - PowerShell 原生命令失败：输出 `[failed] ... (code N)`
   - PowerShell cmdlet 失败：输出 `[failed] ...` 且无 `(code N)`
   - `cmd/wt` 失败：输出 `[failed] ... (code N)`
   - 批量全成功：队列尾标为 `[queue][done] total: N`
   - 批量部分失败：失败步骤输出 `[failed]`，队列尾标为 `[queue][failed] total: N, failed: M`
   - 前面失败、最后成功：队列仍必须是 `[queue][failed]`
2. App 级回归
   - 默认终端透传链路保持不变
   - 仅验证新的提示字符串仍沿执行链正确下发
3. 全量验证
   - `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
   - `npm run test:run -- src/__tests__/app.failure-events.test.ts`
   - `npm run check:all`

---

## 9. 非目标

本轮明确不做：

1. 把失败自动翻译成人类可读原因
2. 用不同颜色、图标或 UI 容器重新包装终端输出
3. 为不同命令家族设计专属状态词
4. 在成功场景补更多“完成”提示
5. 修改 Rust 终端拉起策略或默认终端选择逻辑

---

## 10. 设计结论

本轮最终设计为：

1. 保留 `[run]` 作为统一开始提示
2. 成功时不输出尾标
3. 失败时统一输出 `[failed] <summary>`
4. `code N` 只在可用时作为附加诊断信息出现
5. 批量命令与队列汇总改为“失败优先、人话优先、code 可选”

该方案比 `run / exit N` 更符合普通用户直觉，同时仍保留技术排障所需的关键信息。
