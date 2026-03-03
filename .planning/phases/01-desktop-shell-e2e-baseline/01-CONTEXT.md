# Phase 1: 回归链路与最小桌面 E2E 基线 - Context

**Gathered:** 2026-03-03  
**Status:** Ready for planning

<domain>
## Phase Boundary

本 Phase 只做两件事：

1) 固化 **本地 pre-commit + CI Gate** 的回归门禁基线（让功能/行为改动默认可回归）  
2) 落地 **最小桌面端 E2E 冒烟基线**（启动+搜索），并接入 CI Gate（Windows），同时对 tag/release 流程做一致性对齐

不在本 Phase 扩展新产品能力；更深的覆盖率提升、更多 E2E、架构重构、UI/UX 精修在后续 phases 进行。

</domain>

<decisions>
## Implementation Decisions

### 本地 pre-commit 门禁（双通道）

- **默认快速通道**继续保留现有链路：`lint` → `typecheck` →（按需）`test:related` / `typecheck:test` / `cargo check`。
- **全量回归通道**：在触发条件命中时，**追加**运行 `npm run test:coverage`（其余快速通道步骤仍保留）。
- **失败不允许绕过**：不提供 env/commit 标记绕过（质量优先）。
- **耗时目标**：触发全量回归时，**≤1 分钟为软目标**（偶尔 2–3 分钟可接受，但不能常态化）。
- **触发解释与提示**：当触发 `test:coverage` 时，控制台必须明确打印：
  - “为什么触发/哪些文件触发/将要运行哪些命令”
  - 覆盖率失败时优先展示“阈值差距 + 关键缺口文件/模块”的定位信息
  - 我们自定义提示允许“中英混用”（工具原始输出保持即可）

### pre-commit 触发规则（分类/阈值/例外）

- **纯文档/说明类改动直接跳过**（不跑任何门禁）：
  - `docs/**`（**但不包含** `docs/command_sources/_*.md`）
  - `README*`、`CHANGELOG.md`
  - 仅 `.github/workflows/**` 改动
- **关键配置一律触发全量回归**（追加 `test:coverage`）：
  - `package.json`、`package-lock.json`
  - `vitest.config.ts`、`tsconfig*.json`
  - `scripts/**`、`.githooks/**`
  - `src-tauri/tauri.conf.json`、`src-tauri/capabilities/**`、`.env.keys`
  - `Cargo.lock`
- **`src/` 改动仅高风险子集触发全量回归**（其余仍走快速通道 + `test:related`）：
  - `src/features/security/**`
  - `src/services/commandExecutor.ts`
  - `src/services/updateService.ts`
  - `src/services/tauriBridge.ts`
- **Rust 改动的 coverage 策略**：
  - 默认：`src-tauri/**`/`.rs` 改动仍按既有规则跑 `cargo check`
  - 仅当改动命中高风险 Rust 文件时，**追加** `test:coverage`：
    - `src-tauri/src/terminal.rs`
    - `src-tauri/src/command_catalog.rs`
    - `src-tauri/src/bounds.rs`
- **仅测试文件改动不触发** `test:coverage`（仍保留快速通道：lint/typecheck/typecheck:test/related）。
- **样式改动不触发** `test:coverage`（仍走快速通道）。
- **运行时资产改动触发全量回归**：
  - `assets/runtime_templates/commands/**`（注意：目录下 README 等说明文档不触发）
- **大改动阈值触发**：
  - 统计“staged 的 `src/` 业务代码文件数”（`.ts/.vue`，排除 `__tests__` 与 `*.test|*.spec`）
  - **> 20** 文件则触发 `test:coverage`

### 最小桌面端 E2E 冒烟基线

- **形态**：最小自动化（只做 1 条桌面端 E2E 冒烟用例）。
- **覆盖路径**：启动桌面应用 → 主窗口可见 → 搜索框输入 → 结果抽屉出现/关闭。
- **不覆盖**：真实系统终端执行（保留给人工回归清单/后续更完整 E2E）。
- **CI 接入（CI Gate）**：
  - 运行在 **CI Gate Windows**，并且 **必须阻断**（fail 即不可合并）
  - 以 **独立 job** 形式接入（更清晰、失败更好定位）
  - **不重试**（优先暴露不稳定/问题）
  - 失败诊断产物：**截图 + 日志**
  - 额外耗时目标：**≤2 分钟**

