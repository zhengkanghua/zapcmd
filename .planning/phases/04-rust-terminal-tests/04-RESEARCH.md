<user_constraints>
## User Constraints (from 04-CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- 若未来要对错误文案进行 i18n/本地化，需要同步调整拒绝路径测试策略（当前不锁定文案）。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support（如何支持落地） |
|----|------------------------------------|----------------------------------|
| RUST-01 | `src-tauri/src/terminal.rs` 关键 shell 参数/转义/边界行为具备单元测试覆盖（覆盖至少 1 个跨平台差异或高风险分支） | 将“命令构建/转义/拒绝路径/终端探测”拆为可断言的纯逻辑，并把 `cargo test --manifest-path src-tauri/Cargo.toml` 纳入 CI 门禁，确保三平台回归。 |
</phase_requirements>

## 现状盘点（基于仓库真实代码）

### 代码结构：`src-tauri/src/terminal.rs`
- 终端探测：
  - Windows：通过 `where` 探测 `powershell/pwsh/wt/cmd`，并从输出中取第一条非空路径（`trim` 后）作为 `TerminalOption.path`。
  - macOS：固定返回 `Terminal.app`，若 `/Applications/iTerm.app` 或 `/Applications/iTerm2.app` 存在则追加 `iterm2`。
  - Linux：通过 `which` 探测 `x-terminal-emulator/gnome-terminal/konsole/alacritty`，无命中则回退到 `x-terminal-emulator`。
- 终端执行：
  - Windows：根据 `terminal_id` 选择 `wt/cmd/pwsh/powershell`，并构造 argv（例如 `pwsh -NoExit -Command <command>`）。
  - macOS：将 `command` 做 `\\` 与 `"` 的转义后，拼接 AppleScript（`osascript -e <script>`），按 `terminal_id` 决定 `iTerm`/`Terminal`。
  - Linux：根据 `terminal_id` 选择终端程序，并统一以 `bash -lc <command>` 作为子命令；`gnome-terminal` 分支使用 `--` 分隔。
- 公共入口：
  - `run_command_in_terminal(terminal_id, command)` 会 `trim()` 并拒绝空白命令（返回 `Err`），随后进入平台分支并最终执行 `spawn()`。

### CI / 门禁现状
- `.github/workflows/ci-gate.yml`
  - `quality-gate`（Windows）运行 `npm run check:all`，其中 `check:rust` 仅为 `cargo check --manifest-path src-tauri/Cargo.toml`，**不会运行 Rust 单测**。
  - `cross-platform-smoke`（macOS/Ubuntu）仅运行 TS typecheck + Vitest + Vite build，**不包含 Rust toolchain 与 Rust 检查/测试**。
- `scripts/precommit-guard.mjs`
  - 检测到 Rust 变更仅追加 `cargo check --manifest-path src-tauri/Cargo.toml`，同样**不运行 Rust 单测**。

## 风险点（为什么 Phase 4 值得做）

1. **macOS AppleScript 转义风险（高）**：`run_command_macos()` 当前仅替换 `\\` 与 `"`，任何转义顺序/格式变化都会影响脚本正确性；必须用精确字符串断言锁定行为。
2. **Windows 多终端分支契约风险（高）**：`wt/cmd/pwsh/powershell` 的 argv 契约是“对外行为”的核心，且容易因重构/抽象误改。
3. **Linux argv 结构风险（中-高）**：`bash -lc <command>` 中 `<command>` 必须作为单参数传递；一旦被拆分会导致执行语义变化或注入面扩大（虽然产品本身允许执行命令，但行为必须可回归）。
4. **拒绝路径与 trim 行为风险（中）**：`trim()` + `is_empty()` 是边界校验核心；改动容易引入“空白绕过”或“误拒绝”。
5. **终端探测回退风险（中）**：`get_available_terminals()` 在不同机器/CI 环境差异大；如果测试直接依赖系统环境会导致 CI 不稳定，因此需要“可注入/可模拟”的测试切分。

## 推荐的最小可行 Rust 测试策略（确保 CI 稳定）

核心原则：**测试“命令构建契约”，避免真实 `spawn()` 打开交互式终端**（`/K`、`-NoExit` 会挂死/污染 CI）。

### 1) 测试切分：纯逻辑 vs 真实 spawn

推荐把 `terminal.rs` 内逻辑拆成两层（不改变外部行为）：
- **Layer A：纯函数/可观察构建（主要覆盖）**
  - “给定 terminal_id + command，构建出 (program, args)”。
  - “给定 command，生成 macOS osascript 的 script 字符串（含转义）”。
  - “给定 where/which stdout 文本，解析第一条非空路径”。
  - “给定探测结果（exists/path/文件存在），生成 TerminalOption 列表与回退行为”。
- **Layer B：真正执行（尽量薄）**
  - 仅保留 `spawn()` 与错误映射：`spawn().map_err(|e| e.to_string())?`。
  - 用 1 条专门测试覆盖“spawn 失败错误传播”（通过构造一个必定不存在的 program 来触发），避免打开任何真实终端。

