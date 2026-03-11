# ZapCmd

## What This Is（这是什么）

ZapCmd 是一个跨平台桌面命令启动器（Tauri + Vue），服务于重度命令行 / 开发者工作流：搜索命令、填写参数、加入队列，并在系统终端中真实执行，而不是在应用内做“假执行”。

## Core Value（核心价值）

用最少的操作，**快速且安全**地找到并执行命令工作流，并且每次迭代都能通过自动化回归验证保持稳定。

## Current State（当前状态）

- 已 shipped：`v1.0`（2026-03-06）
- 已 shipped：`v2.0`（2026-03-11）
- 已建立：pre-commit / CI / Release 质量门禁、90% 覆盖率基线、最小桌面端 E2E、Rust 高风险模块测试、安全回归、UI/UX 精修、planning / audit 闭环
- 当前现实：Windows desktop smoke 是唯一 blocking desktop gate；macOS desktop smoke 仅保留 experimental / non-blocking probe
- 当前审计：无 blocker，剩余为可接受的 `tech_debt`
- 当前规划：准备启动 `v2.1`（待定义），v2.0 设计基线见 `docs/ui-redesign/`

## Requirements（需求）

### Validated（已验证）

- ✓ `REG-01` / `REG-02` — 本地 pre-commit 与 CI 统一回归门禁已落地
- ✓ `COV-01` / `COV-02` / `COV-03` — 覆盖率 90%+ 与关键路径回归已达成
- ✓ `RUST-01` / `RUST-02` / `RUST-03` — Rust 高风险模块单测已补齐
- ✓ `SEC-01` — 危险命令确认与参数注入拦截完成自动化回归
- ✓ `ROB-01` / `ROB-02` / `ROB-03` — 错误提示与失败分支可见、可定位、可回归
- ✓ `ARC-01` / `ARC-02` — 组合根与 `settingsStore` 的可测试性重构已完成
- ✓ `UX-01` / `UX-02` — 启动器 / 设置页可达性与信息层级已完成精修
- ✓ `E2E-01` — 最小桌面端 E2E 基线已建立

### Last Milestone: v2.0 主窗口 B4 UI 重构（已收口）

**Goal:** 将 launcher 主窗口从“左搜索 + 右侧常驻 staging 并列”升级为 **B4（Overlay Review Mode with Floor Height Protection）**，落地新的视觉系统与交互契约，并把回归补齐到可持续迭代的状态。

**Target features:**
- Search State 保持动态高度；队列非空时以 `queued` 摘要入口作为进入 Review 的主入口。
- Review State 采用右侧 overlay 面板：背景可见但不可交互；唯一可交互层为 Review。
- `drawerFloorHeight`：从矮窗口进入 Review 前补足左侧抽屉最小可视高度；高度由“4 条结果高度 + 搜索框高度”计算得出（其中搜索框高度以 `.search-form` 容器渲染高度为准，含 padding，非 input 高度）；仅允许 filler/spacer，禁止伪造假结果数据或 DOM。
- Window sizing：Review 打开时的高度/宽度计算不计入顶部拖拽区；必要时先稳定尺寸再做动画。
- Hotkeys & focus：`toggleQueue` / `switchFocus` 在搜索态进入 Review；Review 内 `Tab` 仅做内部焦点循环；`Esc` 以层级优先级稳定后退（Safety > Param > Review > Search/Hide）。
- Visual system：落地新配色令牌（品牌色与 success 色彻底分离）、降低透明度噪音、强化层级与可读性。
- Regression：更新相关单测与手动验收脚本，保持 `npm run check:all` 全绿。

### Out of Scope / Deferred（暂不做 / 延后）

- `settings` 并入 launcher — 明确不做（保持独立窗口）
- `settings` 视觉系统升级 / IA 重构 — 本里程碑不做（后续单独开专题）
- Windows/macOS/Linux full-matrix desktop E2E（`E2E-02`）— 保留到后续 milestone / v2.x
- 命令与设置云同步（`SYNC-01`）— 保留到后续 milestone / v2.x
- 团队 / 组织级安全策略（`SEC-02`）— 保留到后续 milestone / v2.x
- macOS desktop smoke 升级为稳定 blocking gate — 继续等待上游稳定性变化

## Context（上下文）

- 技术栈：Tauri 2（Rust）+ Vue 3（TypeScript）+ Pinia + Vitest
- v1.0 规模：12 phases / 35 plans / 44 tasks
- 当前质量基线：`npm run check:all` 全绿；coverage 门禁维持在 90%+
- 下一步：`$gsd-new-milestone`（建议 v2.1），进入“需求 → roadmap → phases”的下一轮循环

## Key Decisions（关键决策）

| 决策 | 理由 | 结果 |
|------|------|------|
| 以 `check:all` + coverage 90% 作为统一质量门禁 | 让“功能改动必回归”成为默认流程 | ✓ Good |
| 桌面端 E2E 先做最小稳定基线 | 控制成本并让阻断链路尽早落地 | ✓ Good |
| Windows 保持唯一 blocking desktop gate，macOS 仅保留 experimental probe | 尊重上游稳定性现状，避免假 blocker | ✓ Good |
| 历史 evidence 采用 correction note 更正 | 保留历史事实，同时收敛当前现实 | ✓ Good |
| B4 作为主窗口唯一结构方案（Overlay Review + Floor Height Protection） | 解决双焦点竞争、长命令窄栏可读性差与高度不稳定 | ✓ Good |
| `settings` 保持独立窗口，不并入 launcher | 避免范围膨胀；优先把主窗口壳层与交互契约做正确 | ✓ Good |
| `drawerFloorHeight` 仅通过 filler/spacer 实现（高度由“4 条结果高度 + 搜索框高度”计算；搜索框高度以 `.search-form` 容器渲染高度为准） | 不污染键盘导航、可达性与测试语义 | ✓ Good |
| Review 的 dim/遮罩只作用于内部圆角 shell | 避免整窗遮罩暴露原生窗口边界与破坏圆角/透明外观 | ✓ Good |
| 动画策略：先试动态 resize，不稳则退回一次性 resize + 内部动画 | 在体验与稳定性之间保留可控回退策略 | ✓ Good |

---
*Last updated: 2026-03-11 after completing v2.0 milestone*
