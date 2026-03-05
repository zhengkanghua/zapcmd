# Phase 1: 回归链路与最小桌面 E2E 基线 - Research

**日期:** 2026-03-03  
**用途:** 为 Phase 1 的计划拆解提供“可落地的实现信息、落点建议与常见坑”，供后续 PLAN.md 直接引用与执行。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

（以下内容从 `.planning/phases/01-desktop-shell-e2e-baseline/01-CONTEXT.md` 的 `## Implementation Decisions` 原样复制）

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

### Deferred Ideas (OUT OF SCOPE)

（以下内容从 `.planning/phases/01-desktop-shell-e2e-baseline/01-CONTEXT.md` 的 `## Deferred Ideas` 原样复制）

- 更完整的桌面端 E2E 体系（跨平台矩阵、更多核心流程覆盖）——后续 phase 再扩展
- 覆盖率阈值提升到 90%+ 与更全面回归补齐——在后续 phases 完成
</user_constraints>

## 仓库现状与可复用入口（已确认）

- 本地 hook 入口：`.githooks/pre-commit` → `npm run precommit:guard`
- 本地门禁实现：`scripts/precommit-guard.mjs`（当前：lint/typecheck + related tests + typecheck:test + cargo check）
- CI Gate：`.github/workflows/ci-gate.yml`
  - Windows：`npm run check:all`
  - macOS/Ubuntu：`npm run typecheck && npm run typecheck:test && npm run test:run && npm run build`
- Release：`.github/workflows/release-build.yml`
  - Windows `quality-gate`：`npm run check:all`（当前尚未追加 E2E）
- 内置命令生成脚本：`scripts/generate_builtin_commands.ps1`
  - 源：`docs/command_sources/_*.md`
  - 产物：`assets/runtime_templates/commands/builtin/*.json`、`index.json`、`docs/builtin_commands.generated.md`
- UI 侧可用于 E2E 的稳定选择器：
  - 搜索框：`#zapcmd-search-input`（已在单测中使用）
  - 结果抽屉：`[aria-label=\"result-drawer\"]`（组件里明确写死）
  - 结果按钮：`.result-item`

## pre-commit 双通道（脚本实现建议）

### 推荐算法（保持“快路径”不变，仅在命中触发时追加 coverage）

1. 获取 staged 文件清单：`git diff --cached --name-only --diff-filter=ACMR`
2. 若“仅文档/说明类改动”：
   - 满足：`docs/**`（排除 `docs/command_sources/_*.md`）、`README*`、`CHANGELOG.md`、仅 `.github/workflows/**`
   - 则 **直接退出 0**（不跑 lint/typecheck）
3. 执行快路径（与现状一致）：
   - `npm run lint`
   - `npm run typecheck`
   - 若存在 `src/**/*.ts|.vue`（排除 tests）→ `npm run test:related -- <targets>`
   - 若命中测试类型变更 → `npm run typecheck:test`
   - 若命中 Rust 变更 → `cargo check --manifest-path src-tauri/Cargo.toml`
4. 计算是否触发 `test:coverage`：
   - 命中“关键配置”/“高风险 src 子集”/“高风险 Rust 文件”/“运行时资产”/“大改动阈值（>20）”
   - 排除：仅测试文件改动、仅样式改动（但仍执行快路径）
5. 若触发：
   - 打印可解释信息：触发原因、命中文件、将运行的命令列表（至少包含 `npm run test:coverage`）
   - 运行 `npm run test:coverage`，失败则阻止提交
6. 若命中“内置命令源变更”（`docs/command_sources/_*.md` / `scripts/generate_builtin_commands.ps1`）：
   - 本地只提示：需要运行生成脚本并提交产物（不在 pre-commit 阻断）

### 常见坑（实现时需规避）

- **路径匹配**：Windows 路径分隔符差异 → 建议统一使用 `/`（git 输出本身是 `/`）。
- **误判“仅文档”**：`docs/command_sources/_*.md` 必须被视为“行为改动”（不能归入 doc-only skip）。
- **相关测试 targets 过多**：当 staged `src/` 文件数量巨大时，`vitest related` 可能不如直接全量更稳 → 这正是 “>20 文件触发 coverage” 的意义。

## CI Gate：内置命令生成一致性门禁（实现建议）

- 在 Windows `quality-gate` job 中，在 `npm run check:all` 之前新增 step：
  1. `pwsh -File scripts/generate_builtin_commands.ps1`
  2. `git diff --exit-code -- assets/runtime_templates/commands/builtin docs/builtin_commands.generated.md`
- 若 diff 非空：
  - 直接失败，并打印修复指令（例如“请在本地运行脚本并提交产物”）

## 最小桌面端 E2E：推荐技术路径（Windows）

### 选型结论（建议）

- 使用 **Tauri v2 WebDriver** 路径：`tauri-driver`（WebDriver server wrapper） + `msedgedriver`（Windows native driver） + Node 侧 WebDriver client（建议 `selenium-webdriver`）。
- 理由：
  - 不需要改动 Tauri/Rust 业务代码即可进行 UI 级冒烟
  - 选择器已有稳定锚点（`#zapcmd-search-input` / `aria-label`）
  - CI 侧可明确产出截图与日志

### 关键依赖（Windows CI / Windows 本地）

- `tauri-driver`（Rust 安装）：`cargo install tauri-driver --locked`
- `msedgedriver`（版本需匹配 Edge）：
  - 推荐：运行 `pwsh -File scripts/e2e/install-msedgedriver.ps1`（下载并把 `msedgedriver.exe` 加入 PATH）
- Node 侧：`selenium-webdriver`（作为 devDependency）

### 用例设计（只做 1 条冒烟）

1. 启动桌面应用
2. 等待 `#zapcmd-search-input` 可见
3. 输入一个确定会有结果的关键词（如 `git`）
4. 断言 `[aria-label=\"result-drawer\"]` 出现且包含至少一个 `.result-item`
5. 按 `Escape`，断言抽屉关闭（元素消失）且搜索框清空
6. 失败时：保存截图与日志到 `.tmp/e2e/`，CI 上传为 artifact

## Phase Requirements 覆盖建议

| ID | 要求 | 建议覆盖计划 |
|---|---|---|
| REG-01 | 本地 pre-commit 对功能/行为改动强制全量回归（至少 `test:coverage`），并避免对纯文档阻塞 | `01-01-PLAN.md` |
| REG-02 | CI 以 `npm run check:all` 作为合并门禁，失败日志可定位 | `01-02-PLAN.md` |
| E2E-01 | 最小桌面端 E2E 基线落地或明确替代结论，并接入 CI/Release 阻断 | `01-03-PLAN.md` + `01-02-PLAN.md` |
