<user_constraints>
## User Constraints (from 05-CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- “部分成功 + issues 汇报（跳过坏文件/坏目录继续加载）”属于鲁棒性增强，建议放到 Phase 7。
- 若未来要支持“仅一级扫描 / 可配置用户命令目录 / Rust 侧 JSON 校验”等行为变更，应另开 phase 并同步更新契约测试。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support（如何支持落地） |
|----|------------------------------------|----------------------------------|
| RUST-02 | `src-tauri/src/command_catalog.rs` 命令加载与覆盖规则具备单元测试覆盖（内置命令与用户命令冲突时行为明确） | 现状 Rust 侧不做“内置+用户合并/覆盖”，仅提供“用户命令文件列表”的稳定 IO 契约。本 phase 以“锁定用户命令目录加载/扫描/排序/fail-fast/modifiedMs 回退”为 RUST-02 的 Rust 侧回归保障；内置+用户覆盖规则由前端（已测）承担。 |
| RUST-03 | `src-tauri/src/bounds.rs` 边界检查/限制逻辑具备单元测试覆盖（至少覆盖 1 个拒绝路径） | 通过“提取纯逻辑函数（monitor 选择/回退/clamp/重定位决策）+ 自定义 MonitorInfo fixture”，在不依赖真实 Tauri Window/Monitor 的情况下补齐单测；拒绝路径可用“返回 None（不重定位）”覆盖。 |
</phase_requirements>

## 现状盘点（基于仓库真实代码）

### `src-tauri/src/command_catalog.rs`
- 解析/创建用户命令目录：`<home>/.zapcmd/commands`（Windows 优先 `USERPROFILE`，回退 `HOMEDRIVE+HOMEPATH`；非 Windows 用 `HOME`）。
- 递归扫描：仅收集 `.json`（大小写不敏感），最后按路径字符串排序。
- 读取每个文件：返回 `{path, content, modified_ms}`；`modified_ms` 获取失败时回退 0。
- 任意读目录/读文件失败：fail-fast，直接返回 Err。
- 不解析 JSON、不做 schema 校验；前端 `runtimeLoader` 负责解析与 issues。

### `src-tauri/src/bounds.rs`
- 已有纯几何函数：`point_in_monitor` / `clamp_to_monitor` / `center_in_monitor`。
- 关键行为（难测点）仍绑定 Tauri API：\n  `resolve_restored_window_position(WebviewWindow, saved)`、`reposition_to_cursor_monitor(WebviewWindow)` 依赖 `available_monitors/primary_monitor/outer_size/outer_position/cursor_position` 等运行时信息。

## 可测试性阻碍点

### command_catalog：全局 env + 真实文件系统
- `resolve_home_dir()` 直接读 `std::env::var_os`，如果测试用 `set_var` 会引入并行竞态/flake。
- `modified_ms` 回退分支在真实文件上很难稳定触发（通常 metadata 可用）。

### bounds：Tauri Window/Monitor 不易构造
- `WebviewWindow` / `Monitor` 在纯单测中难以 mock/构造，导致只能测几何函数，无法覆盖“display_name 优先/越界回退/随鼠标屏居中”等契约。

## 最小重构建议（不改变外部行为，只为单测提取纯逻辑）

### A) `command_catalog.rs`：注入 env/metadata，避免全局依赖
1) 提取 env provider：`resolve_home_dir_with(get_env: impl Fn(&str)->Option<OsString>)`，生产仍用 `env::var_os`。\n
2) 将目录拼接/创建拆为可测试入口：`ensure_user_commands_dir_in(home: &Path)`。\n
3) 为 `modified_ms` 提供最小注入点（metadata provider），便于稳定覆盖“回退 0”。\n
4) 单测中使用临时目录（自建 helper，避免新增 `tempfile` 依赖）构造递归树与文件后缀矩阵。

### B) `bounds.rs`：用纯数据结构替代 Tauri Monitor 类型参与决策
1) 定义 `MonitorInfo { name: Option<String>, pos, size }`（仅用于内部纯逻辑与单测）。\n
2) 提取 restore 位置选择为纯函数：输入 `saved + window_size + monitors + primary(optional)`，输出 `Option<PhysicalPosition<i32>>`。\n
3) 提取 cursor-monitor 重定位决策为纯函数：输入 `cursor_pos + window_pos + window_size_opt + monitors`，输出 `Option<PhysicalPosition<i32>>`。\n
4) 现有 `resolve_restored_window_position` / `reposition_to_cursor_monitor` 仅负责把 Tauri 数据映射成 `MonitorInfo` 并执行 `set_position`。

## 关键测试矩阵（最小覆盖集合）与断言口径

### RUST-02：command_catalog（用户命令目录 IO 契约）
- Windows：`USERPROFILE` 优先、`HOMEDRIVE+HOMEPATH` 回退顺序（通过注入 env provider，不改全局 env）。
- 目录创建：不存在时 `create_dir_all` 成功创建。
- 递归扫描：子目录可用；仅 `.json`/`.JSON`；忽略非 json。
- 返回顺序：按实现使用的 `to_string_lossy()` 规则排序对齐（测试中用同规则生成 expected，避免写死盘符/分隔符）。
- 空目录：返回空数组。
- fail-fast：根目录不存在或读目录失败时返回 Err（仅断言包含目标路径/关键片段）。
- `modified_ms` 回退：注入 metadata provider 失败 → `modified_ms == 0`。

### RUST-03：bounds（回退/夹取/拒绝路径）
- `point_in_monitor` 边界：left/top inclusive，right/bottom exclusive。
- `clamp_to_monitor`：保证完全可见；窗口大于屏幕时退化位置（与现实现一致）。
- restore：display_name 优先匹配；不匹配则按坐标落点；越界走 primary/first 居中回退。
- reposition：拒绝路径（cursor 不在任何 monitor 或 monitors 为空）→ 返回 None；同屏不动 → None；跨屏 → 返回 cursor monitor 的 center。

## 常见坑（计划里需要显式规避）
- 禁止在测试里 `std::env::set_var` 改 HOME/USERPROFILE（并行 flake）；用注入 closure 替代。
- 不依赖 chmod/ACL 做权限失败（跨平台不稳定）；用“不存在路径”制造稳定 Err。
- 避免断言完整错误字符串；只断言关键片段（路径/前缀）。
- 监视器 `name` 可能为 `None`：测试要覆盖该情况，避免未来 unwrap 误改引入 panic。

## RESEARCH COMPLETE