### CI 门禁矩阵（PR/Push）

- **Windows quality-gate**：保持 `npm run check:all` 为主门禁。
- **macOS/Ubuntu cross-platform-smoke**：保持现状（typecheck + typecheck:test + test:run + build），并且 **必须阻断**。
- **总耗时目标**：CI Gate（Windows `check:all` + E2E job）合计 **≤15 分钟**。

### Tag/Release 门禁对齐

- `release-build.yml`（打 tag 构建/发布）**也必须跑最小 E2E**，防止绕过 PR gate。
- 放置位置：复用 release-build 的 Windows `quality-gate` job，在 `check:all` 之后追加执行。
- 失败必须阻断后续打包/发布。
- 额外耗时目标：**≤2 分钟**。

### 内置命令生成一致性门禁

- **源变更范围**：
  - `docs/command_sources/_*.md`
  - `scripts/generate_builtin_commands.ps1`
- **产物范围（必须同步提交）**：
  - `assets/runtime_templates/commands/builtin/*.json`
  - `assets/runtime_templates/commands/builtin/index.json`
  - `docs/builtin_commands.generated.md`（生成快照，禁止单独修改）
- **门禁策略**：
  - 以 **CI 阻断**为主，本地 pre-commit **只提示**（避免环境差异阻塞提交）
  - CI 检测方法：Windows CI **运行生成脚本后**执行 `git diff --exit-code`，发现未提交产物变化则失败并给出明确修复指令
  - 落点：CI Gate 的 Windows `quality-gate` job 里作为 step（先做生成一致性检查，再跑 `check:all`）

### Claude's Discretion

- 允许在不违背上述决策的前提下，微调“高风险子集/关键配置”的具体文件列表（以代码侦察结果为准），但任何扩大触发范围的调整必须确保不会让 pre-commit 长期变慢。
- 允许对失败提示的格式/文案做可读性优化（保持中英混用原则）。

</decisions>

<specifics>
## Specific Ideas

- pre-commit 需要“可解释性”：明确打印触发原因、命令清单与下一步修复路径。
- 最小 E2E 只做“冒烟”，优先稳定与可定位（截图+日志、不重试、≤2 分钟）。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `.githooks/pre-commit`：当前 hook 入口（运行 `npm run precommit:guard`）
- `scripts/precommit-guard.mjs`：现有本地门禁实现（lint/typecheck/test:related/typecheck:test/cargo check）
- `package.json` scripts：`check:all`、`test:coverage`、`test:related`、`typecheck*` 等现成入口
- `vitest.config.ts`：覆盖率阈值与 include/exclude 当前配置
- `.github/workflows/ci-gate.yml`：PR/Push 门禁（Windows 全量 + mac/linux smoke）
- `.github/workflows/release-build.yml`：tag 发布构建矩阵（发布前全量门禁）
- `scripts/generate_builtin_commands.ps1`：内置命令源→产物的生成脚本

### Established Patterns

- “质量门禁”以 `npm run check:all` 作为统一入口（包含 lint/typecheck/test:coverage/build/rust）
- 本地 pre-commit 目前走“快路径”（related tests），适合在此基础上扩展双通道策略
- CI 使用 `npm ci` + Node 20，并在 Windows job 安装 Rust toolchain

### Integration Points

- Git hooks 安装：`scripts/setup-githooks.mjs` 会设置 `git config core.hooksPath .githooks`
- 内置命令资产入口：`assets/runtime_templates/commands/builtin/*.json` 与 `index.json`
- 现有人工回归清单可作为 E2E 范围参考：`docs/.maintainer/work/manual_regression_m0_m0a.md`

</code_context>

<deferred>
## Deferred Ideas

- 更完整的桌面端 E2E 体系（跨平台矩阵、更多核心流程覆盖）——后续 phase 再扩展
- 覆盖率阈值提升到 90%+ 与更全面回归补齐——在后续 phases 完成

</deferred>

---

*Phase: 01-desktop-shell-e2e-baseline*  
*Context gathered: 2026-03-03*

