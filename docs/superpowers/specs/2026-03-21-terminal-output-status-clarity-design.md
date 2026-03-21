# 终端输出状态与命令辨识设计

> 日期：2026-03-21
> 状态：待用户审阅
> 范围：Launcher / Flow 执行时注入到终端的提示文案 contract

---

## 1. 背景

当前终端执行链会在命令前后插入 `[zapcmd] executing:` / `[zapcmd] finished` 之类的提示。

现状有两个问题：

1. `cmd` / `wt` 路径不会输出退出码，命令失败后仍然打印 `finished`，容易误导用户；
2. 终端提示里的命令摘要过弱，用户不容易快速看清“这条报错对应的是哪一个命令”。

用户最新确认的目标是：

1. 使用更清楚但不过度装饰的状态标识；
2. 原始命令输出和原始报错必须完整保留，不做包裹式重写；
3. 重点修复状态语义错误与命令辨识问题，不顺手扩展成复杂终端 UI。

---

## 2. 设计目标

本轮终端提示 contract 收敛为：

1. 单条命令开始时输出 `run` 标识；
2. 命令结束时输出 `exit N` 标识，其中 `N` 为真实退出码；
3. 单条命令与批量命令都保留简短命令摘要，帮助定位当前输出属于哪条命令；
4. 不吞掉、不替换、不重排命令自身的 stdout / stderr；
5. 不再使用语义含混的 `finished` 作为成功/失败共用尾标。

---

## 3. 输出 Contract

### 3.1 单条命令

建议输出：

```text
[zapcmd][run] docker ps
<原始命令输出 / 原始命令报错>
[zapcmd][exit 1] docker ps
```

说明：

1. 开始标识只说明“开始运行哪条命令”；
2. 结束标识只说明“退出码是多少”，不额外下成功/失败结论；
3. 用户可以直接从退出码和原始报错判断问题。

### 3.2 批量命令

建议输出：

```text
[zapcmd][1/2][run] docker ps
<第 1 条命令原始输出>
[zapcmd][1/2][exit 1] docker ps
[zapcmd][2/2][run] docker info
<第 2 条命令原始输出>
[zapcmd][2/2][exit 0] docker info
[zapcmd][queue][exit 0] total: 2
```

说明：

1. 每一步都带序号，便于在长输出里回溯；
2. 队列尾标继续保留总数和最终退出码；
3. 批量路径同样不对命令本身输出做二次加工。

---

## 4. 终端差异策略

### 4.1 PowerShell / pwsh

继续用 `Write-Host` 输出提示，但尾标统一改为：

```text
[zapcmd][exit N] <summary>
```

其中 `N` 仍从 `$LASTEXITCODE` 读取。

### 4.2 cmd / wt

`wt` 当前仍走 `cmd /K` payload，因此与 `cmd` 共享同一套提示 contract。

本轮关键修正：

1. 不再用 `... & echo [zapcmd] finished`；
2. 改为在命令执行后显式输出 `%ERRORLEVEL%`；
3. 提示文案与 PowerShell 路径对齐为 `run / exit N`。

这样即使 `docker ps` 因 Docker daemon 未启动而失败，也会显示：

```text
[zapcmd][run] docker ps
failed to connect ...
[zapcmd][exit 1] docker ps
```

而不会再伪装成：

```text
[zapcmd] finished
```

---

## 5. 命令摘要规则

本轮不引入花哨命名或额外图标，只维持轻量摘要：

1. 继续基于现有 `summarizeCommand` 生成摘要；
2. 摘要仍然是单行、截断、适配各终端安全字符；
3. 仅调整提示结构，让摘要更靠近状态标识；
4. 不新增“命令别名库”或更复杂的语义识别。

这保证修复聚焦在可读性和准确性，而不是扩展成新的展示系统。

---

## 6. 非目标

本轮明确不做：

1. 重写或美化命令自身报错内容；
2. 把 stderr/stdout 收集回 UI 再格式化展示；
3. 根据退出码额外翻译成“成功 / 失败 / 警告”等高层状态；
4. 为不同命令族（如 Docker、Git、npm）设计专门标签；
5. 修改 Rust 终端拉起策略。

---

## 7. 测试策略

实现阶段按 TDD 补以下 contract：

1. `useTerminalExecution.test.ts`
   - 单条 `cmd/wt` 命令：应输出 `[zapcmd][run] ...` 与 `[zapcmd][exit %ERRORLEVEL%] ...`
   - 单条 `powershell/pwsh` 命令：应输出 `[zapcmd][run] ...` 与 `[zapcmd][exit $LASTEXITCODE] ...`
   - 批量命令：应输出 `[step/total][run]` / `[step/total][exit N]` / `queue` 尾标
2. `app.core-path-regression.test.ts`
   - 保持默认终端透传 contract 不变，只验证新提示结构仍沿执行链下发
3. 全量验证
   - `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
   - `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`
   - `npm run check:all`

---

## 8. 设计结论

本轮采用的最终方案是：

1. 用最小提示集统一成 `run / exit N`；
2. 单条和批量都保留命令摘要与步骤号；
3. 原始命令输出和原始报错保持原样直出；
4. 优先修复“失败却显示 finished”的误导问题；
5. 不把本轮扩展成复杂的终端美化工程。