### 2) 单测放置方式
- 建议在 `src-tauri/src/terminal.rs` 内新增 `#[cfg(test)] mod tests`，因为：
  - 可以直接访问 `TerminalOption` 私有字段（不必为测试引入公开 API）。
  - 可以在同文件内测试私有 helper（减少“为了测试而暴露接口”的风险）。

### 3) 断言策略（与 CONTEXT.md 对齐）
- Windows：断言 `program + args` 全量契约（严格）。
- macOS：断言生成的 AppleScript 字符串（严格，包含转义细节）。
- Linux：断言 argv 包含 `bash -lc` 且 `<command>` 是单个参数（严格）。
- 错误路径：只断言 `Err`，**不锁定错误字符串**。
- 终端探测：优先断言 `terminal_id` 集合与“回退必然存在”，不锁定 label/path/排序。

## Cross-platform 策略（如何让三平台都“真正在跑”）

### 目标
- Windows/macOS/Linux 三个平台都应至少运行对应 `cfg(target_os = ...)` 的单测，避免“写了但从未执行”的假覆盖。

### 建议方案（按优先级）
1. **CI 新增 Rust 单测 job（推荐，HIGH）**
   - 在 `.github/workflows/ci-gate.yml` 增加 `rust-unit-tests` job，matrix：`windows-latest` / `macos-latest` / `ubuntu-22.04`。
   - Linux job 复用现有发布工作流里的依赖安装（见 `.github/workflows/release-build.yml`）：`libgtk-3-dev`、`libwebkit2gtk-4.1-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`、`patchelf`。
   - 命令：`cargo test --manifest-path src-tauri/Cargo.toml`（可选加 `--locked`，视项目是否固定 Cargo.lock 策略）。
2. **或：把 Rust 单测塞进现有 `cross-platform-smoke`（可行但会变重，MEDIUM）**
   - 优点：不新增 job；缺点：Node smoke 任务会被 Rust 构建拖慢，且 Linux 仍需 apt 依赖安装。

## CI / 门禁需要改哪里（最小改动清单）

### 必做（让 CI 真正跑 Rust 单测）
- `package.json`
  - 方案 A（推荐）：新增 `test:rust`（`cargo test --manifest-path src-tauri/Cargo.toml`），并在 `check:all` 中插入 `npm run test:rust`（不动 `check:rust`，避免 precommit 变慢）。
  - 方案 B：直接把 `check:rust` 升级为 `cargo check + cargo test`（会让 `scripts/precommit-guard.mjs` 的 Rust 变更校验更慢）。
- `.github/workflows/ci-gate.yml`
  - 至少保证 `quality-gate`（Windows）会跑到 Rust 单测（通过 `npm run check:all` 或独立 step）。
  - 若要满足“三平台都跑到单测”，新增独立 `rust-unit-tests` matrix job（见上文）。

### 可选（本地提交前更早发现 Rust 回归）
- `scripts/precommit-guard.mjs`
  - 当命中高风险 Rust 目标（`src-tauri/src/terminal.rs` 等）时追加 `cargo test --manifest-path src-tauri/Cargo.toml`。
  - 注意：这会增加本地提交耗时；建议只在“高风险 Rust 目标”变更时触发，而不是任何 `.rs` 都触发。

## Standard Stack（用于 Phase 4 的“标准做法”）

- Rust：使用内置单元测试框架（`#[test]` + `cargo test`）（HIGH）。
- 断言方式：
  - 通过 `std::process::Command` 的可观察接口读取 `program/args`（例如 `get_program()` / `get_args()`）并做严格断言（HIGH）。
  - 字符串类契约（macOS AppleScript）使用 `assert_eq!` 直接对比（HIGH）。
- 依赖策略：
  - 默认不引入新 dev-dependencies（与 CONTEXT.md “尽量避免”一致）（HIGH）。
  - 若后续觉得断言 diff 可读性不足，可选 `pretty_assertions`（LOW：当前仓库未引入，属于体验优化而非必需）。

## Architecture Patterns（推荐的最小可测试性改造点）

目标：不改变现有外部行为，只把“构建”与“执行”分离，让测试无需 `spawn()`。

### Pattern 1：提取“命令构建”函数（核心）
- 新增内部 helper：`build_terminal_process(terminal_id: &str, command: &str) -> Result<std::process::Command, String>`
  - 负责 `trim()` + 空白拒绝
  - 负责按平台分支构建 `Command`（不 spawn）
- `run_command_in_terminal()` 只做：
  - 调用 `build_terminal_process(...)`
  - 调用统一的 `spawn_and_forget(cmd)`（见 Pattern 3）

### Pattern 2：终端探测逻辑可注入（避免环境依赖）
- 把 Windows/Linux 的 `command_exists/command_path` 调用从 `get_available_terminals()` 中抽离为“可传入依赖”的内部函数：
  - 例如 `resolve_terminals_windows(exists: impl Fn(&str)->bool, path: impl Fn(&str)->Option<String>) -> Vec<TerminalOption>`
  - 测试里传入 stub，稳定覆盖“包含哪些 terminal_id / 回退行为 / path 解析规则”
