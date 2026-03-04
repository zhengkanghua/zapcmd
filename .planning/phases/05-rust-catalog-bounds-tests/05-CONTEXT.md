# Phase 5: Rust 命令目录与边界模块单测 - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

为 `src-tauri/src/command_catalog.rs` 与 `src-tauri/src/bounds.rs` 补齐 Rust 单元测试：把用户命令目录读取/扫描规则、以及主窗口 bounds（回退/夹取/随鼠标屏居中）等关键行为锁定为可回归契约；不引入新的命令格式、配置项或 UI 形态变更。

</domain>

<decisions>
## Implementation Decisions

### 用户命令目录：路径与创建
- 用户命令目录对外契约固定为 `<home>/.zapcmd/commands`。
- 目录不存在时自动创建（首次使用自动初始化）。
- Windows home 解析回退顺序锁定：`USERPROFILE` 优先，其次 `HOMEDRIVE+HOMEPATH`；都不可用则报错。
- 目录解析/创建失败的错误信息需包含可行动信息（原因 + 目标路径）；单测只断言关键片段，不做全量字符串锁死。

### 扫描规则与返回顺序
- 递归扫描整个命令目录树，允许用子目录组织命令文件。
- 仅收集 `.json` 文件，扩展名大小写不敏感（`.json` / `.JSON` 等）。
- 返回顺序锁定为“按完整路径字符串排序后返回”，保证跨平台稳定。
- 目录为空/无 `.json` 时成功返回空数组。

### 失败处理与 modifiedMs
- 读取任意目录/文件失败时 Fail-fast：直接返回 Err，中断整体读取（不做部分成功）。
- `modified_ms` 获取失败时回退为 `0`，不因时间戳不可得而阻塞。
- Rust 层不做 JSON 合法性校验：文件内容原样返回，由前端 runtimeLoader 统一解析并产出 issues。

### 主窗口 bounds：回退与夹取契约
- 显示主窗口时遵循“在哪触发就在哪块屏出现”：鼠标在另一屏幕时，窗口移动到鼠标所在屏并居中。
- 恢复保存位置时，若保存了 `display_name` 且当前存在同名屏幕，则优先按该屏幕进行 clamp。
- 若保存坐标不在任何屏幕内，则居中到主屏（primary）；无主屏时居中到第一个可用屏幕。
- 坐标越界/尺寸导致出屏时采用 clamp，保证窗口完全可见。

### Claude's Discretion
- 具体 Rust 单测用例矩阵（最小覆盖集合）与断言粒度：优先“稳定契约”而避免脆弱断言。
- 为提升可测性而做的最小范围重构（不改变外部行为），例如把纯逻辑提取为可直接单测的 helper，并尽量避免新增 dev-dependencies。

</decisions>

<specifics>
## Specific Ideas

无特定外部参考 — 以“行为契约可回归、失败可定位”为第一优先级。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src-tauri/src/terminal/tests_exec.rs`、`src-tauri/src/terminal/tests_discovery.rs`: 现有 Rust 单测风格样例（helper + `#[cfg(target_os)]` 分平台覆盖 + 最小稳定断言）。
- `src/services/tauriBridge.ts`: 前端对 `read_user_command_files` 的 payload 映射（`modified_ms` -> `modifiedMs`，非有限值回退为 0）。

### Established Patterns
- Rust 侧优先把“可断言的纯逻辑”抽出来单测；OS/环境依赖通过可注入函数（closure）降低测试对真实环境的依赖（见 terminal 模块）。

### Integration Points
- 后端：`src-tauri/src/lib.rs` 注册 Tauri commands：`get_user_commands_dir` / `read_user_command_files`，并在 `show_main_window` 触发 `reposition_to_cursor_monitor`。
- 前端：`src/composables/launcher/useCommandCatalog.ts` 负责“内置 + 用户命令合并/覆盖”规则（已有 Vitest 覆盖），Rust 侧主要负责稳定提供用户命令文件列表。

</code_context>

<deferred>
## Deferred Ideas

- “部分成功 + issues 汇报（跳过坏文件/坏目录继续加载）”属于鲁棒性增强，建议放到 Phase 7。
- 若未来要支持“仅一级扫描 / 可配置用户命令目录 / Rust 侧 JSON 校验”等行为变更，应另开 phase 并同步更新契约测试。

</deferred>

---

*Phase: 05-rust-catalog-bounds-tests*
*Context gathered: 2026-03-04*

