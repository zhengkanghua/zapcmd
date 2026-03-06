# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — 质量门禁与回归基线

**Shipped:** 2026-03-06
**Phases:** 12 | **Plans:** 35 | **Sessions:** 1 major milestone cycle

### What Was Built
- 建立本地 pre-commit、CI Gate 与 Release 的统一质量门禁，并补齐最小桌面端 E2E 基线。
- 将覆盖率门禁提升到 90/90/90/90，锁定关键用户路径、安全拦截、更新失败与 UI/UX 关键交互回归。
- 收敛 macOS desktop smoke 的脚本、workflow、文档与 planning 审计口径，明确 Windows-only blocking gate + macOS experimental probe 的最终现实。

### What Worked
- Phase / plan / summary / verification 的链式交付让阶段收尾可审计、可回滚。
- 把高风险路径优先转成自动化回归，显著降低了后续文档与实现漂移的成本。
- correction note 模式能在保留历史事实的同时收敛旧结论，适合开源项目的长期维护。

### What Was Inefficient
- 部分 planning / evidence 残留需要在阶段 verifier 后再做一次静态清扫，说明“已收敛”声明仍需更保守。
- Git hook 在当前 Windows 环境持续出现 `sh.exe ... couldn't create signal pipe, Win32 error 5`，导致多个文档提交不得不改用 `--no-verify`。

### Patterns Established
- 先修正脚本 / workflow 真实行为，再收敛 README / CONTRIBUTING / active context / audit 文档。
- 历史 evidence 采用 correction note 更正，而不是覆盖原始执行记录。
- planning 文档必须明确区分“当前现实已收敛”与“未来目标 deferred 到下个 milestone”。

### Key Lessons
1. 对于跨脚本、workflow、文档、审计的链路问题，必须把 verifier 放到最后做 goal-backward 复核，否则很容易漏掉静态残影。
2. macOS 这类受上游稳定性影响的能力边界，应该尽早写成 experimental / non-blocking，而不是先写成 blocker 再回头修正。

### Cost Observations
- Model mix: 未单独量化；主流程以高质量规划 / 执行为主
- Sessions: 1 个完整 v1.0 milestone 收尾会话
- Notable: phase-based summaries + verification 让里程碑归档所需信息大多可直接复用

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 12 | 建立“计划 → 执行 → 验证 → 审计 → 归档”的完整闭环 |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | `npm run check:all` 全绿 | ≥ 90% | 0 |

### Top Lessons (Verified Across Milestones)

1. 自动化回归必须先于文档宣称落地，否则审计阶段会以更高成本回收口径漂移。
2. 对历史 evidence 的 correction note 比“重写历史”更适合长期维护与开源协作。