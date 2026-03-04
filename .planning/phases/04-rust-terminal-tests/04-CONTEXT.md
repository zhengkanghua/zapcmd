# Phase 4: Rust 终端执行模块单测 - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

为 `src-tauri/src/terminal.rs` 的高风险终端执行边界补齐 Rust 单元测试：覆盖跨 shell 参数/转义/拒绝路径，并确保在 CI 可稳定运行；不引入新的执行功能或 UI 能力。

</domain>

<decisions>
## Implementation Decisions

### 覆盖优先级
- 三平台都要有单测覆盖：Windows / macOS / Linux。
- Windows：`wt` / `cmd` / `pwsh` / `powershell`（default）四个分支全部覆盖。
- 跨平台差异/高风险分支重点：macOS `run_command_macos()` 的反斜杠与引号转义（生成 osascript 脚本）必须覆盖。
- 测试优先覆盖执行路径：`run_command_in_terminal()` + 各平台 `run_command_*()` 的分支与拒绝路径。

### 断言粒度
- Windows：对每个 `terminal_id` 断言 program + args 的完整契约。
- macOS：对 `osascript` 生成的 AppleScript 字符串进行精确断言（包含转义细节）。
- Linux：断言 argv 结构必须包含 `bash -lc <command>`，并确保 `<command>` 作为单个参数传递。
- 测试定位为“行为契约”：默认锁定当前行为，后续若需变更应显式更新测试。

### 拒绝/错误契约
- 全空白命令视为无效并走拒绝路径（与当前 `trim()` + `is_empty()` 行为一致）。
- 错误文案不作为强契约：拒绝路径测试只断言返回 Err，不锁定具体字符串。
- 需覆盖至少 1 条 `spawn()` 失败时的错误传播路径。
- 需要锁定 `trim()` 行为：前后空白不应改变拒绝判断与执行输入。

### 终端探测契约（get_available_terminals）
- 返回列表：优先锁定“包含哪些 `terminal_id`”而不是排序/label/具体 path。
- 回退行为需要锁定：当探测不到任何终端时必须返回默认项（Windows 为 powershell；其他平台同现有默认）。
- 路径解析规则需要覆盖：`where/which` 输出取第一条非空行并 `trim`。
- 非 Windows（macOS/Linux）探测也需要覆盖至少 1 个关键分支或回退，保证三平台都有回归保护。

### Claude's Discretion
- 具体测试用例集合（命令字符串样例、边界输入组合）的最小闭环。
- 是否为可测试性做小范围重构（不改变外部行为），以及是否需要引入 Rust dev-dependencies（尽量避免）。

</decisions>

<specifics>
## Specific Ideas

无特定外部参考 — 以“高风险边界可回归”为第一优先级。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src-tauri/src/terminal.rs`: 目标文件，包含 `get_available_terminals()`、`run_command_in_terminal()` 以及各平台 `run_command_*()` 分支。
- `src-tauri/src/lib.rs`: Tauri `invoke_handler` 注册了 `get_available_terminals` / `get_runtime_platform` / `run_command_in_terminal`。

### Established Patterns
- Repo 现有测试主要在前端（Vitest），Rust 侧当前无明显单测模式；需要建立 Rust 单测基线（建议先让命令构建可观察/可断言，再做分支覆盖）。

### Integration Points
- 前端通过 `src/services/commandExecutor.ts` 调用 `invoke(\"run_command_in_terminal\", ...)`，`src/services/tauriBridge.ts` 调用 `get_available_terminals` / `get_runtime_platform`；Rust 侧接口为 Tauri commands。

</code_context>

<deferred>
## Deferred Ideas

- 若未来要对错误文案进行 i18n/本地化，需要同步调整拒绝路径测试策略（当前不锁定文案）。

</deferred>

---

*Phase: 04-rust-terminal-tests*
*Context gathered: 2026-03-04*