- 解析 `where/which stdout` 建议抽成纯函数（可在任意平台跑）：
  - `parse_first_non_empty_line(raw: &str) -> Option<String>`

### Pattern 3：统一 spawn 错误映射（为“spawn 失败传播”提供稳定测试点）
- 新增内部 helper：`spawn_and_forget(cmd: &mut std::process::Command) -> Result<(), String>`
  - 只做 `cmd.spawn().map(|_| ()).map_err(|e| e.to_string())`
  - 测试通过传入一个必不存在的 program（例如 `definitely-not-a-real-binary-...`）来覆盖错误传播，不会打开任何终端

## Don't Hand-Roll（避免踩坑的“不要自己造轮子”）

- 不要在单测里真正执行 `run_command_*()` 的 `spawn()` 分支来打开终端（会挂死 CI，或造成不可控 side effects）。
- 不要在单测里依赖 CI 环境是否安装 `wt/gnome-terminal/konsole/...` 来判断分支覆盖（不稳定、不可重复）。
- 不要把错误字符串当作强契约（CONTEXT.md 已明确“错误文案不锁定”）。
- 不要引入复杂 mock 框架来模拟 `std::process::Command`；优先用“构建函数返回 Command + 断言 program/args”的方式。

## Common Pitfalls（常见坑位清单）

1. **测试挂死**：Windows 的 `cmd /K`、`powershell -NoExit` 会保持会话不退出；如果测试真的 spawn 了，会导致测试永不结束。
2. **跨平台测试未执行**：仅在 Windows CI 跑 `cargo test` 时，macOS/Linux 的 `#[cfg(target_os = ...)]` 测试根本不会编译/执行；需要 CI matrix 或至少在 macOS/Ubuntu job 中跑 Rust 单测。
3. **OsStr 比较细节**：`Command` 的 program/args 为 `OsStr`；测试中建议统一转 `to_string_lossy()` 再比较，避免平台差异导致断言难写。
4. **转义断言脆弱但必要**：macOS AppleScript 字符串断言对细节敏感；一旦要改行为，必须先改测试并说明原因（这正是“行为契约”价值）。
5. **Linux 依赖缺失导致 CI 报错**：Ubuntu 跑 `cargo test` 可能需要 `libwebkit2gtk-4.1-dev` 等；仓库的发布工作流已经安装过这些依赖，可直接复用。

## Code Examples（用于 planner 拆任务时引用）

### 1) 将“构建”与“执行”分离（示意）
```rust
// 仅示意：真实签名/命名以代码落地为准
fn build_terminal_process(terminal_id: &str, command: &str) -> Result<Command, String>;
fn spawn_and_forget(cmd: &mut Command) -> Result<(), String>;
```

### 2) Windows program + args 契约断言（示意）
```rust
let cmd = build_terminal_process("pwsh", "echo 1")?;
assert_eq!(cmd.get_program().to_string_lossy(), "pwsh");
let args = cmd.get_args().map(|a| a.to_string_lossy().into_owned()).collect::<Vec<_>>();
assert_eq!(args, vec!["-NoExit", "-Command", "echo 1"]);
```

### 3) macOS 转义契约断言（示意）
```rust
let cmd = build_terminal_process("terminal", r#"echo "a\\b""#)?;
let script = cmd.get_args().last().unwrap().to_string_lossy().into_owned();
assert!(script.contains(r#"do script "echo \"a\\\\b\"""#));
```

### 4) spawn 失败错误传播（示意）
```rust
let mut cmd = Command::new("definitely-not-a-real-binary-xyz");
assert!(spawn_and_forget(&mut cmd).is_err());
```

## 给 planner 的明确建议（可直接转成计划/任务）

1. **建立 Rust 单测基线（terminal.rs 内）**
   - 新增 `#[cfg(test)]` 测试模块与少量共用 helper（argv 提取/字符串化）。
2. **最小可测试性重构：提取构建函数**
   - 提取 `build_terminal_process(...)`（或等价命名），让测试只验证构建结果，不触发 `spawn()`。
   - 保证 `run_command_in_terminal()` 行为不变：仍 `trim()`、仍拒绝空白、仍按平台分支执行。
3. **覆盖三平台高风险分支（按 cfg 分组）**
   - Windows：`wt/cmd/pwsh/powershell` 的 program+args 契约 + trim/拒绝路径。
   - macOS：AppleScript 生成与转义（包含 `\\` 与 `"`），覆盖 `iterm2`/默认分支。
   - Linux：`gnome-terminal/konsole/alacritty/x-terminal-emulator` 的 argv 结构（含 `bash -lc`），确保 `<command>` 单参数。
4. **终端探测（get_available_terminals）可控测试**
   - 抽离可注入的 resolver（exists/path/路径存在），覆盖：
     - “包含哪些 terminal_id”（集合断言）
     - “探测不到任何终端时的默认回退”
     - “where/which 输出解析第一条非空行并 trim”
5. **CI 门禁：让 Rust 单测真正执行**
   - 方案优先级：新增 `test:rust` 并纳入 `npm run check:all`；CI gate 增加 rust-unit-tests（matrix）以满足三平台覆盖。

## RESEARCH COMPLETE

