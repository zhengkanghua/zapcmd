# ZapCmd

## What This Is（这是什么）

ZapCmd 是一个跨平台桌面命令启动器（Tauri + Vue），服务于重度命令行 / 开发者工作流：搜索命令、填写参数、加入队列，并在系统终端中真实执行，而不是在应用内做“假执行”。

## Core Value（核心价值）

用最少的操作，**快速且安全**地找到并执行命令工作流，并且每次迭代都能通过自动化回归验证保持稳定。

## Current State（当前状态）

- 已 shipped：`v1.0`（2026-03-06）
- 已建立：pre-commit / CI / Release 质量门禁、90% 覆盖率基线、最小桌面端 E2E、Rust 高风险模块测试、安全回归、UI/UX 精修、planning / audit 闭环
- 当前现实：Windows desktop smoke 是唯一 blocking desktop gate；macOS desktop smoke 仅保留 experimental / non-blocking probe
- 当前审计：无 blocker，剩余为可接受的 `tech_debt`

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

### Next Milestone Goals（下一里程碑目标）

- [ ] `E2E-02`：Windows/macOS/Linux full-matrix desktop E2E 覆盖
- [ ] `SYNC-01`：命令与设置云同步（多设备一致）
- [ ] `SEC-02`：团队 / 组织级安全策略（白名单、策略下发、审计等）

### Out of Scope / Deferred（暂不做 / 延后）

- macOS desktop smoke 升级为稳定 blocking gate — 继续等待上游稳定性变化
- 大规模 UI 重做或重型组件库引入 — 继续保持“小幅精修”策略
- 团队级安全治理与云同步 — 保留到后续 milestone / v2 评估

## Context（上下文）

- 技术栈：Tauri 2（Rust）+ Vue 3（TypeScript）+ Pinia + Vitest
- v1.0 规模：12 phases / 35 plans / 44 tasks
- 当前质量基线：`npm run check:all` 全绿；coverage 门禁维持在 90%+
- 下一步：使用 `$gsd-new-milestone` 定义新一轮需求、范围与路线图

## Key Decisions（关键决策）

| 决策 | 理由 | 结果 |
|------|------|------|
| 以 `check:all` + coverage 90% 作为统一质量门禁 | 让“功能改动必回归”成为默认流程 | ✓ Good |
| 桌面端 E2E 先做最小稳定基线 | 控制成本并让阻断链路尽早落地 | ✓ Good |
| Windows 保持唯一 blocking desktop gate，macOS 仅保留 experimental probe | 尊重上游稳定性现状，避免假 blocker | ✓ Good |
| 历史 evidence 采用 correction note 更正 | 保留历史事实，同时收敛当前现实 | ✓ Good |

---
*Last updated: 2026-03-06 after v1.0 milestone*